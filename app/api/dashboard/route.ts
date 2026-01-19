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

    // 1. Busca TODAS as vendas (últimos 60 dias para garantir)
    const now = new Date();
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

    // --- Lógica de Janela de Tempo Numérica (Fuso SP) ---
    // Helper para converter qualquer data para o "Valor Facial" de SP
    // Ex: 15:00 UTC -> 12:00 SP. Retorna objeto Date com 12:00 UTC (para comparação numérica simples)
    const getSPTime = (dateInput: Date) => {
        return new Date(dateInput.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    };

    // Define Janela de Hoje em SP
    const nowSP = getSPTime(new Date());
    
    const inicioHoje = new Date(nowSP);
    inicioHoje.setHours(0, 0, 0, 0);
    
    const fimHoje = new Date(nowSP);
    fimHoje.setHours(23, 59, 59, 999);

    console.log('[DEBUG] Janela SP:', inicioHoje.toISOString(), 'até', fimHoje.toISOString());
    console.log('[DEBUG] Vendas encontradas no banco:', sales.length);

    // --- Filtro por Timestamp Numérico ---
    const vendasHoje = sales.filter((sale) => {
        const dataVenda = new Date(sale.createdAt);
        const dataVendaSP = getSPTime(dataVenda); // Converte venda para tempo SP
        
        const saleId = sale.id;
        // Check simples de range numérico
        const isInRange = dataVendaSP >= inicioHoje && dataVendaSP <= fimHoje;
        
        if (saleId === 22 || saleId === 20) {
             console.log('[TEMPO] Venda ID:', saleId, 'SP Time:', dataVendaSP.toISOString(), 'In Range:', isInRange);
        }
        
        return isInRange;
    });

    console.log('[DEBUG] Vendas de hoje identificadas:', vendasHoje.length);

    // --- Calculadora de Lucro (Blindada) ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (item.quantity * unitCost);
             }, 0);
             return acc + (revenue - cost);
        }, 0);
    }

    const dailyProfit = calculateProfit(vendasHoje);

    // --- Lucro Mensal (Baseado no Mês de SP) ---
    const currentMonth = nowSP.getMonth();
    const currentYear = nowSP.getFullYear();
    
    const vendasMes = sales.filter(s => {
        const sSP = getSPTime(new Date(s.createdAt));
        return sSP.getMonth() === currentMonth && sSP.getFullYear() === currentYear;
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

    const stockValue = stockQuery.reduce((acc, p) => acc + p.stock * Number(p.costPrice || 0), 0);
    const stockProfitEstimate = stockQuery.reduce((acc, p) => acc + p.stock * (Number(p.salePrice || 0) - Number(p.costPrice || 0)), 0);
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

    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
