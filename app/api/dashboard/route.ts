import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const timeZone = "America/Sao_Paulo";

    // Data atual no fuso horário correto
    const now = new Date();

    // Definir intervalos de tempo ajustados para o fuso horário
    // Usamos uma aproximação segura gerando strings ISO baseadas no locale
    const getSafeDate = (d: Date) =>
      new Date(d.toLocaleString("en-US", { timeZone }));

    const nowSP = getSafeDate(now);

    // Helpers para datas (zerando horas para comparar >=)
    const getStartOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay(); // 0 (Sun) to 6 (Sat)
      // Domingo (0) é o começo da semana
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const getStartOfMonth = (date: Date) => {
      const d = new Date(date);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const todayStart = getStartOfDay(nowSP);
    const weekStart = getStartOfWeek(nowSP);
    const monthStart = getStartOfMonth(nowSP);

    // 1. Buscar Vendas (Hoje, Semana, Mês)
    // Para otimizar, busamos todas do mês (que inclui semana e hoje)
    // Se hoje for dia 1, weekStart pode ser do mês anterior, então pegamos o menor range.
    const queryStartDate = new Date(
      Math.min(weekStart.getTime(), monthStart.getTime())
    );

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

    // Filtros em memória
    const salesToday = sales.filter((s) => new Date(s.createdAt) >= todayStart);
    const salesWeek = sales.filter((s) => new Date(s.createdAt) >= weekStart);
    const salesMonth = sales.filter((s) => new Date(s.createdAt) >= monthStart);

    // Função de Cálculo de Lucro Real
    // Lucro = (Venda Líquida) - (Custo dos Produtos)
    const calculateProfit = (salesData: typeof sales) => {
      return salesData.reduce((totalProfit, sale) => {
        // Receita Líquida: O valor que entrou no caixa.
        // Se netAmount existir, usa ele. Se não, usa (Total - Taxas).
        const revenue = sale.netAmount ?? sale.total - (sale.feeAmount || 0);

        // Custo dos Produtos (CMV)
        const cost = sale.items.reduce((totalCost, item) => {
          // Preço de Custo
          const unitCost = item.product?.costPrice || 0;
          return totalCost + unitCost * item.quantity;
        }, 0);

        return totalProfit + (revenue - cost);
      }, 0);
    };

    const dailyProfit = calculateProfit(salesToday);
    const weeklyProfit = calculateProfit(salesWeek);
    const monthlyProfit = calculateProfit(salesMonth);

    // 2. Buscar Dados de Estoque
    const products = await prisma.product.findMany({
      where: {
        companyId,
      },
      select: {
        stock: true,
        costPrice: true,
        salePrice: true,
      },
    });

    // Valor Atual de Estoque: Soma total de (Estoque * Preço de Custo)
    const stockValue = products.reduce(
      (acc, p) => acc + p.stock * p.costPrice,
      0
    );

    // Lucro Estimado de Estoque: Soma de (Estoque * (Preço Venda - Preço Custo))
    const stockProfitEstimate = products.reduce((acc, p) => {
      const estimatedProfitPerUnit = p.salePrice - p.costPrice;
      return acc + p.stock * estimatedProfitPerUnit;
    }, 0);

    // Total de Itens no Estoque
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
