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

    // --- 1. CONFIGURAÇÃO DE DATAS E FUSO (America/Sao_Paulo) ---
    // Usamos JS puro para garantir comparação precisa com o horário local
    const now = new Date();

    // Configura o formatador de data para o fuso correto
    const timeZone = "America/Sao_Paulo";

    // Função auxiliar para obter objeto Date representando o inicio do dia em SP
    const getStartOfDaySP = (date: Date) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(date);

      const year = parseInt(parts.find((p) => p.type === "year")!.value);
      const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
      const day = parseInt(parts.find((p) => p.type === "day")!.value);

      return new Date(year, month, day); // Retorna data 'local' (00:00) correspondente a SP
    };

    const todaySP = getStartOfDaySP(now);

    // Calcula inicio da semana (Domingo)
    const startOfWeekSP = new Date(todaySP);
    startOfWeekSP.setDate(todaySP.getDate() - todaySP.getDay());

    // Calcula inicio do mês
    const startOfMonthSP = new Date(
      todaySP.getFullYear(),
      todaySP.getMonth(),
      1,
    );

    // --- 2. BUSCA DE DADOS (PRISMA NATIVE) ---
    // Buscamos um range seguro (últimos 45 dias) para filtrar em memória
    // Isso evita problemas complexos de Timezone no Banco de Dados
    const queryDate = new Date(startOfMonthSP);
    queryDate.setDate(queryDate.getDate() - 10); // Buffer de segurança

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        createdAt: {
          gte: queryDate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // --- 3. PROCESSAMENTO EM MEMÓRIA ---
    let dailyProfit = 0;
    let weeklyProfit = 0;
    let monthlyProfit = 0;

    for (const sale of sales) {
      // Converte a data da venda (UTC) para a data 'local' de SP
      const saleDateSP = getStartOfDaySP(new Date(sale.createdAt));

      // Cálculo de Lucro da Venda
      // Lucro = (Net Amount OU Total - Taxas) - Custo dos Produtos
      const revenue = sale.netAmount ?? sale.total - (sale.feeAmount ?? 0);

      // Custo total dos itens da venda
      const cost = sale.items.reduce((acc, item) => {
        // Usa custo atual se não houver histórico (simplificação comum)
        const unitCost = item.product?.costPrice ?? 0;
        return acc + item.quantity * unitCost;
      }, 0);

      const profit = revenue - cost;

      // Comparação de Datas (ignorando horas)
      // Dia
      if (saleDateSP.getTime() === todaySP.getTime()) {
        dailyProfit += profit;
      }
      // Semana
      if (saleDateSP >= startOfWeekSP) {
        weeklyProfit += profit;
      }
      // Mês
      if (saleDateSP >= startOfMonthSP) {
        monthlyProfit += profit;
      }
    }

    // --- 4. ESTOQUE (Mantido) ---
    const stockQuery = await prisma.product.findMany({
      where: { companyId },
      select: {
        stock: true,
        costPrice: true,
        salePrice: true,
      },
    });

    const stockValue = stockQuery.reduce(
      (acc, p) => acc + p.stock * p.costPrice,
      0,
    );
    const stockProfitEstimate = stockQuery.reduce(
      (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
      0,
    );
    const totalStockItems = stockQuery.reduce((acc, p) => acc + p.stock, 0);

    // --- 5. RECORDES (Para Prevenir NaN) ---
    const recordsQuery = await prisma.dailyClosing.aggregate({
      _max: { totalNet: true },
      _min: { totalNet: true },
      where: { companyId, status: "CLOSED" },
    });

    return NextResponse.json({
      dailyProfit, // Valor calculado em JS
      weeklyProfit,
      monthlyProfit,
      stockValue,
      stockProfitEstimate,
      totalStockItems,
      highestValue: recordsQuery._max.totalNet || 0,
      lowestValue: recordsQuery._min.totalNet || 0,
    });
  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
