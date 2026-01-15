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

    // Ajuste de Fuso Horário (Brasil UTC-3)
    const brazilOffset = -3; // UTC-3
    const now = new Date();

    // Calcula o "agora" em horário do Brasil (apenas para pegar o dia correto)
    const nowBrazil = new Date(now.getTime() + brazilOffset * 60 * 60 * 1000);

    // Define limites do dia baseado no horário brasileiro
    const startOfDayBrazil = new Date(nowBrazil);
    startOfDayBrazil.setUTCHours(0, 0, 0, 0);

    const endOfDayBrazil = new Date(nowBrazil);
    endOfDayBrazil.setUTCHours(23, 59, 59, 999);

    // Converte de volta para UTC real para consultar o banco
    const today = new Date(
      startOfDayBrazil.getTime() - brazilOffset * 60 * 60 * 1000
    );
    const endOfDay = new Date(
      endOfDayBrazil.getTime() - brazilOffset * 60 * 60 * 1000
    );

    console.log(
      `[CashFlow] Buscando vendas entre ${today.toISOString()} e ${endOfDay.toISOString()} para empresa ${companyId}`
    );

    const sales = await prisma.sale.findMany({
      where: {
        companyId: companyId, // Garante filtro explícito
        createdAt: {
          gte: today,
          lte: endOfDay,
        },
        status: {
          not: "REFUNDED",
        },
      },
    });

    console.log(`[CashFlow] Vendas encontradas: ${sales.length}`);

    let totalCash = 0;
    let totalPix = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    sales.forEach((sale) => {
      // Use netAmount (valor líquido) for calculation
      const value = sale.netAmount ?? sale.total ?? 0;
      const method = sale.paymentMethod ? sale.paymentMethod.toUpperCase() : "";

      if (method === "DINHEIRO") {
        totalCash += value;
      } else if (method === "PIX") {
        totalPix += value;
      } else if (method === "CARTAO") {
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
