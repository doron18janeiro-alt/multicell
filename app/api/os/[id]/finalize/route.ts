import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { paymentMethod, totalPrice, costPrice } = body;

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst();

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;

    // Convert to numbers to be safe
    const total = Number(totalPrice);
    const cost = Number(costPrice) || 0;
    let netAmount = total;

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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Service Order
      const updatedOrder = await tx.serviceOrder.update({
        where: { id },
        data: {
          status: "FINALIZADO",
          totalPrice: total,
          costPrice: cost,
          paymentMethod: paymentMethod, // Store specific method (CREDITO/DEBITO) or generic? Schema says String. Keeping specific is good.
          // servicePrice is usually calculated as total - cost.
          // Let's update it too for easier simple reporting if needed
          servicePrice: total - cost,
        },
      });

      // 2. Create the Sale Record
      const newSale = await tx.sale.create({
        data: {
          total: total,
          paymentMethod: finalPaymentMethod,
          cardType,
          feeAmount,
          netAmount,
          serviceOrderId: id,
          items: {
            create: [
              {
                quantity: 1,
                unitPrice: total,
                description: `Ordem de Serviço #${id}`,
              },
            ],
          },
        },
      });

      return { updatedOrder, newSale };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao finalizar O.S.:", error);
    return NextResponse.json(
      { error: "Erro ao processar finalização" },
      { status: 500 }
    );
  }
}
