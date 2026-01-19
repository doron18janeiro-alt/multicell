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

    // 1. Busca TODAS as vendas relevantes (ex: últimos 60 dias)
    const now = new Date();
    const startOfScope = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        createdAt: {
            gte: startOfScope 
        }
      },
      include: {
        items: {
          include: {
            product: true, 
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    // --- Data ISO Pura (Solicitada no Prompt) ---
    // Gera data no formato AAAA-MM-DD (ex: 2026-01-19) forçando fuso SP
    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    console.log('[DEBUG] Hoje em SP (ISO):', hojeISO);
    console.log('[DEBUG] Vendas encontradas no banco:', sales.length);

    // --- Filtros em Memória c/ ISO ---
    const vendasHoje = sales.filter((sale) => {
        const dataVendaISO = new Date(sale.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        return dataVendaISO === hojeISO;
    });

    console.log('[DEBUG] Vendas de hoje identificadas:', vendasHoje.length);

    // --- Calculadora de Lucro ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             // Garante numérico e usa || como fallback correto
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (item.quantity * unitCost);
             }, 0);
             
             return acc + (revenue - cost);
        }, 0);
    }

    const dailyProfit = calculateProfit(vendasHoje);

    // --- Lucro Mensal (ISO Prefix: YYYY-MM) ---
    const currentMonthPrefix = hojeISO.substring(0, 7); // 2026-01
    const vendasMes = sales.filter(s => {
        const dataVendaISO = new Date(s.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        return dataVendaISO.startsWith(currentMonthPrefix);
    });
    const monthlyProfit = calculateProfit(vendasMes);

    // --- Lucro Semanal (7 dias corridos) ---
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- 4. ESTOQUE ---
    const stockQuery = await prisma.product.findMany({
      where: { companyId },
      select: {stock: true, costPrice: true, salePrice: true},
    });

    const stockValue = stockQuery.reduce(
      (acc, p) => acc + p.stock * Number(p.costPrice || 0), // Fallback seguro
      0,
    );
    const stockProfitEstimate = stockQuery.reduce(
      (acc, p) => acc + p.stock * (Number(p.salePrice || 0) - Number(p.costPrice || 0)),
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
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
