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

    // --- CÁLCULO DIRETO VIA RAW SQL (Sem dependência de Functions ou TZ libs no server) ---
    // Usamos o fuso 'America/Sao_Paulo' diretamente no Postgres.
    // Isso evita problemas de UUID vs String na function RPC e problemas de JS Date.

    // 1. Definição do Intervalo de Hoje (00:00 em SP)
    // O trunco 'day' em SP pega "2026-01-18 00:00:00" e depois converte de volta pra UTC.
    // Assim comparamos maçãs com maçãs (timestamp no banco).
    const profitQuery = await prisma.$queryRaw`
      WITH timeframe AS (
        SELECT 
          date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' as start_today,
          date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '1 day' as start_week,
          date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' as start_month
      )
      SELECT 
        -- Lucro Diário
        COALESCE(SUM(
          CASE WHEN s.created_at >= (SELECT start_today FROM timeframe) THEN
            (COALESCE(s.net_amount, s.total - COALESCE(s.fee_amount, 0)) - 
             (SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) 
              FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = s.id)
            )
          ELSE 0 END
        ), 0) as daily_profit,

        -- Lucro Semanal
        COALESCE(SUM(
          CASE WHEN s.created_at >= (SELECT start_week FROM timeframe) THEN
            (COALESCE(s.net_amount, s.total - COALESCE(s.fee_amount, 0)) - 
             (SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) 
              FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = s.id)
            )
          ELSE 0 END
        ), 0) as weekly_profit,

        -- Lucro Mensal
        COALESCE(SUM(
          CASE WHEN s.created_at >= (SELECT start_month FROM timeframe) THEN
            (COALESCE(s.net_amount, s.total - COALESCE(s.fee_amount, 0)) - 
             (SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) 
              FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = s.id)
            )
          ELSE 0 END
        ), 0) as monthly_profit

      FROM sales s
      WHERE s.company_id = ${companyId}
        AND s.status = 'COMPLETED'
        -- Otimização: Só trazer vendas do mês atual pra frente (abrangendo semana e dia)
        AND s.created_at >= (SELECT start_month FROM timeframe)
    `;

    // 2. Busca de Estoque
    // Separado para garantir que não zeramos estoque caso não haja vendas
    const stockQuery = await prisma.product.findMany({
      where: { companyId },
      select: {
        stock: true,
        costPrice: true,
        salePrice: true,
      },
    });

    const stockValue = stockQuery.reduce(
      (acc, p) => acc + p.stock * p.costPrice,
      0
    );
    const stockProfitEstimate = stockQuery.reduce(
      (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
      0
    );
    const totalStockItems = stockQuery.reduce((acc, p) => acc + p.stock, 0);

    // Casting seguro dos resultados do Raw Query (retorna array de objs)
    const profitStats: any =
      Array.isArray(profitQuery) && profitQuery.length > 0
        ? profitQuery[0]
        : {};

    const response = NextResponse.json({
      dailyProfit: Number(profitStats.daily_profit || 0),
      weeklyProfit: Number(profitStats.weekly_profit || 0),
      monthlyProfit: Number(profitStats.monthly_profit || 0),
      stockValue: Number(stockValue || 0),
      stockProfitEstimate: Number(stockProfitEstimate || 0),
      totalStockItems: Number(totalStockItems || 0),
    });

    // Desabilitar cache
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Dashboard Final Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
