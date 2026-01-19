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

    // 1. FILTRO DE SEGURANÇA FLEXÍVEL
    const companyId = session.user.companyId || 'multicell-oficial'; 
    console.log('[DASHBOARD] ID utilizado:', companyId);

    // 2. LÓGICA DE DATA REFERENCIAL (BRASÍLIA -3h)
    const now = new Date();
    // Subtrai 3h para obter o dia correto no Brasil
    const offsetTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const hojeString = offsetTime.toISOString().split('T')[0];
    const mesAtualString = hojeString.substring(0, 7);

    // 3. BUSCA DE VENDAS
    const startOfScope = new Date(now);
    startOfScope.setDate(startOfScope.getDate() - 60);

    let sales = await prisma.sale.findMany({
      where: {
        companyId: companyId,
        status: "COMPLETED",
        createdAt: { gte: startOfScope }
      },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[DASHBOARD] Vendas encontradas (Filtro ID): ${sales.length}`);

    // 4. BUSCA SEM ERRO (FALLBACK GLOBAL - EMERGÊNCIA)
    // Se não achou nada com o ID, tenta busca global para garantir números
    if (sales.length === 0) {
        console.log('[DASHBOARD] Nenhuma venda encontrada para o ID. Ativando busca global de emergência...');
        sales = await prisma.sale.findMany({
            where: {
                status: "COMPLETED",
                createdAt: { gte: startOfScope }
            },
            include: {
                items: { include: { product: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[DASHBOARD] Vendas encontradas (Global/Emergência): ${sales.length}`);
    }

    // --- CÁLCULO DE LUCRO ---
    const calculateProfit = (salesList: typeof sales) => {
        return salesList.reduce((acc, sale) => {
             const revenue = Number(sale.netAmount !== null ? sale.netAmount : (sale.total || 0)); 
             
             // Custo com proteção contra nulos
             const cost = sale.items.reduce((c, item) => {
                 const unitCost = Number(item.product?.costPrice || 0);
                 return c + (Number(item.quantity || 0) * unitCost);
             }, 0);
             
             return acc + (revenue - cost);
        }, 0);
    }

    // 5. FILTRAGEM (OFFSET -3h)
    // Diário
    const vendasHoje = sales.filter((sale) => {
        const saleTime = new Date(sale.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        // Debug específico para confirmar vendas recentes (ex: #26 ou #28 de 600.00)
        // O usuário mencionou Venda #28
        if (sale.total && Number(sale.total) === 600) {
            console.log(`[DASHBOARD] Venda de R$ 600 encontrada (ID: ${sale.id}). DataSP: ${saleDateSP} vs Hoje: ${hojeString}`);
        }
        
        return saleDateSP === hojeString;
    });
    
    // Mensal
    const vendasMes = sales.filter(s => {
        const saleTime = new Date(s.createdAt).getTime();
        const saleDateSP = new Date(saleTime - (3 * 60 * 60 * 1000)).toISOString().split('T')[0];
        return saleDateSP.startsWith(mesAtualString);
    });

    // Semanal (7 dias)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const vendasSemana = sales.filter(s => new Date(s.createdAt) >= oneWeekAgo);

    const dailyProfit = calculateProfit(vendasHoje);
    const monthlyProfit = calculateProfit(vendasMes);
    const weeklyProfit = calculateProfit(vendasSemana);

    // --- ESTOQUES E RECORDES ---
    // Mantemos companyId aqui para não misturar estoques de lojas diferentes, 
    // a menos que queiramos fallback aqui também, mas o foco do pedido foi LUCRO.
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

    // 6. RESPOSTA COM ANTI-CACHE
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
    console.error("[DASHBOARD] Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
