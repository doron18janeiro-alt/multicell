import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  getAuditActorName,
} from "@/lib/audit";

const parseOrderId = (value: string) => Number.parseInt(value, 10);

async function findScopedOrder(id: number, companyId: string) {
  return prisma.serviceOrder.findFirst({
    where: {
      id,
      companyId,
    },
    include: { customer: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseOrderId(id);

    const order = await findScopedOrder(orderId, currentUser.companyId);

    if (!order) {
      return NextResponse.json(
        { error: "O.S. não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[api/os/[id]][GET] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar O.S." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseOrderId(id);
    const body = await request.json();
    const { status, technicalReport, totalPrice, costPrice, paymentMethod } =
      body;

    const existingOrder = await prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "O.S. não encontrada" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (technicalReport) data.observations = technicalReport;
    if (totalPrice !== undefined) data.totalPrice = Number.parseFloat(totalPrice);
    if (costPrice !== undefined) data.costPrice = Number.parseFloat(costPrice);
    if (paymentMethod) data.paymentMethod = paymentMethod;

    if (data.totalPrice !== undefined && data.costPrice !== undefined) {
      data.servicePrice =
        Number(data.totalPrice) - Number(data.costPrice);
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: existingOrder.id },
      data,
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("[api/os/[id]][PUT] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar O.S." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const osId = parseOrderId(id);
    const actorName = getAuditActorName(currentUser);

    await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.serviceOrder.findFirst({
        where: {
          id: osId,
          companyId: currentUser.companyId,
        },
        select: { id: true },
      });

      if (!existingOrder) {
        throw new Error("Ordem de Serviço não encontrada");
      }

      const linkedSales = await tx.sale.findMany({
        where: {
          serviceOrderId: osId,
          companyId: currentUser.companyId,
        },
        include: { items: true },
      });

      for (const sale of linkedSales) {
        for (const item of sale.items) {
          if (!item.productId) {
            continue;
          }

          try {
            const product = await tx.product.findFirst({
              where: {
                id: item.productId,
                companyId: currentUser.companyId,
              },
              select: { id: true },
            });

            if (product) {
              await tx.product.update({
                where: { id: product.id },
                data: {
                  stock: {
                    increment: item.quantity,
                  },
                },
              });
            }
          } catch (stockError) {
            console.error(
              `[Delete OS] Erro ao estornar item ${item.id}:`,
              stockError,
            );
          }
        }

        await tx.saleItem.deleteMany({
          where: { saleId: sale.id },
        });

        await tx.sale.delete({
          where: { id: sale.id },
        });

        await createAuditLog(tx, {
          companyId: currentUser.companyId,
          userName: actorName,
          action: "DELETE",
          tableName: "sales",
          description: `${actorName} excluiu a venda #${sale.id} de ${formatAuditCurrency(sale.total)} ao remover a O.S. #${osId}.`,
        });
      }

      await tx.serviceOrder.delete({
        where: { id: existingOrder.id },
      });
    });

    return NextResponse.json({
      message: "Ordem de Serviço excluída com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir OS:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir OS: " + (error.message || "Erro desconhecido"),
      },
      { status: 500 },
    );
  }
}
