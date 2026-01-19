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

    // --- 1. CONFIGURAÇÃO DE DATAS E FUSO (Abordagem SQL Puro / "Ultra-Resiliente") ---
    // Abandonamos o new Date() do JS para evitar diferenças entre Vercel (UTC) e Brasil.
    // Deixamos o PostgreSQL resolver "Hoje em SP".

    const profitQuery = await prisma.$queryRaw`
      SELECT 
        -- Lucro Diário (Hoje em SP)
        COALESCE(SUM(
          CASE 
            WHEN (s.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
            THEN (
              -- Receita Líquida (Total - Taxas)
              (s.total - COALESCE(s.fee_amount, 0)) - 
              -- Custo dos Produtos (Subquery)
              (
                SELECT COALESCE(SUM(si.quantity * p.cost_price), 0)
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = s.id
              )
            )
            ELSE 0 
          END
        ), 0) as daily_profit,

        -- Lucro Semanal (Semana Atual em SP)
        COALESCE(SUM(
          CASE 
            WHEN (s.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date >= date_trunc('week', CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
            THEN (
              (s.total - COALESCE(s.fee_amount, 0)) - 
              (SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = s.id)
            )
            ELSE 0 
          END
        ), 0) as weekly_profit,

        -- Lucro Mensal (Mês Atual em SP)
        COALESCE(SUM(
          CASE 
            WHEN (s.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
            THEN (
              (s.total - COALESCE(s.fee_amount, 0)) - 
              (SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = s.id)
            )
            ELSE 0 
          END
        ), 0) as monthly_profit

      FROM sales s
      WHERE s.company_id = ${companyId}
        AND s.status = 'COMPLETED'
    `;

    // --- 4. ESTOQUE (Mantido) ---
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
      0,
    );
    const stockProfitEstimate = stockQuery.reduce(
      (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
      0,
    );
    const totalStockItems = stockQuery.reduce((acc, p) => acc + p.stock, 0);

    // --- 5. RECORDES (Para Prevenir NaN) ---
    const recordsQuery = await prisma.dailyClosing.aggregate({
      _max: { totalNet: true },
      _min: { totalNet: true },
      where: { companyId, status: "CLOSED" },
    });

    // Casting seguro dos resultados do Raw Query
    const profitStats: any =
      Array.isArray(profitQuery) && profitQuery.length > 0
        ? profitQuery[0]
        : {};

    return NextResponse.json({
      dailyProfit: Number(profitStats.daily_profit || 0),
      weeklyProfit: Number(profitStats.weekly_profit || 0),
      monthlyProfit: Number(profitStats.monthly_profit || 0),
      stockValue: Number(stockValue || 0),
      stockProfitEstimate: Number(stockProfitEstimate || 0),
      totalStockItems: Number(totalStockItems || 0),
      highestValue: Number(recordsQuery._max.totalNet || 0),
      lowestValue: Number(recordsQuery._min.totalNet || 0),
    });
  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
