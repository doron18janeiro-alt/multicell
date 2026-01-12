import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
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
      const value = sale.netAmount ?? sale.total ?? 0;

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
        date_companyId: {
          date: today,
          companyId,
        },
      },
    });

    const config = await prisma.companyConfig.findFirst();

    return NextResponse.json({
      totalCash: totalCash || 0,
      totalPix: totalPix || 0,
      totalDebit: totalDebit || 0,
      totalCredit: totalCredit || 0,
      totalNet: totalNet || 0,
      isClosed: closing?.status === "CLOSED",
      closingDetails: closing,
      companyPhone: config?.phone || "",
    });
  } catch (error) {
    console.error("Error fetching cash flow:", error);
    return NextResponse.json({
      totalCash: 0,
      totalPix: 0,
      totalDebit: 0,
      totalCredit: 0,
      totalNet: 0,
      isClosed: false,
      companyPhone: "",
      error: "Erro ao buscar dados do caixa",
    });
  }
}
