import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 1. Total Sales Revenue (Month)
    const salesRevenue = await prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // 2. Total Service Order Revenue (Month)
    const osRevenue = await prisma.serviceOrder.aggregate({
      _sum: { price: true },
      where: {
        status: "ENTREGUE",
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalRevenue =
      (salesRevenue._sum.total || 0) + (osRevenue._sum.price || 0);

    // 3. Total Costs (Sales Items Cost)
    // We need to fetch all sale items for this month and sum (quantity * product.costPrice)
    // Prisma doesn't support deep aggregation easily in one query for this, so we might need to fetch items.
    // Or we can use raw query. Let's fetch items for simplicity if volume is low, or raw query.
    // Let's try to be efficient.
    const salesItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
      include: {
        product: {
          select: { costPrice: true },
        },
      },
    });

    const totalCost = salesItems.reduce((acc, item) => {
      return acc + item.quantity * (item.product?.costPrice || 0);
    }, 0);

    // 4. Chart Data (Last 3 Months)
    const chartData = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString("pt-BR", { month: "short" });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const monthSales = await prisma.sale.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: start, lte: end } },
      });

      const monthOS = await prisma.serviceOrder.aggregate({
        _sum: { price: true },
        where: {
          status: "ENTREGUE",
          updatedAt: { gte: start, lte: end },
        },
      });

      chartData.push({
        name: monthName,
        vendas: monthSales._sum.total || 0,
        servicos: monthOS._sum.price || 0,
      });
    }

    return NextResponse.json({
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
      chartData,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
