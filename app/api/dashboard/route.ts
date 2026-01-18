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

    // 1. Tenta buscar via RPC (Função otimizada do Banco)
    let stats: any = {};
    try {
      const result: any = await prisma.$queryRaw`
        SELECT * FROM get_realtime_management_stats(${companyId}::uuid)
      `;
      if (result && result.length > 0) {
        stats = result[0];
      }
    } catch (dbError) {
      console.warn("RPC Error, falling back to Prisma aggregation:", dbError);
    }

    // 2. Fallback de Segurança: Se o estoque vier zerado, calcula na mão
    // Isso garante que mesmo se a procedure falhar, o painel não mostre "R$ 0,00"
    if (!stats.stock_value || Number(stats.stock_value) === 0) {
      const products = await prisma.product.findMany({
        where: { companyId },
        select: {
          stock: true,
          costPrice: true,
          salePrice: true,
        },
      });

      const stockValue = products.reduce(
        (acc, p) => acc + p.stock * p.costPrice,
        0
      );
      const stockProfitEstimate = products.reduce(
        (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
        0
      );
      const totalStockItems = products.reduce((acc, p) => acc + p.stock, 0);

      stats.stock_value = stockValue;
      stats.stock_profit_estimate = stockProfitEstimate;
      stats.total_stock_items = totalStockItems;
    }

    // 3. Fallback para Lucros (Se RPC falhar completamente)
    if (stats.daily_profit === undefined) {
      // Se chegou aqui, a RPC falhou total. Vamos zerar ou implementar fallback de lucro.
      // Para evitar lentidão, vamos assumir 0 se a RPC falhou, mas o estoque já foi corrigido.
      stats.daily_profit = 0;
      stats.weekly_profit = 0;
      stats.monthly_profit = 0;
    }

    const response = NextResponse.json({
      dailyProfit: Number(stats.daily_profit || 0),
      weeklyProfit: Number(stats.weekly_profit || 0),
      monthlyProfit: Number(stats.monthly_profit || 0),
      stockValue: Number(stats.stock_value || 0),
      stockProfitEstimate: Number(stats.stock_profit_estimate || 0),
      totalStockItems: Number(stats.total_stock_items || 0),
    });

    // Desabilitar cache completamente para garantir dados frescos
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Dashboard Real-time Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
