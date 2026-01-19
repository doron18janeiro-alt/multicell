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

    // --- 1. Preparação da Janela de Tempo (Fuso SP) - Lógica Infalível ---
    // Cria datas onde o valor interno reflete o horário de Brasília
    const now = new Date();
    
    // Converte 'agora' para o horário "facial" de SP
    // Ex: se for 15:00 UTC (12:00 SP), 'nowSP' será uma Date representando 12:00
    const nowSP = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    const inicioHoje = new Date(nowSP);
    inicioHoje.setHours(0, 0, 0, 0); // 00:00:00.000 (SP)
    
    const fimHoje = new Date(nowSP);
    fimHoje.setHours(23, 59, 59, 999); // 23:59:59.999 (SP)

    console.log('[DEBUG] Janela SP Definida:', inicioHoje.toISOString(), 'até', fimHoje.toISOString());

    // 2. Busca Vendas (Scope amplo para garantir)
    // Busca vendas dos últimos 60 dias para memória
    const startOfScope = new Date(now);
    startOfScope.setDate(startOfScope.getDate() - 60);

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

    console.log('[DEBUG] Total de vendas trazidas do banco:', sales.length);

    // --- 3. Filtragem "Maçã com Maçã" ---
    const vendasHoje = sales.filter((sale) => {
        // Converte a data da venda para o mesmo referencial (SP)
        const saleDateUTC = new Date(sale.createdAt);
        const saleDateSP = new Date(saleDateUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        
        // Comparação Numérica Simples
        const isToday = saleDateSP >= inicioHoje && saleDateSP <= fimHoje;
        
        // Log para Venda #22 (Xiaomi G 85)
        if (sale.id === 22 || sale.id === 20 || sale.id === 21) {
            console.log(`[DEBUG] Venda #${sale.id} (${sale.total}) - Data SP: ${saleDateSP.toISOString()} - É Hoje? ${isToday}`);
        }
        
        return isToday;
    });

    console.log('[DEBUG] Vendas contabilizadas hoje:', vendasHoje.length);

    // --- 4. Cálculo de Lucro (Blindado) ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             // Receita: Prioriza netAmount, falha para total, falha para 0. Converte para Number.
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             
             // Custo: Soma custo dos itens
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (item.quantity * unitCost);
             }, 0);
             
             return acc + (revenue - cost);
        }, 0);
    }

    const dailyProfit = calculateProfit(vendasHoje);

    // --- Lucro Mensal (Mesmo Mês/Ano de SP) ---
    const currentMonth = nowSP.getMonth();
    const currentYear = nowSP.getFullYear();
    const vendasMes = sales.filter(s => {
        const sDateSP = new Date(new Date(s.createdAt).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        return sDateSP.getMonth() === currentMonth && sDateSP.getFullYear() === currentYear;
    });
    const monthlyProfit = calculateProfit(vendasMes);

    // --- Lucro Semanal (7 dias corridos) ---
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- 5. Estoques e Recordes ---
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

    // Header Anti-Cache Vercel
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
