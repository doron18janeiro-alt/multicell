import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const salesRevenue = await prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        companyId,
        status: { not: "REFUNDED" },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalRevenue = salesRevenue._sum.total || 0;

    const salesItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          companyId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: { not: "REFUNDED" },
        },
        productId: { not: null },
      },
      include: {
        product: {
          select: { costPrice: true },
        },
      },
    });

    const productsCost = salesItems.reduce((acc, item) => {
      return acc + item.quantity * (item.product?.costPrice || 0);
    }, 0);

    const osCost = await prisma.serviceOrder.aggregate({
      _sum: { costPrice: true },
      where: {
        companyId,
        status: "FINALIZADO",
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalCost = productsCost + (osCost._sum.costPrice || 0);

    const chartData = [];
    for (let i = 2; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString("pt-BR", { month: "short" });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const monthSales = await prisma.sale.aggregate({
        _sum: { total: true },
        where: {
          companyId,
          createdAt: { gte: start, lte: end },
          status: { not: "REFUNDED" },
          serviceOrderId: null,
        },
      });

      const monthOS = await prisma.serviceOrder.aggregate({
        _sum: { totalPrice: true },
        where: {
          companyId,
          status: "FINALIZADO",
          updatedAt: { gte: start, lte: end },
        },
      });

      chartData.push({
        name: monthName,
        vendas: monthSales._sum.total || 0,
        servicos: monthOS._sum.totalPrice || 0,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesItems30d = await prisma.saleItem.findMany({
      where: {
        sale: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
          status: { not: "REFUNDED" },
        },
        productId: { not: null },
      },
      include: {
        product: true,
      },
    });

    const productStats: Record<string, any> = {};

    salesItems30d.forEach((item) => {
      if (!item.product) {
        return;
      }

      const pid = item.productId as string;

      if (!productStats[pid]) {
        productStats[pid] = {
          id: pid,
          name: item.product.name,
          stock: item.product.stock,
          minQuantity: item.product.minQuantity,
          sold: 0,
          revenue: 0,
          cost: 0,
        };
      }

      const q = item.quantity;
      productStats[pid].sold += q;
      productStats[pid].revenue += item.unitPrice * q;
      productStats[pid].cost += item.product.costPrice * q;
    });

    const ranking = Object.values(productStats);

    const bestSellers = [...ranking].sort((a, b) => b.sold - a.sold).slice(0, 5);

    const mostProfitable = [...ranking]
      .sort((a, b) => b.revenue - b.cost - (a.revenue - a.cost))
      .slice(0, 5)
      .map((p) => ({
        ...p,
        profit: p.revenue - p.cost,
        margin:
          p.revenue > 0
            ? (((p.revenue - p.cost) / p.revenue) * 100).toFixed(1)
            : 0,
      }));

    const top20Sellers = [...ranking]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 20);

    const suggestions = top20Sellers.filter((p) => p.stock <= p.minQuantity);

    return NextResponse.json({
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
      chartData,
      abc: {
        bestSellers,
        mostProfitable,
        suggestions,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 },
    );
  }
}
