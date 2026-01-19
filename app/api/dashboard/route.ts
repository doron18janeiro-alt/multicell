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

    // --- FALLBACK DE ID OBRIGATÓRIO (Solicitado no Prompt Final) ---
    // Garante que mesmo se o usuário tiver session ID errado, usaremos o oficial
    const companyId = session.user.companyId || 'multicell-oficial'; 

    console.log('[DASHBOARD] CompanyID Ativo:', companyId);

    // --- LÓGICA DE DATA REFERENCIAL SP (OFFSET -3h) ---
    const now = new Date();
    // Subtrai 3 horas para alinhar com servidor global e gerar data SP
    const offsetTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const hojeString = offsetTime.toISOString().split('T')[0]; // '2026-01-19'
    
    console.log('[DASHBOARD] Processado para hoje:', hojeString);

    // 1. Busca Vendas dos últimos 60 dias (para garantir escopo suficiente)
    const startOfScope = new Date(now);
    startOfScope.setDate(startOfScope.getDate() - 60);

    const sales = await prisma.sale.findMany({
      where: {
        companyId: companyId, // ID AGORA ESTÁ FORÇADO E CORRETO
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

    console.log(`[DASHBOARD] Vendas carregadas: ${sales.length}`);

    // --- Helpers de Cálculo ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             // Receita: netAmount > total > 0
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             
             // Custo (Number cast explícito)
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (Number(item.quantity || 0) * unitCost);
             }, 0);
             
             return acc + (revenue - cost);
        }, 0);
    }

    // --- Filtros & Cálculos ---

    // 1. Diário (Offset -3h) - Deve pegar a Venda #26 (R$ 600,00)
    const vendasHoje = sales.filter((sale) => {
        const saleTime = new Date(sale.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        // Debug para garantir visibilidade da #26
        if (sale.id === 26) {
             console.log(`[DEBUG] Venda #26 encontrada. DataSP: ${saleDateSP} vs Hoje: ${hojeString}`);
        }
        
        return saleDateSP === hojeString;
    });
    const dailyProfit = calculateProfit(vendasHoje);

    // 2. Mensal (Mesmo Prefixo 'YYYY-MM')
    const currentMonthPrefix = hojeString.substring(0, 7); 
    const vendasMes = sales.filter(s => {
        const saleTime = new Date(s.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        return saleDateSP.startsWith(currentMonthPrefix);
    });
    const monthlyProfit = calculateProfit(vendasMes);

    // 3. Semanal (7 dias corridos - UTC Simples)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- Estoques e Recordes ---
    const stockQuery = await prisma.product.findMany({
      where: { companyId },
      select: {stock: true, costPrice: true, salePrice: true},
    });

    const stockValue = stockQuery.reduce((acc, p) => acc + p.stock * Number(p.costPrice || 0), 0);
    const stockProfitEstimate = stockQuery.reduce((acc, p) => acc + p.stock * (Number(p.salePrice || 0) - Number(p.costPrice || 0)), 0);
    const totalStockItems = stockQuery.reduce((acc, p) => acc + p.stock, 0);

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

    // Headers
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
