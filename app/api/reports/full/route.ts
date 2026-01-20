import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId || "multicell-oficial";

    // 1. Fetch ALL Completed Sales
    const sales = await prisma.sale.findMany({
      where: {
        companyId: companyId,
        status: "COMPLETED",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Data Processing & Aggregation
    const productStats: Record<
      string,
      { name: string; revenue: number; profit: number; quantity: number }
    > = {};
    const paymentStats: Record<string, number> = {};
    const dailyStats: Record<string, number> = {};

    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach((sale) => {
      // --- Payment Stats ---
      const method = sale.paymentMethod?.toUpperCase() || "OUTROS";
      const saleTotal = Number(sale.total || 0);
      paymentStats[method] = (paymentStats[method] || 0) + saleTotal;

      totalRevenue += saleTotal;

      // --- Date Stats (Offset -3h) ---
      const saleTime = new Date(sale.createdAt).getTime();
      const saleDateSP = new Date(saleTime - 3 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]; // YYYY-MM-DD
      dailyStats[saleDateSP] = (dailyStats[saleDateSP] || 0) + saleTotal;

      // --- Product Stats ---
      sale.items.forEach((item) => {
        if (!item.product) return;

        const pId = item.product.id;
        const pName = item.product.name;
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0); // Sold price
        const unitCost = Number(item.product.costPrice || 0); // Cost price (from product catalog)

        const revenue = qty * unitPrice;
        const cost = qty * unitCost;
        const profit = revenue - cost;

        totalCost += cost;

        if (!productStats[pId]) {
          productStats[pId] = {
            name: pName,
            revenue: 0,
            profit: 0,
            quantity: 0,
          };
        }
        productStats[pId].revenue += revenue;
        productStats[pId].profit += profit;
        productStats[pId].quantity += qty;
      });
    });

    // 3. Transformations for Response

    // Top Profit Products
    const sortedProductsByProfit = Object.values(productStats)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // Payment Methods
    const paymentMethods = Object.entries(paymentStats)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    // Daily Records
    const dailyEntries = Object.entries(dailyStats);
    let bestDay = { date: "", total: 0 };
    let worstDay = { date: "", total: Infinity };

    if (dailyEntries.length > 0) {
      // Find max
      const maxEntry = dailyEntries.reduce(
        (max, curr) => (curr[1] > max[1] ? curr : max),
        dailyEntries[0],
      );
      bestDay = { date: maxEntry[0], total: maxEntry[1] };

      // Find min (filter out 0 if necessary, but sales usually > 0)
      const minEntry = dailyEntries.reduce(
        (min, curr) => (curr[1] < min[1] ? curr : min),
        dailyEntries[0],
      );
      worstDay = { date: minEntry[0], total: minEntry[1] };
    } else {
      worstDay = { date: "", total: 0 }; // Reset if no data
    }

    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      financials: {
        totalRevenue,
        totalCost,
        totalProfit,
        margin: margin.toFixed(1),
      },
      topProducts: sortedProductsByProfit,
      paymentRanking: paymentMethods,
      records: {
        bestDay,
        worstDay,
      },
    });
  } catch (error) {
    console.error("[REPORTS FULL] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
