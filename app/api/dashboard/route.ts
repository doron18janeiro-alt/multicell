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
    console.log('[DASHBOARD] Buscando para CompanyId:', companyId);

    // --- BUSCA TOTAL (SEM FILTRO DE DATA POR ENQUANTO) PARA DIAGNÓSTICO ---
    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED"
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

    console.log(`[DASHBOARD] Encontradas ${sales.length} vendas COMPLETED no total.`);

    let totalDiagnosticProfit = 0; // Vai para 'monthlyProfit' temporariamente
    let dailyProfit = 0;

    // Lógica de Data Hoje SP (Offset -3h)
    const now = new Date();
    const spTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const hojeString = spTime.toISOString().split('T')[0];
    console.log('[DEBUG] Hoje SP (Offset -3h):', hojeString);

    // LOOP DE DIAGNÓSTICO
    sales.forEach(s => {
         const rev = Number(s.netAmount !== null ? s.netAmount : (s.total || 0));
         
         const cost = s.items.reduce((acc, i) => {
             const qtd = Number(i.quantity || 0);
             const unitCost = Number(i.product?.costPrice || 0);
             return acc + (qtd * unitCost);
         }, 0);
         
         const profit = rev - cost;
         totalDiagnosticProfit += profit; // Soma TUDO que existir

         // Verifica se é hoje
         const saleTime = new Date(s.createdAt).getTime();
         const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];

         // Log detalhado para identificar as vendas
         if (s.id >= 20 || saleDateSP === hojeString) {
             console.log(`[VENDA #${s.id}] Data: ${saleDateSP} | Receita: ${rev} | Custo: ${cost} | Lucro: ${profit} (É Hoje? ${saleDateSP === hojeString})`);
         }

         if (saleDateSP === hojeString) {
             dailyProfit += profit;
         }
    });

    console.log(`[RESUMO] Lucro Hoje: ${dailyProfit} | Lucro Total (Diagnóstico): ${totalDiagnosticProfit}`);

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
      dailyProfit: dailyProfit,
      weeklyProfit: 0, 
      monthlyProfit: totalDiagnosticProfit, // RETORNA O TOTAL GERAL PARA PROVAR QUE EXISTE VALOR
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
