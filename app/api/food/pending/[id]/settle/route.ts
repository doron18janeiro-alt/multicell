import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FOOD_PENDING_PAYMENT_METHOD,
  isFoodPaymentMethod,
  normalizeOptionalText,
} from "@/lib/food";
import { resolveSalePaymentData } from "@/lib/food-server";

const parseItemsSnapshot = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is {
          productId?: string | null;
          description: string;
          quantity: number;
          unitPrice: number;
        } =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as { description?: unknown }).description === "string",
      )
    : [];

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
    const receiptDocument = normalizeOptionalText(body.receiptDocument);

    if (!isFoodPaymentMethod(paymentMethod) || paymentMethod === FOOD_PENDING_PAYMENT_METHOD) {
      return NextResponse.json(
        { error: "Selecione uma forma de pagamento válida para quitar o pendente." },
        { status: 400 },
      );
    }

    const companyId = currentUser.companyId;

    const payload = await prisma.$transaction(async (tx) => {
      const pendingEntry = await tx.customerPendingEntry.findFirst({
        where: {
          id,
          companyId,
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

      if (!pendingEntry) {
        throw new Error("Pendência não encontrada.");
      }

      if (pendingEntry.status === "PAGO") {
        throw new Error("Esta pendência já foi quitada.");
      }

      const itemsSnapshot = parseItemsSnapshot(pendingEntry.itemsSnapshot);

      if (itemsSnapshot.length === 0) {
        throw new Error("Não há itens suficientes para liquidar esta pendência.");
      }

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
        total: Number(pendingEntry.amount || 0),
        config,
      });

      const sale = await tx.sale.create({
        data: {
          companyId,
          foodOrderId: pendingEntry.orderId,
          total: Number(pendingEntry.amount || 0),
          paymentMethod: paymentData.paymentMethod,
          cardType: paymentData.cardType,
          feeAmount: paymentData.feeAmount,
          netAmount: paymentData.netAmount,
          customerId: pendingEntry.customerId,
          customerDocument: receiptDocument || pendingEntry.customer.document || null,
          tableNumber: pendingEntry.order?.table?.number || null,
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

      const currentPendingBalance = Number(pendingEntry.customer.pendingBalance || 0);

      await tx.customer.update({
        where: {
          id: pendingEntry.customerId,
        },
        data: {
          pendingBalance: Math.max(
            currentPendingBalance - Number(pendingEntry.amount || 0),
            0,
          ),
        },
      });

      const updatedEntry = await tx.customerPendingEntry.update({
        where: {
          id: pendingEntry.id,
        },
        data: {
          status: "PAGO",
          settledAt: new Date(),
        },
      });

      return {
        sale,
        pendingEntry: {
          id: updatedEntry.id,
          status: updatedEntry.status,
          settledAt: updatedEntry.settledAt?.toISOString() ?? null,
        },
      };
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("[api/food/pending/:id/settle][POST] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao liquidar conta pendente.",
      },
      { status: 500 },
    );
  }
}
