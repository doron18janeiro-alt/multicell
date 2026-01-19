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
    
    // --- LÓGICA MATEMÁTICA DE OFFSET (-3h) ---
    // Solução para evitar erros de parser de data no servidor Vercel
    const now = new Date();
    // Subtrai 3 horas (em milissegundos) do tempo UTC atual para simular SP
    const spTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const hojeString = spTime.toISOString().split('T')[0]; // Gera 'YYYY-MM-DD' baseada em SP

    console.log('[DEBUG] Agora UTC:', now.toISOString());
    console.log('[DEBUG] Hoje SP (Offset -3h):', hojeString);

    // 1. Busca Vendas dos últimos 60 dias (para garantir)
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

    console.log('[DEBUG] Vendas encontradas no banco:', sales.length);

    // --- Filtros (Offset -3h) ---
    const vendasHoje = sales.filter((sale) => {
        // Aplica o mesmo offset na data de criação da venda
        const saleTime = new Date(sale.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        const isToday = saleDateSP === hojeString;
        
        // Debug para vendas recentes
        if (sale.id >= 20) {
            console.log(`[DEBUG] Venda #${sale.id} (${sale.total}) -> DataSP: ${saleDateSP} vs Hoje: ${hojeString} -> ${isToday}`);
        }
        
        return isToday;
    });

    // --- Calculadora de Lucro ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             // Receita: netAmount > total > 0
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             
             // Custo
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (item.quantity * unitCost);
             }, 0);
             
             return acc + (revenue - cost);
        }, 0);
    }

    const dailyProfit = calculateProfit(vendasHoje);

    // --- Lucro Mensal (Offset -3h) ---
    const currentMonthPrefix = hojeString.substring(0, 7); // 'YYYY-MM'
    const vendasMes = sales.filter(s => {
        const saleTime = new Date(s.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        return saleDateSP.startsWith(currentMonthPrefix);
    });
    const monthlyProfit = calculateProfit(vendasMes);

    // --- Lucro Semanal (7 dias corridos - UTC Simples) ---
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- Estoques e Recordes (Sem alteração) ---
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
