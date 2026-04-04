import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateFoodOrderFinancials,
  FOOD_PENDING_PAYMENT_METHOD,
  isFoodOrderItemResolved,
  isFoodPaymentMethod,
  normalizeOptionalDate,
  normalizeOptionalText,
  roundCurrency,
  resolvePendingStatus,
  type PendingItemsSnapshot,
} from "@/lib/food";
import {
  buildPendingItemsSnapshot,
  calculateSelectedItemsAmount,
  normalizeCheckoutSelections,
  resolveSalePaymentData,
} from "@/lib/food-server";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const paymentMethod = String(body.paymentMethod || "").toUpperCase();
    const settleAllOpenItems =
      Boolean(body.settleAllOpenItems) ||
      String(body.checkoutMode || "").toUpperCase() === "TOTAL";
    const selections = normalizeCheckoutSelections(
      Array.isArray(body.selections)
        ? body.selections
        : Array.isArray(body.selectedItemIds)
          ? body.selectedItemIds.map((itemId) => ({ itemId }))
          : [],
    );
    const providedCustomerId = normalizeOptionalText(body.customerId);
    const receiptDocument = normalizeOptionalText(body.receiptDocument);
    const dueDate = normalizeOptionalDate(body.dueDate);
    const notes = normalizeOptionalText(body.notes);

    if (!isFoodPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Forma de pagamento inválida para fechamento da mesa." },
        { status: 400 },
      );
    }

    if (!settleAllOpenItems && selections.length === 0) {
      return NextResponse.json(
        {
          error: "Selecione ao menos um item da mesa para fechar.",
        },
        { status: 400 },
      );
    }

    const companyId = currentUser.companyId;

    const payload = await prisma.$transaction(async (tx) => {
      const order = await tx.foodOrder.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          customer: true,
          table: true,
          items: true,
        },
      });

      if (!order) {
        throw new Error("Comanda não encontrada.");
      }

      const resolvedCustomerId = providedCustomerId || order.customerId || null;
      const customer =
        resolvedCustomerId &&
        (await tx.customer.findFirst({
          where: {
            id: resolvedCustomerId,
            companyId,
          },
        }));

      if (resolvedCustomerId && !customer) {
        throw new Error("Cliente não encontrado para vincular o fechamento.");
      }

      if (paymentMethod === FOOD_PENDING_PAYMENT_METHOD && !resolvedCustomerId) {
        throw new Error("Selecione um cliente para deixar esta parte pendente.");
      }

      const itemsMap = new Map(order.items.map((item) => [item.id, item]));
      const openItems = order.items.filter((item) => !isFoodOrderItemResolved(item));

      if (openItems.length === 0) {
        throw new Error("Esta mesa ja esta totalmente quitada.");
      }

      const resolvedSelections =
        settleAllOpenItems && selections.length === 0
          ? openItems.map((item) => ({
              itemId: item.id,
            }))
          : selections;

      const openItemsMap = new Map(openItems.map((item) => [item.id, item]));

      for (const selection of resolvedSelections) {
        const item = openItemsMap.get(selection.itemId);

        if (!item) {
          throw new Error(
            "Ha itens selecionados que nao pertencem a esta mesa ou ja foram pagos.",
          );
        }
      }

      let itemsSnapshot: PendingItemsSnapshot = buildPendingItemsSnapshot({
        orderItems: order.items,
        selections: resolvedSelections,
      });
      const paymentAmount = calculateSelectedItemsAmount({
        orderItems: order.items,
        selections: resolvedSelections,
      });

      if (paymentAmount <= 0) {
        throw new Error("Nao foi possivel calcular o valor dos itens selecionados.");
      }

      const payment = await tx.foodOrderPayment.create({
        data: {
          orderId: order.id,
          customerId: resolvedCustomerId,
          amount: paymentAmount,
          paymentMethod,
          notes,
          dueDate: paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? dueDate : null,
          receiptDocument,
        },
      });

      let sale = null;
      let pendingEntry = null;

      if (paymentMethod === FOOD_PENDING_PAYMENT_METHOD) {
        const pendingStatus = resolvePendingStatus("ABERTO", dueDate);

        pendingEntry = await tx.customerPendingEntry.create({
          data: {
            companyId,
            customerId: resolvedCustomerId!,
            orderId: order.id,
            paymentId: payment.id,
            amount: paymentAmount,
            dueDate,
            status: pendingStatus,
            description:
              notes ||
              `Mesa ${order.table?.number || "Balcao"} - itens transferidos para pendente`,
            itemsSnapshot,
          },
          include: {
            customer: true,
            order: {
              include: {
                table: true,
              },
            },
          },
        });

        await tx.customer.update({
          where: {
            id: resolvedCustomerId!,
          },
          data: {
            pendingBalance: {
              increment: paymentAmount,
            },
          },
        });
      } else {
        const config = await tx.companyConfig.findFirst({
          where: {
            companyId,
          },
          select: {
            debitRate: true,
            creditRate: true,
          },
        });
        const paymentData = resolveSalePaymentData({
          paymentMethod,
          total: paymentAmount,
          config,
        });

        sale = await tx.sale.create({
          data: {
            companyId,
            foodOrderId: order.id,
            total: paymentAmount,
            paymentMethod: paymentData.paymentMethod,
            cardType: paymentData.cardType,
            feeAmount: paymentData.feeAmount,
            netAmount: paymentData.netAmount,
            customerId: resolvedCustomerId,
            customerDocument: receiptDocument || customer?.document || null,
            tableNumber: order.table?.number || null,
            sellerId: currentUser.id,
            items: {
              create: itemsSnapshot.map((item) => ({
                productId: item.productId || null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: true,
            seller: {
              select: {
                id: true,
                fullName: true,
                name: true,
                commissionRate: true,
              },
            },
          },
        });
      }

      for (const selection of resolvedSelections) {
        const item = itemsMap.get(selection.itemId)!;

        await tx.foodOrderItem.update({
          where: {
            id: item.id,
          },
          data: {
            status: "PAGO",
            settledQuantity: Number(item.quantity || 0),
          },
        });
      }

      const refreshedItems = await tx.foodOrderItem.findMany({
        where: {
          orderId: order.id,
        },
      });
      const paidAmount = roundCurrency(
        Number(order.paidAmount || 0) +
          (paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? 0 : paymentAmount),
      );
      const pendingTransferredAmount = roundCurrency(
        Number(order.pendingTransferredAmount || 0) +
          (paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? paymentAmount : 0),
      );
      const financials = calculateFoodOrderFinancials({
        items: refreshedItems,
      });

      const updatedOrder = await tx.foodOrder.update({
        where: {
          id: order.id,
        },
        data: {
          customerId: resolvedCustomerId,
          paidAmount,
          pendingTransferredAmount,
          total: financials.total,
          balanceDue: financials.balanceDue,
          status: financials.status,
          closedAt: financials.status === "FECHADA" ? new Date() : null,
        },
        include: orderInclude,
      });

      if (order.tableId) {
        await tx.table.update({
          where: {
            id: order.tableId,
          },
          data: {
            status: financials.status === "FECHADA" ? "DISPONIVEL" : "OCUPADO",
            currentOrderId: financials.status === "FECHADA" ? null : order.id,
          },
        });
      }

      return {
        order: updatedOrder,
        sale,
        pendingEntry,
        payment: {
          id: payment.id,
          amount: paymentAmount,
          paymentMethod,
          dueDate: payment.dueDate?.toISOString() ?? null,
          receiptDocument: payment.receiptDocument,
          createdAt: payment.createdAt.toISOString(),
        },
        selectedItemIds: resolvedSelections.map((selection) => selection.itemId),
        itemsSnapshot,
      };
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("[api/food/orders/:id/checkout][POST] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao fechar parcialmente a mesa.",
      },
      { status: 500 },
    );
  }
}
