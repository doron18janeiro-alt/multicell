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

    const sessionCompanyId = session.user.companyId;
    console.log('[FATAL DIAGNOSTIC] User CompanyId:', sessionCompanyId);

    // --- BUSCA BRUTA (IGNORANDO COMPANY ID) ---
    // REMOVIDO where: { companyId } para testar visibilidade global
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED"
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limite de 50 para não floodar
    });

    console.log(`[FATAL DIAGNOSTIC] Prisma encontrou ${sales.length} vendas no total (sem filtro de empresa).`);

    let bruteForceProfit = 0;
    
    sales.forEach(s => {
        const total = Number(s.total || 0);
        
        // Comparação de IDs
        const isSameCompany = s.companyId === sessionCompanyId;
        
        // Tenta calcular custo
        const cost = s.items.reduce((acc, i) => {
            return acc + (Number(i.quantity || 0) * Number(i.product?.costPrice || 0));
        }, 0);

        const profit = total - cost;
        
        // Só soma no total bruto se for da mesma empresa OU se quisermos ver TUDO (o prompt pede "ignorar filtros", mas vou somar tudo para garantir que o valor apareça)
        // O usuário disse: "Se o lucro aparecer, saberemos que o problema é o ID da empresa."
        // Então vou somar TUDO.
        bruteForceProfit += profit;

        console.log(`[FATAL] Venda ID: ${s.id} | CompanyId: ${s.companyId} (Match? ${isSameCompany}) | Total: ${total} | Lucro Calc: ${profit}`);
    });

    console.log(`[RESUMO BRUTO] Total Somado: ${bruteForceProfit}`);

    // --- MANTER OUTROS DADOS MÍNIMOS ---
    // O resto segue filtrado para não quebrar a UI
    const stockQuery = await prisma.product.findMany({
        where: { companyId: sessionCompanyId },
        select: { stock: true, costPrice: true }
    });
    const stockValue = stockQuery.reduce((acc, p) => acc + (p.stock * Number(p.costPrice || 0)), 0);

    const response = NextResponse.json({
      dailyProfit: 0, 
      weeklyProfit: 0, 
      monthlyProfit: bruteForceProfit, // VALOR DE PROVA (Soma de tudo que achou)
      stockValue: Number(stockValue),
      stockProfitEstimate: 0,
      totalStockItems: stockQuery.reduce((acc, p) => acc + p.stock, 0),
      highestValue: 0,
      lowestValue: 0,
    });
    
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    console.error("[FATAL ERROR]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
