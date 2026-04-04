import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateFoodOrderFinancials,
  normalizeOptionalText,
  normalizeTableNumber,
} from "@/lib/food";

type IncomingOrderItem = {
  productId: string;
  quantity: number;
};

const orderInclude = {
  customer: true,
  table: true,
  items: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
  payments: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
};

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tableNumber = normalizeTableNumber(body.tableNumber);
    const customerId = normalizeOptionalText(body.customerId);
    const notes = normalizeOptionalText(body.notes);
    const requestedOrderId = normalizeOptionalText(body.orderId);
    const items: IncomingOrderItem[] = Array.isArray(body.items)
      ? body.items
          .map((item) => ({
            productId: String(item?.productId || "").trim(),
            quantity: Number(item?.quantity || 0),
          }))
          .filter(
            (item): item is IncomingOrderItem =>
              Boolean(item.productId) && Number.isFinite(item.quantity) && item.quantity > 0,
          )
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Adicione ao menos um item para abrir a comanda." },
        { status: 400 },
      );
    }

    const companyId = currentUser.companyId;
    const uniqueProductIds = Array.from(
      new Set<string>(items.map((item) => item.productId)),
    );

    const [products, customer] = await Promise.all([
      prisma.product.findMany({
        where: {
          companyId,
          id: {
            in: uniqueProductIds,
          },
        },
        select: {
          id: true,
          name: true,
          salePrice: true,
          stock: true,
        },
      }),
      customerId
        ? prisma.customer.findFirst({
            where: {
              id: customerId,
              companyId,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (customerId && !customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado para esta empresa." },
        { status: 404 },
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    if (productMap.size !== uniqueProductIds.length) {
      return NextResponse.json(
        { error: "Há itens indisponíveis ou não encontrados no cardápio." },
        { status: 404 },
      );
    }

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: "Produto não encontrado." },
          { status: 404 },
        );
      }

      if (Number(product.stock || 0) < item.quantity) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}.`,
          },
          { status: 409 },
        );
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      let table =
        tableNumber.length > 0
          ? await tx.table.findFirst({
              where: {
                companyId,
                number: tableNumber,
              },
            })
          : null;

      if (tableNumber && !table) {
        table = await tx.table.create({
          data: {
            companyId,
            number: tableNumber,
          },
        });
      }

      let orderId = requestedOrderId;

      if (!orderId && table?.currentOrderId) {
        orderId = table.currentOrderId;
      }

      let foodOrder =
        orderId &&
        (await tx.foodOrder.findFirst({
          where: {
            id: orderId,
            companyId,
            status: {
              not: "FECHADA",
            },
          },
          include: {
            items: true,
          },
        }));

      if (!foodOrder) {
        foodOrder = await tx.foodOrder.create({
          data: {
            companyId,
            customerId,
            tableId: table?.id || null,
            notes,
          },
          include: {
            items: true,
          },
        });
      } else {
        foodOrder = await tx.foodOrder.update({
          where: {
            id: foodOrder.id,
          },
          data: {
            customerId: customerId || foodOrder.customerId,
            tableId: table?.id || foodOrder.tableId,
            notes: notes || foodOrder.notes,
          },
          include: {
            items: true,
          },
        });
      }

      await tx.foodOrderItem.createMany({
        data: items.map((item) => {
          const product = productMap.get(item.productId)!;

          return {
            orderId: foodOrder.id,
            productId: product.id,
            description: product.name,
            quantity: item.quantity,
            unitPrice: Number(product.salePrice || 0),
          };
        }),
      });

      for (const item of items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      const refreshedItems = await tx.foodOrderItem.findMany({
        where: {
          orderId: foodOrder.id,
        },
      });
      const financials = calculateFoodOrderFinancials(refreshedItems);

      const updatedOrder = await tx.foodOrder.update({
        where: {
          id: foodOrder.id,
        },
        data: {
          customerId: customerId || foodOrder.customerId,
          tableId: table?.id || foodOrder.tableId,
          notes: notes || foodOrder.notes,
          total: financials.total,
          balanceDue: financials.balanceDue,
          status: financials.status,
          closedAt: financials.status === "FECHADA" ? new Date() : null,
        },
        include: orderInclude,
      });

      if (table) {
        await tx.table.update({
          where: {
            id: table.id,
          },
          data: {
            status: "OCUPADO",
            currentOrderId: updatedOrder.id,
          },
        });
      }

      return tx.foodOrder.findUnique({
        where: {
          id: updatedOrder.id,
        },
        include: orderInclude,
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[api/food/orders][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar consumo da mesa." },
      { status: 500 },
    );
  }
}
