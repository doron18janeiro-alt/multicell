import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";

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
