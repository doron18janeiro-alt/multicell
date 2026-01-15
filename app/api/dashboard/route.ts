import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Helper: Ensure Daily Closing for Today exists
async function ensureDailyClosing(companyId: string) {
  // Ajuste de Fuso Horário (Brasil UTC-3)
  const brazilOffset = -3;
  const now = new Date();
  const nowBrazil = new Date(now.getTime() + brazilOffset * 60 * 60 * 1000);

  const startOfDayBrazil = new Date(nowBrazil);
  startOfDayBrazil.setUTCHours(0, 0, 0, 0);

  // Data de referência: 03:00 UTC (Meia-noite BR)
  const today = new Date(
    startOfDayBrazil.getTime() - brazilOffset * 60 * 60 * 1000
  );

  // Check if closing exists for today
  const existingClosing = await prisma.dailyClosing.findUnique({
    where: {
      date_companyId: {
        date: today,
        companyId: companyId,
      },
    },
  });

  if (!existingClosing) {
    // Get yesterday's closing to carry over balance
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find absolute latest closing
    const lastClosing =
      (await prisma.dailyClosing.findUnique({
        where: {
          date_companyId: {
            date: yesterday,
            companyId: companyId,
          },
        },
      })) ||
      (await prisma.dailyClosing.findFirst({
        where: { companyId },
        orderBy: { date: "desc" },
      }));

    const initialCash = lastClosing ? lastClosing.totalCash : 0;

    // Create today's closing record (Open the Register)
    await prisma.dailyClosing.create({
      data: {
        companyId,
        date: today,
        status: "OPEN",
        totalCash: initialCash, // Carry over cash
        totalPix: 0,
        totalDebit: 0,
        totalCredit: 0,
        totalNet: 0,
      },
    });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    await ensureDailyClosing(companyId);

    // Total de O.S. Pendentes (Status != FINALIZADO e != PRONTO)
    const pendingCount = await prisma.serviceOrder.count({
      where: {
        companyId,
        status: {
          notIn: ["FINALIZADO", "PRONTO"],
        },
      },
    });

    // Faturamento do Dia
    const brazilOffset = -3;
    const now = new Date();
    const nowBrazil = new Date(now.getTime() + brazilOffset * 60 * 60 * 1000);
    const startOfDayBrazil = new Date(nowBrazil);
    startOfDayBrazil.setUTCHours(0, 0, 0, 0);
    const endOfDayBrazil = new Date(nowBrazil);
    endOfDayBrazil.setUTCHours(23, 59, 59, 999);

    const today = new Date(
      startOfDayBrazil.getTime() - brazilOffset * 60 * 60 * 1000
    );
    const endOfDay = new Date(
      endOfDayBrazil.getTime() - brazilOffset * 60 * 60 * 1000
    );

    console.log(
      `[Dashboard] Filtering sales for ${companyId} between ${today.toISOString()} and ${endOfDay.toISOString()}`
    );

    const salesToday = await prisma.sale.aggregate({
      _sum: {
        total: true, // Use gross total for revenue
      },
      where: {
        companyId: companyId,
        status: { not: "REFUNDED" },
        createdAt: {
          gte: today,
          lte: endOfDay,
        },
      },
    });

    const revenueToday = salesToday._sum.total || 0;
    console.log(`[Dashboard] Revenue Today: ${revenueToday}`);

    // Patrimônio em Estoque (Soma de custo * quantidade)
    // Prisma aggregate sum can't multiply, so we fetch all products
    const allProducts = await prisma.product.findMany({
      where: { companyId },
      select: { costPrice: true, stock: true },
    });

    const stockValue = allProducts.reduce((acc, curr) => {
      return acc + curr.costPrice * curr.stock;
    }, 0);

    // Lucro do Dia (Vendas - Custo das Peças usadas hoje)
    const profitToday = await prisma.serviceOrder.aggregate({
      _sum: {
        servicePrice: true,
      },
      _count: {
        id: true,
      },
      where: {
        companyId,
        status: "FINALIZADO",
        updatedAt: {
          gte: today,
        },
      },
    });

    // Últimas 5 O.S.
    const recentOrders = await prisma.serviceOrder.findMany({
      where: { companyId },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
      },
    });

    // Vendas de Balcão do Dia por Método de Pagamento
    const salesGrouped = await prisma.sale.groupBy({
      by: ["paymentMethod"],
      _sum: {
        total: true,
      },
      where: {
        companyId,
        createdAt: { gte: today },
        status: { not: "REFUNDED" },
      },
    });
    const salesByMethod = salesGrouped.map((item) => ({
      paymentMethod: item.paymentMethod,
      total: item._sum.total || 0,
    }));

    // Alertas de Estoque
    const stockProducts = await prisma.product.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        stock: true,
        minQuantity: true,
      },
    });

    const lowStockProducts = stockProducts.filter(
      (p) => p.stock <= p.minQuantity
    );

    return NextResponse.json({
      pendingCount: pendingCount || 0,
      finishedCount: profitToday._count?.id || 0,
      revenueToday: revenueToday || 0,
      stockValue: stockValue || 0,
      profitToday: profitToday._sum.servicePrice || 0,
      recentOrders: recentOrders || [],
      salesByMethod: salesByMethod || [],
      lowStockProducts: lowStockProducts || [],
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json(
      {
        pendingCount: 0,
        revenueToday: 0,
        stockValue: 0,
        profitToday: 0,
        recentOrders: [],
        salesByMethod: [],
        lowStockProducts: [],
        error: "Erro ao carregar dashboard",
      },
      { status: 200 }
    );
  }
}
