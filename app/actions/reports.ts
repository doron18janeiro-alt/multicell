"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface ReportMetrics {
  period: {
    startDate: string;
    endDate: string;
    month: string;
  };
  financials: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    marginPercent: number;
    operatingProfit: number;
    shopExpensesPaid: number;
    personalExpensesPaid: number;
  };
  ticketMetrics: {
    averageTicket: number;
    totalTransactions: number;
    topProductCategory: string;
  };
  performance: {
    bestDay: { date: string; revenue: number };
    worstDay: { date: string; revenue: number };
    dailyAverage: number;
  };
  teamPerformance: Array<{
    sellerId: string;
    sellerName: string;
    role: string;
    commissionRate: number;
    totalSales: number;
    commissionToPay: number;
    salesCount: number;
    averageTicket: number;
    progressPercent: number;
    revenueSharePercent: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  serviceVsProducts: {
    serviceRevenue: number;
    productRevenue: number;
    serviceProfit: number;
    productProfit: number;
  };
  categoryRanking: Array<{
    category: string;
    revenue: number;
    profit: number;
    quantity: number;
  }>;
}

const BRAZIL_TZ = "America/Sao_Paulo";

const getBrazilDateString = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const toBrazilRange = (startDate: string, endDate: string) => ({
  start: new Date(`${startDate}T00:00:00.000-03:00`),
  end: new Date(`${endDate}T23:59:59.999-03:00`),
});

const resolveDateRange = (startDate?: string, endDate?: string) => {
  const today = getBrazilDateString(new Date());
  const currentMonth = today.slice(0, 7);

  let startDateString = startDate || `${currentMonth}-01`;
  let endDateString = endDate || today;

  if (startDateString > endDateString) {
    [startDateString, endDateString] = [endDateString, startDateString];
  }

  const { start, end } = toBrazilRange(startDateString, endDateString);

  return {
    start,
    end,
    startDate: startDateString,
    endDate: endDateString,
    month: startDateString.slice(0, 7),
  };
};

const normalizePaymentMethod = (
  paymentMethod: string | null,
  cardType: string | null,
) => {
  const method = (paymentMethod || "").toUpperCase();
  const card = (cardType || "").toUpperCase();

  if (
    method === "CARTAO" ||
    method === "CARTÃO" ||
    method === "CARD" ||
    method.includes("CARTAO")
  ) {
    return card === "DEBITO" || card === "DÉBITO" ? "DÉBITO" : "CRÉDITO";
  }

  if (method === "DEBITO" || method === "DÉBITO" || method === "DEBITCARD") {
    return "DÉBITO";
  }

  if (
    method === "CREDITO" ||
    method === "CRÉDITO" ||
    method === "CREDITCARD"
  ) {
    return "CRÉDITO";
  }

  if (method === "PIX") return "PIX";
  if (method === "DINHEIRO" || method === "CASH") return "DINHEIRO";

  return paymentMethod || "Não informado";
};

