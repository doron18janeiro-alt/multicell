import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const salesToday = await prisma.serviceOrder.aggregate({
      _sum: {
        totalPrice: true,
      },
      where: {
        status: "FINALIZADO",
        updatedAt: {
          gte: today,
        },
      },
    });

    // Patrimônio em Estoque (Soma de custo * quantidade)
    const stockValue = await prisma.product.aggregate({
      _sum: {
        costPrice: true,
      },
    });

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

    // Vendas de Balcão do Dia por Método de Pagamento
    const salesByMethod = [] as any; /*await prisma.sale.groupBy({
      by: ["paymentMethod"],
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: today,
        },
      },
    });*/

    return NextResponse.json({
      pendingCount,
      revenueToday: salesToday._sum.totalPrice || 0,
      stockValue: stockValue._sum.costPrice || 0,
      profitToday: profitToday._sum.servicePrice || 0,
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
