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

    const companyId = session.user.companyId;

    // Chama a função RPC do Supabase que calcula tudo no banco de dados
    // Isso garante consistência total e performance
    const result: any = await prisma.$queryRaw`
      SELECT * FROM get_real_management_stats(${companyId}::uuid)
    `;

    // Se não retornar dados, devolve zerado
    if (!result || result.length === 0) {
      return NextResponse.json({
        dailyProfit: 0,
        weeklyProfit: 0,
        monthlyProfit: 0,
        stockValue: 0,
        stockProfitEstimate: 0,
        totalStockItems: 0,
      });
    }

    const stats = result[0];

    return NextResponse.json({
      dailyProfit: Number(stats.daily_profit || 0),
      weeklyProfit: Number(stats.weekly_profit || 0),
      monthlyProfit: Number(stats.monthly_profit || 0),
      stockValue: Number(stats.stock_value || 0),
      stockProfitEstimate: Number(stats.stock_profit_estimate || 0),
      totalStockItems: Number(stats.total_stock_items || 0),
    });
  } catch (error) {
    console.error("Dashboard Real-time Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