export async function getReportMetrics(
  startDate?: string,
  endDate?: string,
): Promise<ReportMetrics> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const [
      sales,
      serviceOrders,
      soldItems,
      paymentMethodsRaw,
      paidExpenses,
      sellers,
    ] =
      await Promise.all([
        prisma.sale.findMany({
          where: {
            companyId,
            status: "COMPLETED",
            createdAt: { gte: range.start, lte: range.end },
          },
          include: {
            items: {
              include: { product: true },
            },
            seller: {
              select: {
                id: true,
                fullName: true,
                name: true,
                role: true,
                commissionRate: true,
              },
            },
          },
        }),
        prisma.serviceOrder.findMany({
          where: {
            companyId,
            status: "FINALIZADO",
            createdAt: { gte: range.start, lte: range.end },
          },
        }),
        prisma.saleItem.findMany({
          where: {
            sale: {
              companyId,
              status: "COMPLETED",
              createdAt: { gte: range.start, lte: range.end },
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                costPrice: true,
              },
            },
          },
        }),
        prisma.sale.groupBy({
          by: ["paymentMethod", "cardType"],
          where: {
            companyId,
            status: "COMPLETED",
            createdAt: { gte: range.start, lte: range.end },
          },
          _count: true,
          _sum: { netAmount: true, total: true },
        }),
        prisma.expense.findMany({
          where: {
            companyId,
            status: "PAID",
            paidAt: {
              gte: range.start,
              lte: range.end,
            },
          },
          select: {
            amount: true,
            type: true,
          },
        }),
        prisma.user.findMany({
          where: {
            companyId,
          },
          select: {
            id: true,
            fullName: true,
            name: true,
            role: true,
            commissionRate: true,
          },
        }),
      ]);

    let totalRevenue = 0;
    let totalCost = 0;
    let operatingProfit = 0;

    sales.forEach((sale) => {
      const revenue = Number(sale.netAmount ?? sale.total ?? 0);
      const cost = sale.items.reduce((acc, item) => {
        const unitCost = Number(item.product?.costPrice || 0);
        return acc + Number(item.quantity || 0) * unitCost;
      }, 0);

      totalRevenue += revenue;
      totalCost += cost;
      operatingProfit += revenue - cost;
    });

    serviceOrders.forEach((os) => {
      const revenue = Number(os.totalPrice || 0);
      const cost = Number(os.costPrice || 0);

      totalRevenue += revenue;
      totalCost += cost;
      operatingProfit += revenue - cost;
    });

    const shopExpensesPaid = paidExpenses.reduce((acc, expense) => {
      if (expense.type !== "SHOP") return acc;
      return acc + Number(expense.amount || 0);
    }, 0);

    const personalExpensesPaid = paidExpenses.reduce((acc, expense) => {
      if (expense.type !== "PERSONAL") return acc;
      return acc + Number(expense.amount || 0);
    }, 0);

    totalCost += shopExpensesPaid;
    const totalProfit = operatingProfit - shopExpensesPaid;
    const marginPercent =
      totalRevenue > 0
        ? Math.round((totalProfit / totalRevenue) * 100 * 100) / 100
        : 0;

    const totalTransactions = sales.length + serviceOrders.length;
    const averageTicket =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const normalizedMethods: Record<string, { count: number; total: number }> =
      {};

    paymentMethodsRaw.forEach((pm) => {
      const normalizedMethod = normalizePaymentMethod(
        pm.paymentMethod,
        pm.cardType,
      );

      if (!normalizedMethods[normalizedMethod]) {
        normalizedMethods[normalizedMethod] = { count: 0, total: 0 };
      }

      normalizedMethods[normalizedMethod].count += pm._count;
      normalizedMethods[normalizedMethod].total += Number(
        pm._sum.netAmount ?? pm._sum.total ?? 0,
      );
    });

    const paymentMethods = Object.entries(normalizedMethods)
      .map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total,
        percentage: totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const productMap: Record<
      string,
      {
        id: string;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    > = {};

    soldItems.forEach((item) => {
      const productId = item.product?.id || `item-${item.id}`;
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const unitCost = Number(item.product?.costPrice || 0);
      const revenue = unitPrice * quantity;
      const cost = unitCost * quantity;

      if (!productMap[productId]) {
        productMap[productId] = {
          id: productId,
          name: item.product?.name || item.description || "Item avulso",
          category: item.product?.category || "Sem categoria",
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }

      productMap[productId].quantity += quantity;
      productMap[productId].revenue += revenue;
      productMap[productId].cost += cost;
      productMap[productId].profit += revenue - cost;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
      }));

    const dailyRevenueMap: Record<string, number> = {};

    sales.forEach((sale) => {
      const dateKey = getBrazilDateString(new Date(sale.createdAt));
      const revenue = Number(sale.netAmount ?? sale.total ?? 0);
      dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + revenue;
    });

    serviceOrders.forEach((os) => {
      const dateKey = getBrazilDateString(new Date(os.createdAt));
      const revenue = Number(os.totalPrice || 0);
      dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + revenue;
    });

    const dailyEntries = Object.entries(dailyRevenueMap).sort(
      (a, b) => b[1] - a[1],
    );

    const bestDay =
      dailyEntries.length > 0
        ? { date: dailyEntries[0][0], revenue: dailyEntries[0][1] }
        : { date: range.startDate, revenue: 0 };

    const worstDay =
      dailyEntries.length > 0
        ? {
            date: dailyEntries[dailyEntries.length - 1][0],
            revenue: dailyEntries[dailyEntries.length - 1][1],
          }
        : { date: range.startDate, revenue: 0 };

    const dailyAverage =
      dailyEntries.length > 0
        ? dailyEntries.reduce((acc, [, revenue]) => acc + revenue, 0) /
          dailyEntries.length
        : 0;

    let serviceRevenue = 0;
    let serviceProfit = 0;

    serviceOrders.forEach((os) => {
      const revenue = Number(os.totalPrice || 0);
      const cost = Number(os.costPrice || 0);
      serviceRevenue += revenue;
      serviceProfit += revenue - cost;
    });

    const productRevenue = totalRevenue - serviceRevenue;
    const productProfit = operatingProfit - serviceProfit;

    const categoryMap: Record<
      string,
      { revenue: number; cost: number; quantity: number }
    > = {};

    Object.values(productMap).forEach((product) => {
      if (!categoryMap[product.category]) {
        categoryMap[product.category] = { revenue: 0, cost: 0, quantity: 0 };
      }

      categoryMap[product.category].revenue += product.revenue;
      categoryMap[product.category].cost += product.cost;
      categoryMap[product.category].quantity += product.quantity;
    });

    const categoryRanking = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        profit: data.revenue - data.cost,
        quantity: data.quantity,
      }))
      .sort((a, b) => b.profit - a.profit);

    const topProductCategory =
      categoryRanking.length > 0 ? categoryRanking[0].category : "N/A";

    const sellerPerformanceMap = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        role: string;
        commissionRate: number;
        totalSales: number;
        commissionToPay: number;
        salesCount: number;
      }
    >();

    sellers.forEach((seller) => {
      sellerPerformanceMap.set(seller.id, {
        sellerId: seller.id,
        sellerName: seller.fullName || seller.name || seller.id,
        role: seller.role,
        commissionRate: Number(seller.commissionRate || 0),
        totalSales: 0,
        commissionToPay: 0,
        salesCount: 0,
      });
    });

    sales.forEach((sale) => {
      if (!sale.sellerId) {
        return;
      }

      const sellerName =
        sale.seller?.fullName || sale.seller?.name || "Vendedor";
      const commissionRate = Number(sale.seller?.commissionRate || 0);
      const current = sellerPerformanceMap.get(sale.sellerId) || {
        sellerId: sale.sellerId,
        sellerName,
        role: sale.seller?.role || "ATTENDANT",
        commissionRate,
        totalSales: 0,
        commissionToPay: 0,
        salesCount: 0,
      };

      current.totalSales += Number(sale.total || 0);
      current.salesCount += 1;
      current.commissionToPay =
        current.totalSales * (current.commissionRate / 100);

      sellerPerformanceMap.set(sale.sellerId, current);
    });

    const topSellerRevenue = Math.max(
      ...Array.from(sellerPerformanceMap.values()).map((seller) =>
        Number(seller.totalSales || 0),
      ),
      0,
    );

    const teamSalesTotal = Array.from(sellerPerformanceMap.values()).reduce(
      (acc, seller) => acc + Number(seller.totalSales || 0),
      0,
    );

    const teamPerformance = Array.from(sellerPerformanceMap.values())
      .map((seller) => ({
        ...seller,
        averageTicket:
          seller.salesCount > 0 ? seller.totalSales / seller.salesCount : 0,
        progressPercent:
          topSellerRevenue > 0
            ? (seller.totalSales / topSellerRevenue) * 100
            : 0,
        revenueSharePercent:
          teamSalesTotal > 0 ? (seller.totalSales / teamSalesTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    return {
      period: {
        startDate: range.startDate,
        endDate: range.endDate,
        month: range.month,
      },
      financials: {
        totalRevenue,
        totalCost,
        totalProfit,
        marginPercent,
        operatingProfit,
        shopExpensesPaid,
        personalExpensesPaid,
      },
      ticketMetrics: {
        averageTicket,
        totalTransactions,
        topProductCategory,
      },
      performance: {
        bestDay,
        worstDay,
        dailyAverage,
      },
      teamPerformance,
      paymentMethods,
      topProducts,
      serviceVsProducts: {
        serviceRevenue,
        productRevenue,
        serviceProfit,
        productProfit,
      },
      categoryRanking,
    };
  } catch (error) {
    console.error("[getReportMetrics] Error:", error);
    throw error;
  }
}

export async function getMonthComparison(): Promise<{
  thisMonth: ReportMetrics;
  lastMonth: ReportMetrics;
}> {
  try {
    const today = getBrazilDateString(new Date());
    const currentMonth = today.slice(0, 7);

    const [currentYear, currentMonthNum] = currentMonth.split("-").map(Number);
    const lastMonthDate = new Date(currentYear, currentMonthNum - 2, 1);
    const lastMonthString = getBrazilDateString(lastMonthDate).slice(0, 7);

    const thisMonthStart = `${currentMonth}-01`;
    const lastMonthStart = `${lastMonthString}-01`;
    const lastMonthEnd = getBrazilDateString(
      new Date(currentYear, currentMonthNum - 1, 0),
    );

    const [thisMonth, lastMonth] = await Promise.all([
      getReportMetrics(thisMonthStart, today),
      getReportMetrics(lastMonthStart, lastMonthEnd),
    ]);

    return { thisMonth, lastMonth };
  } catch (error) {
    console.error("[getMonthComparison] Error:", error);
    throw error;
  }
}

export async function getDailyRevenueData(
  startDate: string,
  endDate: string,
): Promise<
  Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>
> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const [sales, serviceOrders, paidShopExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          createdAt: {
            gte: range.start,
            lte: range.end,
          },
        },
        include: {
          items: { include: { product: true } },
        },
      }),
      prisma.serviceOrder.findMany({
        where: {
          companyId,
          status: "FINALIZADO",
          createdAt: {
            gte: range.start,
            lte: range.end,
          },
        },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          status: "PAID",
          type: "SHOP",
          paidAt: {
            gte: range.start,
            lte: range.end,
          },
        },
        select: {
          amount: true,
          paidAt: true,
        },
      }),
    ]);

    const dailyData: Record<string, { revenue: number; cost: number }> = {};

    sales.forEach((sale) => {
      const dateKey = getBrazilDateString(new Date(sale.createdAt));
      const revenue = Number(sale.netAmount ?? sale.total ?? 0);
      const cost = sale.items.reduce((acc, item) => {
        const unitCost = Number(item.product?.costPrice || 0);
        return acc + Number(item.quantity || 0) * unitCost;
      }, 0);

      if (!dailyData[dateKey]) dailyData[dateKey] = { revenue: 0, cost: 0 };
      dailyData[dateKey].revenue += revenue;
      dailyData[dateKey].cost += cost;
    });

    serviceOrders.forEach((os) => {
      const dateKey = getBrazilDateString(new Date(os.createdAt));
      const revenue = Number(os.totalPrice || 0);
      const cost = Number(os.costPrice || 0);

      if (!dailyData[dateKey]) dailyData[dateKey] = { revenue: 0, cost: 0 };
      dailyData[dateKey].revenue += revenue;
      dailyData[dateKey].cost += cost;
    });

    paidShopExpenses.forEach((expense) => {
      if (!expense.paidAt) return;

      const dateKey = getBrazilDateString(new Date(expense.paidAt));
      if (!dailyData[dateKey]) dailyData[dateKey] = { revenue: 0, cost: 0 };
      dailyData[dateKey].cost += Number(expense.amount || 0);
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("[getDailyRevenueData] Error:", error);
    return [];
  }
}

