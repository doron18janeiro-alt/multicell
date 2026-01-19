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

    // --- Nova Lógica Simplificada e Robusta (Solicitada no Prompt) ---
    // 1. Busca TODAS as vendas relevantes (ex: últimos 60 dias)
    // Isso evita dependência de funções de data do banco que podem falhar com fuso
    const now = new Date();
    // Pega do início do mês passado para garantir margem
    const startOfScope = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        createdAt: {
          gte: startOfScope,
        },
      },
      include: {
        items: {
          include: {
            product: true, // Necessário para pegar o costPrice
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // --- Data ISO Reference (Correção solicitada) ---
    const todayISO = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    console.log("[DEBUG] Hoje em SP (ISO):", todayISO);
    console.log("[DEBUG] Vendas carregadas (scope):", sales.length);

    // --- Filtros em Memória c/ ISO ---
    const vendasHoje = sales.filter((sale) => {
      const saleDateISO = new Date(sale.createdAt).toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });

      // Debug específico para Venda #20 (se existir)
      if (sale.id === 20) {
        console.log(
          "[DEBUG] Venda ID #20 casou com hoje?",
          saleDateISO === todayISO,
          `(${saleDateISO} vs ${todayISO})`,
        );
      }

      return saleDateISO === todayISO;
    });

    console.log("[DEBUG] Total Vendas Hoje (filtrado):", vendasHoje.length);

    // --- Helpers de Cálculo Seguro ---
    const calculateProfit = (salesList: typeof sales) => {
      return salesList.reduce((acc, sale) => {
        // Garante numérico
        const revenue = Number(
          sale.netAmount !== null ? sale.netAmount : sale.total || 0,
        );

        const cost = sale.items.reduce((c, item) => {
          const unitCost = Number(item.product?.costPrice || 0);
          return c + item.quantity * unitCost;
        }, 0);

        return acc + (revenue - cost);
      }, 0);
    };

    const dailyProfit = calculateProfit(vendasHoje);

    // --- Lucro Mensal (Month Prefix from ISO: YYYY-MM) ---
    const currentMonthPrefix = todayISO.substring(0, 7); // 2026-01
    const vendasMes = sales.filter((s) => {
      const saleDateISO = new Date(s.createdAt).toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      return saleDateISO.startsWith(currentMonthPrefix);
    });
    const monthlyProfit = calculateProfit(vendasMes);

    // --- Lucro Semanal (7 dias corridos - Mantendo lógica simples de timestamp) ---
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(
      (s) => new Date(s.createdAt) >= oneWeekAgo,
    );
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- 4. ESTOQUE ---
    const stockQuery = await prisma.product.findMany({
      where: { companyId },
      select: { stock: true, costPrice: true, salePrice: true },
    });

    const stockValue = stockQuery.reduce(
      (acc, p) => acc + p.stock * Number(p.costPrice || 0),
      0,
    );
    const stockProfitEstimate = stockQuery.reduce(
      (acc, p) =>
        acc + p.stock * (Number(p.salePrice || 0) - Number(p.costPrice || 0)),
      0,
    );
    const totalStockItems = stockQuery.reduce((acc, p) => acc + p.stock, 0);

    // --- 5. RECORDES ---
    const recordsQuery = await prisma.dailyClosing.aggregate({
      _max: { totalNet: true },
      _min: { totalNet: true },
      where: { companyId, status: "CLOSED" },
    });

    const response = NextResponse.json({
      dailyProfit: dailyProfit || 0,
      weeklyProfit: weeklyProfit || 0,
      monthlyProfit: monthlyProfit || 0,
      stockValue: Number(stockValue || 0),
      stockProfitEstimate: Number(stockProfitEstimate || 0),
      totalStockItems: Number(totalStockItems || 0),
      highestValue: Number(recordsQuery._max.totalNet || 0),
      lowestValue: Number(recordsQuery._min.totalNet || 0),
    });

    // Header para evitar cache Vercel
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
