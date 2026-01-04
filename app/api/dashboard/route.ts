import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Total de O.S. Pendentes (Status != ENTREGUE e != PRONTO)
    const pendingCount = await prisma.serviceOrder.count({
      where: {
        status: {
          notIn: ["ENTREGUE", "PRONTO"],
        },
      },
    });

    // Faturamento do Dia (Soma de price onde status = ENTREGUE e updatedAt = hoje)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesToday = await prisma.serviceOrder.aggregate({
      _sum: {
        price: true,
      },
      where: {
        status: "ENTREGUE",
        updatedAt: {
          gte: today,
        },
      },
    });

    // Últimas 5 O.S.
    const recentOrders = await prisma.serviceOrder.findMany({
      take: 5,
      orderBy: {
        entryDate: "desc",
      },
      include: {
        customer: true,
      },
    });

    // Vendas de Balcão do Dia por Método de Pagamento
    const salesByMethod = await prisma.sale.groupBy({
      by: ["paymentMethod"],
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    const counterSalesTotal = await prisma.sale.aggregate({
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    const totalRevenue =
      (salesToday._sum.price || 0) + (counterSalesTotal._sum.total || 0);

    return NextResponse.json({
      pendingCount,
      revenueToday: totalRevenue,
      recentOrders,
      salesByMethod,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    );
  }
}
