import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Determine "Today" in Brasilia
    const now = new Date();
    const brazilDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const startOfDayUTC = new Date(`${brazilDateStr}T00:00:00.000-03:00`);
    const endOfDayUTC = new Date(`${brazilDateStr}T23:59:59.999-03:00`);

    // Fetch all sales for today to calculate totals freshly
    const salesToday = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
      },
    });

    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });

    // Calculated Aggregation
    let totalCash = 0;
    let totalPix = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    // Tax Rates
    const taxCashRate = config?.taxCash ?? 0;
    const taxPixRate = config?.taxPix ?? 0;
    const debitRate = config?.debitRate ?? 1.99;
    const creditRate = config?.creditRate ?? 3.99;

    let totalGross = 0;
    let totalTaxAmount = 0;

    for (const sale of salesToday) {
      const val = sale.total;
      totalGross += val;
      let tax = 0;

      const method = sale.paymentMethod.toUpperCase();
      if (method === "DINHEIRO") {
        totalCash += val;
        tax = val * (taxCashRate / 100);
      } else if (method === "PIX") {
        totalPix += val;
        tax = val * (taxPixRate / 100);
      } else if (method.includes("DEBITO")) {
        totalDebit += val;
        tax = val * (debitRate / 100);
      } else if (method.includes("CREDITO")) {
        totalCredit += val;
        tax = val * (creditRate / 100);
      } else {
        // Default/Fallback
        totalCredit += val;
        tax = val * (creditRate / 100);
      }
      totalTaxAmount += tax;
    }

    const totalNet = totalGross - totalTaxAmount;

    // Upsert DailyClosing
    // We use the startOfDayUTC as the unique date key (or pure date)
    // The schema unique constraint is [date, companyId].
    // Ideally we store the date part only, but DateTime in Prisma includes time.
    // We should normalize 'date' to start of day for consistency.
    const closingDate = startOfDayUTC;

    // Unlike 'create', upsert allows re-closing (updating)
    const result = await prisma.dailyClosing.upsert({
      where: {
        date_companyId: {
          date: closingDate,
          companyId,
        },
      },
      update: {
        totalCash,
        totalPix,
        totalDebit,
        totalCredit,
        totalNet, // Schema has totalNet
        status: "CLOSED",
        closedAt: new Date(),
      },
      create: {
        companyId,
        date: closingDate,
        totalCash,
        totalPix,
        totalDebit,
        totalCredit,
        totalNet,
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, closing: result });
  } catch (error) {
    console.error("Erro ao fechar caixa:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