export async function getMonthlyEvolution(
  referenceDate?: string,
): Promise<
  Array<{
    month: string;
    monthLabel: string;
    revenue: number;
    cost: number;
    profit: number;
  }>
> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const baseDate = referenceDate
      ? new Date(`${referenceDate}T12:00:00.000-03:00`)
      : new Date();

    const monthlyData: Array<{
      month: string;
      monthLabel: string;
      revenue: number;
      cost: number;
      profit: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() - i,
        1,
      );

      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "2-digit",
      }).format(monthDate);

      const monthStart = new Date(
        `${month}-01T00:00:00.000-03:00`,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const [monthSales, monthServiceOrders, monthShopExpenses] =
        await Promise.all([
        prisma.sale.findMany({
          where: {
            companyId,
            status: "COMPLETED",
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          include: {
            items: { include: { product: true } },
          },
        }),
        prisma.serviceOrder.findMany({
          where: {
            companyId,
            status: "FINALIZADO",
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        prisma.expense.findMany({
          where: {
            companyId,
            status: "PAID",
            type: "SHOP",
            paidAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          select: {
            amount: true,
          },
        }),
      ]);

      let revenue = 0;
      let cost = 0;

      monthSales.forEach((sale) => {
        const saleRevenue = Number(sale.netAmount ?? sale.total ?? 0);
        const saleCost = sale.items.reduce((acc, item) => {
          const unitCost = Number(item.product?.costPrice || 0);
          return acc + Number(item.quantity || 0) * unitCost;
        }, 0);
        revenue += saleRevenue;
        cost += saleCost;
      });

      monthServiceOrders.forEach((os) => {
        revenue += Number(os.totalPrice || 0);
        cost += Number(os.costPrice || 0);
      });

      monthShopExpenses.forEach((expense) => {
        cost += Number(expense.amount || 0);
      });

      monthlyData.push({
        month,
        monthLabel,
        revenue,
        cost,
        profit: revenue - cost,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error("[getMonthlyEvolution] Error:", error);
    return [];
  }
}
