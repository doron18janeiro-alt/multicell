import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const timeZone = "America/Sao_Paulo";
    
    // 1. Determinar o intervalo de tempo correto (Hoje, Semana, Mês) em UTC
    // Baseado no fuso horário do Brasil
    const now = new Date();
    // Converte UTC real para o tempo "visual" em SP (ex: se é 12:00 UTC, vira 09:00 no obj Date)
    const nowInSP = toZonedTime(now, timeZone);

    const startOfDaySP = startOfDay(nowInSP);
    const startOfWeekSP = startOfWeek(nowInSP); // Domingo como início
    const startOfMonthSP = startOfMonth(nowInSP);

    // Converter de volta para UTC REAL para consultar o banco de dados
    // Isso garante que 00:00 em SP seja convertido para 03:00 UTC (ou o que for correto no dia)
    const startOfDayUTC = fromZonedTime(startOfDaySP, timeZone);
    const startOfWeekUTC = fromZonedTime(startOfWeekSP, timeZone);
    const startOfMonthUTC = fromZonedTime(startOfMonthSP, timeZone);

    // 2. Buscar vendas a partir do início do mês (abrange semana e dia)
    // Usamos o início do mês como base para query de banco (performance)
    // Nota: Se a semana começar no mês anterior (ex: dia 30), precisamos pegar o menor
    const queryStartDate = new Date(Math.min(startOfWeekUTC.getTime(), startOfMonthUTC.getTime()));

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        createdAt: {
          gte: queryStartDate,
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

    // 3. Filtrar em memória e Calcular Lucros
    
    // Filtros
    const salesToday = sales.filter(s => new Date(s.createdAt) >= startOfDayUTC);
    const salesWeek = sales.filter(s => new Date(s.createdAt) >= startOfWeekUTC);
    const salesMonth = sales.filter(s => new Date(s.createdAt) >= startOfMonthUTC);

    // Lógica de Cálculo de Lucro Real
    // Lucro = (Venda.Net - Custo) || (Venda.Total - Taxas - Custo)
    const calculateProfit = (salesData: typeof sales) => {
      return salesData.reduce((totalProfit, sale) => {
        // Receita Líquida
        const revenue = sale.netAmount ?? (sale.total - (sale.feeAmount || 0));

        // Custo dos Produtos (CMV)
        const cost = sale.items.reduce((totalCost, item) => {
          const unitCost = item.product?.costPrice || 0;
          return totalCost + (unitCost * item.quantity);
        }, 0);

        return totalProfit + (revenue - cost);
      }, 0);
    };

    const dailyProfit = calculateProfit(salesToday);
    const weeklyProfit = calculateProfit(salesWeek);
    const monthlyProfit = calculateProfit(salesMonth);

    // 4. Métricas de Estoque
    const products = await prisma.product.findMany({
      where: { companyId },
      select: {
        stock: true,
        costPrice: true,
        salePrice: true,
      }
    });

    const stockValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
    
    // Lucro Estimado: (Preço Venda - Preço Custo) * Estoque
    const stockProfitEstimate = products.reduce((acc, p) => {
      const margin = p.salePrice - p.costPrice;
      return acc + (p.stock * margin);
    }, 0);

    const totalStockItems = products.reduce((acc, p) => acc + p.stock, 0);

    return NextResponse.json({
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
      stockValue,
      stockProfitEstimate,
      totalStockItems,
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
