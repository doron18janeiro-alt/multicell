import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lte: endOfDay,
        },
        status: {
          not: "REFUNDED",
        },
      },
    });

    let totalCash = 0;
    let totalPix = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    sales.forEach((sale) => {
      // Use netAmount (valor líquido) for calculation
      const value = sale.netAmount ?? sale.total;

      if (sale.paymentMethod === "DINHEIRO") {
        totalCash += value;
      } else if (sale.paymentMethod === "PIX") {
        totalPix += value;
      } else if (sale.paymentMethod === "CARTAO") {
        if (sale.cardType === "DEBITO") {
          totalDebit += value;
        } else if (sale.cardType === "CREDITO") {
          totalCredit += value;
        }
      }
    });

    const totalNet = totalCash + totalPix + totalDebit + totalCredit;

    const closing = await prisma.dailyClosing.findUnique({
      where: {
        date: today,
      },
    });

    const config = await prisma.companyConfig.findFirst();

    return NextResponse.json({
      totalCash,
      totalPix,
      totalDebit,
      totalCredit,
      totalNet,
      isClosed: closing?.status === "CLOSED",
      closingDetails: closing,
      companyPhone: config?.phone || "",
    });
  } catch (error) {
    console.error("Error fetching cash flow:", error);
    return NextResponse.json(
      { error: "Erro ao buscar fluxo de caixa" },
      { status: 500 }
    );
  }
}
