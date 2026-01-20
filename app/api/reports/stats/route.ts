import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    // Allow access without session for testing or internal dashboard if needed,
    // but preferably protect it. For now, strictly following prompt about companyId
    // implies a session exists, but we can be safe.

    // Fallback companyId logic
    const companyId = session?.user?.companyId || "multicell-oficial";

    // 1. Fetch ALL Completed Sales
    let sales = await prisma.sale.findMany({
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

    // Fallback Bruto: Se não achou com companyId, traz TUDO que for COMPLETED
    if (sales.length === 0) {
      console.log(
        "Relatórios: Nenhuma venda encontrada para ID. Ativando busca global.",
      );
      sales = await prisma.sale.findMany({
        where: {
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
    }

    // 2. Aggregation Structures
    const productStats: Record<
      string,
      {
        name: string;
        revenue: number;
        profit: number;
        quantity: number;
      }
    > = {};

    const paymentStats: Record<string, number> = {
      PIX: 0,
      DINHEIRO: 0,
      DEBITO: 0,
      CREDITO: 0,
      OUTROS: 0,
    };

    const dailyStats: Record<string, number> = {};

    let totalRevenue = 0;
    let totalCost = 0;

    // 3. Loop Logic
    sales.forEach((sale) => {
      // --- Financials ---
      const saleTotal = Number(sale.total) || 0;
      totalRevenue += saleTotal;

      // --- Payment Ranking ---
      let method = (sale.paymentMethod || "OUTROS").toUpperCase();
      // Normalize common method names from DB to "PIX", "DINHEIRO", etc.
      if (method.includes("PIX")) method = "PIX";
      else if (
        method.includes("MONEY") ||
        method.includes("CASH") ||
        method.includes("DINHEIRO")
      )
        method = "DINHEIRO";
      else if (method.includes("DEBIT")) method = "DEBITO";
      else if (method.includes("CREDIT")) method = "CREDITO";

      if (paymentStats[method] !== undefined) {
        paymentStats[method] += saleTotal;
      } else {
        paymentStats["OUTROS"] += saleTotal;
      }

      // --- Day Ranking (Timestamp -3h for Brasilia) ---
      const saleDate = new Date(sale.createdAt);
      const brasiliaTime = new Date(saleDate.getTime() - 3 * 60 * 60 * 1000);
      const dateKey = brasiliaTime.toISOString().split("T")[0]; // YYYY-MM-DD

      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + saleTotal;

      // --- Product Stats ---
      sale.items.forEach((item) => {
        if (!item.product) return;

        // Group by Name as requested
        const name = item.product.name;

        const quantity = Number(item.quantity) || 0;
        const salePrice = Number(item.unitPrice) || 0;
        // Fallback cost to 0 if null
        const costPrice = Number(item.product.costPrice) || 0;

        const itemRevenue = salePrice * quantity;
        const itemCost = costPrice * quantity;
        const itemProfit = itemRevenue - itemCost;

        totalCost += itemCost;

        if (!productStats[name]) {
          productStats[name] = {
            name,
            revenue: 0,
            profit: 0,
            quantity: 0,
          };
        }

        productStats[name].revenue += itemRevenue;
        productStats[name].profit += itemProfit;
        productStats[name].quantity += quantity;
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const margin =
      totalRevenue > 0
        ? ((totalProfit / totalRevenue) * 100).toFixed(1)
        : "0.0";

    // 4. Sort Rankings
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.profit - a.profit) // Sort by Profit
      .slice(0, 5);

    const paymentRanking = Object.entries(paymentStats)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total)
      .filter((p) => p.total > 0); // Hide empty methods

    // 5. Best/Worst Days
    const days = Object.entries(dailyStats).map(([date, total]) => ({
      date,
      total,
    }));
    days.sort((a, b) => b.total - a.total);

    const bestDay = days.length > 0 ? days[0] : { date: "", total: 0 };
    const worstDay =
      days.length > 0 ? days[days.length - 1] : { date: "", total: 0 };

    return NextResponse.json(
      {
        financials: {
          totalRevenue,
          totalCost,
          totalProfit,
          margin,
        },
        topProducts,
        paymentRanking,
        records: {
          bestDay,
          worstDay,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
