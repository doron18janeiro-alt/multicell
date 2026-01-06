import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, paymentMethod, total } = body;

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;
    let netAmount = total;

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst();

    // Normalizing payment methods and calculating fees
    if (paymentMethod === "DEBITO" || paymentMethod === "CREDITO") {
      cardType = paymentMethod;
      finalPaymentMethod = "CARTAO";

      const rate =
        paymentMethod === "DEBITO"
          ? config?.debitRate ?? 1.99
          : config?.creditRate ?? 3.99;

      feeAmount = (total * rate) / 100;
      netAmount = total - feeAmount;
    }

    // Transaction to ensure data consistency
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create the Sale
      const newSale = await tx.sale.create({
        data: {
          total,
          paymentMethod: finalPaymentMethod,
          cardType,
          feeAmount,
          netAmount,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
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
        },
      });

      // 2. Update Stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 }
    );
  }
}
