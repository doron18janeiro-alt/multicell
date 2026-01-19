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
    
    // --- Log de Sessão (Solicitado) ---
    console.log('[DASHBOARD] ID na Sessão do Usuário:', session.user.companyId);

    // --- Remoção de Filtro Restritivo (Teste de Visibilidade) ---
    // Buscando SEM o companyId para ver se as vendas existem no banco sob qualquer ID
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED"
        // companyId: companyId // REMOVIDO TEMPORARIAMENTE
      },
      include: {
        items: {
          include: {
            product: true, 
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    console.log(`[DASHBOARD] Vendas encontradas (Global/Sem Filtro): ${sales.length}`);

    let totalBruteProfit = 0;
    
    // Loop de Cálculo
    sales.forEach(s => {
        // Receita
        const revenue = Number(s.netAmount !== null ? s.netAmount : (s.total || 0));
        
        // Custo
        const cost = s.items.reduce((acc, i) => {
             return acc + (Number(i.quantity || 0) * Number(i.product?.costPrice || 0));
        }, 0);

        const profit = revenue - cost;

        // --- Cálculo Bruto de Teste ---
        // Soma TUDO para provar que a Venda #25 existe
        totalBruteProfit += profit;

        // Log para Venda #25
        if (s.id === 25) {
            console.log(`[VENDA #25] DETECTADA! ID Sessão: ${companyId} | ID Venda: ${s.companyId} | Valor: ${revenue} | Lucro: ${profit}`);
        }
    });

    // --- Estoques (Mantendo filtro para garantir integridade visual parcial) ---
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
      dailyProfit: 0, // Ignorando daily por enquanto, foco no teste de visibilidade
      weeklyProfit: 0, 
      monthlyProfit: totalBruteProfit, // TESTE DE FORÇA BRUTA AQUI
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
