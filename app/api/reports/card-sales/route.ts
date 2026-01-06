import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst();

    // Fetch sales
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        OR: [
          { paymentMethod: "CARTAO" },
          { cardType: { not: null } }, // Robustness
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate totals
    const debitSales = sales.filter((s) => s.cardType === "DEBITO");
    const creditSales = sales.filter((s) => s.cardType === "CREDITO");

    const debitTotal = debitSales.reduce((acc, curr) => acc + curr.total, 0);
    const creditTotal = creditSales.reduce((acc, curr) => acc + curr.total, 0);

    return NextResponse.json({
      summary: {
        debitTotal,
        creditTotal,
      },
      sales: sales.map((s) => ({
        id: s.id,
        total: s.total,
        cardType: s.cardType,
        createdAt: s.createdAt,
      })),
      config: {
        debitRate: config?.debitRate ?? 1.99,
        creditRate: config?.creditRate ?? 3.99,
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Erro ao buscar relatório" },
      { status: 500 }
    );
  }
}
