import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateFoodOrderFinancials,
  FOOD_PENDING_PAYMENT_METHOD,
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

const buildManualPaymentSnapshot = ({
  amount,
  tableNumber,
  paymentMethod,
}: {
  amount: number;
  tableNumber?: string | null;
  paymentMethod: string;
}): PendingItemsSnapshot => [
  {
    description:
      paymentMethod === FOOD_PENDING_PAYMENT_METHOD
        ? `Saldo transferido para pendente da mesa ${tableNumber || "Balcao"}`
        : `Pagamento da mesa ${tableNumber || "Balcao"}`,
    quantity: 1,
    unitPrice: amount,
    consumedAt: new Date().toISOString(),
  },
];

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
    const selections = normalizeCheckoutSelections(body.selections || []);
    const requestedAmount = roundCurrency(Number(body.amount || 0));
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

    if (selections.length === 0 && requestedAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "Informe um valor para pagamento ou selecione itens da mesa para fechar.",
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
      const financialsBeforePayment = calculateFoodOrderFinancials({
        items: order.items,
        paidAmount: Number(order.paidAmount || 0),
        pendingTransferredAmount: Number(order.pendingTransferredAmount || 0),
      });

      if (financialsBeforePayment.balanceDue <= 0) {
        throw new Error("Esta mesa ja esta totalmente quitada.");
      }

      let paymentAmount = requestedAmount;
      let itemsSnapshot: PendingItemsSnapshot = buildManualPaymentSnapshot({
        amount: requestedAmount,
        tableNumber: order.table?.number,
        paymentMethod,
      });

      if (selections.length > 0) {
        for (const selection of selections) {
          const item = itemsMap.get(selection.itemId);

          if (!item) {
            throw new Error("Há itens selecionados que não pertencem a esta mesa.");
          }

          const remainingQuantity =
            Number(item.quantity || 0) - Number(item.settledQuantity || 0);

          if (selection.quantity > remainingQuantity) {
            throw new Error(
              `A quantidade selecionada para ${item.description} excede o saldo disponível da mesa.`,
            );
          }
        }

        paymentAmount = calculateSelectedItemsAmount({
          orderItems: order.items,
          selections,
        });
        itemsSnapshot = buildPendingItemsSnapshot({
          orderItems: order.items,
          selections,
        });
      }

      if (paymentAmount <= 0) {
        throw new Error("Nao foi possivel calcular o valor do fechamento.");
      }

      if (paymentAmount - financialsBeforePayment.balanceDue > 0.009) {
        throw new Error("O valor informado excede o saldo restante da mesa.");
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
              `Mesa ${order.table?.number || "Balcao"} - saldo pendente registrado`,
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

      if (selections.length > 0) {
        for (const selection of selections) {
          const item = itemsMap.get(selection.itemId)!;

          await tx.foodOrderItem.update({
            where: {
              id: item.id,
            },
            data: {
              settledQuantity: {
                increment: selection.quantity,
              },
            },
          });
        }
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
        paidAmount,
        pendingTransferredAmount,
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
