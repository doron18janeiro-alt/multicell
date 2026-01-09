import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: Ensure Daily Closing for Today exists
async function ensureDailyClosing() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if closing exists for today
  const existingClosing = await prisma.dailyClosing.findUnique({
    where: { date: today },
  });

  if (!existingClosing) {
    // Get yesterday's closing to carry over balance
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find absolute latest closing if yesterday doesn't exist?
    // For now, simple logic: find yesterday.
    const lastClosing =
      (await prisma.dailyClosing.findUnique({
        where: { date: yesterday },
      })) ||
      (await prisma.dailyClosing.findFirst({
        orderBy: { date: "desc" },
      }));

    const startBalance = lastClosing
      ? lastClosing.totalCash - lastClosing.totalNet
      : 0;
    // Actually, usually you start with the cash you left in the drawer (Float).
    // Let's assume start with 0 if no previous, or previous totalCash.
    const initialCash = lastClosing ? lastClosing.totalCash : 0;

    // Create today's closing record (Open the Register)
    await prisma.dailyClosing.create({
      data: {
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
    await ensureDailyClosing();

    // Total de O.S. Pendentes (Status != FINALIZADO e != PRONTO)
    const pendingCount = await prisma.serviceOrder.count({
      where: {
        status: {
          notIn: ["FINALIZADO", "PRONTO"],
        },
      },
    });

    // Faturamento do Dia (Soma de price onde status = ENTREGUE e updatedAt = hoje)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Faturamento do Dia: Somente da tabela SALE para evitar duplicidade (pois O.S. finalizada gera Venda)
    const salesToday = await prisma.sale.aggregate({
      _sum: {
        total: true, // Use gross total for revenue
      },
      where: {
        status: { not: "REFUNDED" },
        createdAt: {
          gte: today,
          lte: endOfDay,
        },
      },
    });

    const revenueToday = salesToday._sum.total || 0;

    // Patrimônio em Estoque (Soma de custo * quantidade)
    // Prisma aggregate sum can't multiply, so we fetch all products
    const allProducts = await prisma.product.findMany({
      select: { costPrice: true, stock: true },
    });

    const stockValue = allProducts.reduce((acc, curr) => {
      return acc + curr.costPrice * curr.stock;
    }, 0);

    // Lucro do Dia (Vendas - Custo das Peças usadas hoje)
    // Nota: Em um cenário real, você subtrairia o custo das peças usadas nas O.S. finalizadas hoje.
    // Aqui estamos simplificando pegando o totalPrice das O.S. finalizadas.
    const profitToday = await prisma.serviceOrder.aggregate({
      _sum: {
        servicePrice: true, // Assumindo que o serviço é o lucro, ou fazendo calc mais complexo depois
      },
      where: {
        status: "FINALIZADO",
        updatedAt: {
          gte: today,
        },
      },
    });

    // Últimas 5 O.S.
    const recentOrders = await prisma.serviceOrder.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
      },
    });

    // Vendas de Balcão do Dia por Método de Pagamento - SAFE AGGREGATION
    const salesGrouped = await prisma.sale.groupBy({
      by: ["paymentMethod"],
      _sum: {
        total: true,
      },
      where: {
        createdAt: { gte: today },
        status: { not: "REFUNDED" },
      },
    });
    const salesByMethod = salesGrouped.map((item) => ({
      paymentMethod: item.paymentMethod,
      total: item._sum.total || 0,
    }));

    // Alertas de Estoque: Fetch minimal fields and filter in memory (Prisma limitation for field comparison)
    const stockProducts = await prisma.product.findMany({
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
        error: "Erro ao carregar dashboard", // Optional: include error message for debugging
      },
      { status: 200 }
    ); // Return 200 with zeroed data to prevent frontend crash
  }
}
