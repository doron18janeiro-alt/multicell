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

    // Inicializa objeto de stats
    let stats: any = {};
    let rpcSuccess = false;

    // 1. Tenta buscar via RPC (Função otimizada do Banco)
    try {
      const result: any = await prisma.$queryRaw`
        SELECT * FROM get_realtime_management_stats(${companyId}::uuid)
      `;
      if (result && result.length > 0) {
        stats = result[0];
        // Verifica se veio campo válido
        if (stats.daily_profit !== undefined) {
          rpcSuccess = true;
        }
      }
    } catch (dbError) {
      console.warn(
        "RPC Error (get_realtime_management_stats), falling back to Prisma aggregation:",
        dbError
      );
    }

    // 2. FALLBACK COMPLETO: Se RPC falhou, calcula TUDO via Node.js
    // Isso garante que o dashboard NUNCA fique zerado por falta de procedure ou erro
    if (!rpcSuccess) {
      // console.log("Using TypeScript fallback for Dashboard calculations...");

      const timeZone = "America/Sao_Paulo";
      const now = new Date();
      const nowInSP = toZonedTime(now, timeZone);

      // Datas 'visuais' em SP
      const todaySP = startOfDay(nowInSP);
      const weekSP = startOfWeek(nowInSP); // Domingo default
      const monthSP = startOfMonth(nowInSP);

      // Converte para UTC para consultar o banco
      const todayUTC = fromZonedTime(todaySP, timeZone);
      const weekUTC = fromZonedTime(weekSP, timeZone);
      const monthUTC = fromZonedTime(monthSP, timeZone);

      // Busca Vendas do mês (que inclui semana e hoje) a partir da menor data necessária
      // Usamos timestamp numérico para Math.min
      const minTime = Math.min(weekUTC.getTime(), monthUTC.getTime());
      const queryDate = new Date(minTime);

      const sales = await prisma.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          createdAt: { gte: queryDate },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Helpers de filtro
      const isToday = (date: Date) => date >= todayUTC;
      const isWeek = (date: Date) => date >= weekUTC;
      const isMonth = (date: Date) => date >= monthUTC;

      const calculateProfit = (filteredSales: typeof sales) => {
        return filteredSales.reduce((acc, sale) => {
          const revenue = sale.netAmount ?? sale.total - (sale.feeAmount || 0);
          const cost = sale.items.reduce(
            (c, item) => c + (item.product?.costPrice || 0) * item.quantity,
            0
          );
          return acc + (revenue - cost);
        }, 0);
      };

      stats.daily_profit = calculateProfit(
        sales.filter((s) => isToday(s.createdAt))
      );
      stats.weekly_profit = calculateProfit(
        sales.filter((s) => isWeek(s.createdAt))
      );
      stats.monthly_profit = calculateProfit(
        sales.filter((s) => isMonth(s.createdAt))
      );

      // Busca Produtos para Estoque
      const products = await prisma.product.findMany({
        where: { companyId },
        select: { stock: true, costPrice: true, salePrice: true },
      });

      stats.stock_value = products.reduce(
        (acc, p) => acc + p.stock * p.costPrice,
        0
      );
      stats.stock_profit_estimate = products.reduce(
        (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
        0
      );
      stats.total_stock_items = products.reduce((acc, p) => acc + p.stock, 0);
    } else {
      // Correção específica para estoque zerado mesmo com RPC sucesso (caso raro onde RPC retorna nulls)
      if (!stats.stock_value || Number(stats.stock_value) === 0) {
        const products = await prisma.product.findMany({
          where: { companyId },
          select: { stock: true, costPrice: true, salePrice: true },
        });
        stats.stock_value = products.reduce(
          (acc, p) => acc + p.stock * p.costPrice,
          0
        );
        stats.stock_profit_estimate = products.reduce(
          (acc, p) => acc + p.stock * (p.salePrice - p.costPrice),
          0
        );
        stats.total_stock_items = products.reduce((acc, p) => acc + p.stock, 0);
      }
    }

    const response = NextResponse.json({
      dailyProfit: Number(stats.daily_profit || 0),
      weeklyProfit: Number(stats.weekly_profit || 0),
      monthlyProfit: Number(stats.monthly_profit || 0),
      stockValue: Number(stats.stock_value || 0),
      stockProfitEstimate: Number(stats.stock_profit_estimate || 0),
      totalStockItems: Number(stats.total_stock_items || 0),
    });

    // Desabilitar cache
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Dashboard Final Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
