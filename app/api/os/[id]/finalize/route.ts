import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeVehiclePlate } from "@/lib/segment-specialization";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = Number.parseInt(idParam, 10);
    const body = await request.json();
    const { paymentMethod, totalPrice, costPrice } = body;

    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: {
        id: true,
        companyId: true,
        serialNumber: true,
      },
    });

    if (!serviceOrder) {
      return NextResponse.json(
        { error: "O.S. não encontrada" },
        { status: 404 },
      );
    }

    const config = await prisma.companyConfig.findFirst({
      where: {
        companyId: currentUser.companyId,
      },
    });

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;

    const total = Number(totalPrice);
    const cost = Number(costPrice) || 0;
    let netAmount = total;

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

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.serviceOrder.update({
        where: { id: serviceOrder.id },
        data: {
          status: "FINALIZADO",
          totalPrice: total,
          costPrice: cost,
          paymentMethod,
          servicePrice: total - cost,
        },
      });

      const normalizedVehiclePlate = normalizeVehiclePlate(
        serviceOrder.serialNumber,
      );

      if (normalizedVehiclePlate) {
        await tx.product.updateMany({
          where: {
            companyId: currentUser.companyId,
            category: "VEICULO",
            vehiclePlate: normalizedVehiclePlate,
            vehicleStatus: "MANUTENCAO",
          },
          data: {
            vehicleStatus: "DISPONIVEL",
          },
        });
      }

      const newSale = await tx.sale.create({
        data: {
          companyId: currentUser.companyId,
          total,
          paymentMethod: finalPaymentMethod,
          cardType,
          feeAmount,
          netAmount,
          serviceOrderId: serviceOrder.id,
          sellerId: currentUser.id,
          items: {
            create: [
              {
                quantity: 1,
                unitPrice: total,
                description: `Ordem de Serviço #${serviceOrder.id}`,
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
      { status: 500 },
    );
  }
}
