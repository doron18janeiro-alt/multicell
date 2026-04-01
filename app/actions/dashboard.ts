"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isProductLowStock, resolveProductMinStock } from "@/lib/stock-alerts";

interface WeeklyData {
  day: string;
  lucro: number;
  data: string;
}

interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

interface CashBalanceSummary {
  cashBalance: number;
  totalSales: number;
  shopExpenses: number;
}

interface ExpenseBreakdownSummary {
  shop: number;
  personal: number;
}

interface RecurringCommitmentsSummary {
  monthLabel: string;
  total: number;
  count: number;
  pendingCount: number;
  items: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    dueDate: string;
    status: string;
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

const resolveDateRange = (startDate?: string, endDate?: string) => {
  const today = getBrazilDateString(new Date());
  const defaultStart = getBrazilDateString(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  );

  let startDateString = startDate || defaultStart;
  let endDateString = endDate || today;

  if (startDateString > endDateString) {
    [startDateString, endDateString] = [endDateString, startDateString];
  }

  return {
    startDate: startDateString,
    endDate: endDateString,
    start: new Date(`${startDateString}T00:00:00.000-03:00`),
    end: new Date(`${endDateString}T23:59:59.999-03:00`),
  };
};

const resolveMonthRange = (referenceDate?: string) => {
  const reference = referenceDate
    ? new Date(`${referenceDate}T12:00:00.000-03:00`)
    : new Date();

  const year = reference.getFullYear();
  const month = reference.getMonth();
  const monthKey = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TZ,
    month: "long",
    year: "numeric",
  }).format(reference);

  return {
    monthLabel: monthKey.replace(/^\w/, (char) => char.toUpperCase()),
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
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

const dayLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T12:00:00.000-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "")
    .slice(0, 3)
    .replace(/^\w/, (c) => c.toUpperCase());
};

export async function getDailyProfit(
  startDate?: string,
  endDate?: string,
): Promise<{
  value: number;
  formatted: string;
  itemsCount: number;
}> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const [sales, serviceOrders] = await Promise.all([
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
          items: {
            include: { product: true },
          },
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
    ]);

    const salesProfit = sales.reduce((acc, sale) => {
      const revenue = Number(sale.netAmount ?? sale.total ?? 0);
      const cost = sale.items.reduce((costAcc, item) => {
        const unitCost = Number(item.product?.costPrice || 0);
        return costAcc + Number(item.quantity || 0) * unitCost;
      }, 0);
      return acc + (revenue - cost);
    }, 0);

    const serviceProfit = serviceOrders.reduce((acc, order) => {
      const revenue = Number(order.totalPrice || 0);
      const cost = Number(order.costPrice || 0);
      return acc + (revenue - cost);
    }, 0);

    const totalProfit = salesProfit + serviceProfit;
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(totalProfit);

    return {
      value: totalProfit,
      formatted,
      itemsCount: sales.length + serviceOrders.length,
    };
  } catch (error) {
    console.error("[getDailyProfit] Error:", error);
    return { value: 0, formatted: "R$ 0,00", itemsCount: 0 };
  }
}

export async function getWeeklyEvolution(
  startDate?: string,
  endDate?: string,
): Promise<WeeklyData[]> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const [sales, serviceOrders] = await Promise.all([
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
    ]);

    const dailyProfitMap: Record<string, number> = {};

    sales.forEach((sale) => {
      const date = getBrazilDateString(new Date(sale.createdAt));
      const revenue = Number(sale.netAmount ?? sale.total ?? 0);
      const cost = sale.items.reduce((acc, item) => {
        const unitCost = Number(item.product?.costPrice || 0);
        return acc + Number(item.quantity || 0) * unitCost;
      }, 0);
      dailyProfitMap[date] = (dailyProfitMap[date] || 0) + (revenue - cost);
    });

    serviceOrders.forEach((order) => {
      const date = getBrazilDateString(new Date(order.createdAt));
      const revenue = Number(order.totalPrice || 0);
      const cost = Number(order.costPrice || 0);
      dailyProfitMap[date] = (dailyProfitMap[date] || 0) + (revenue - cost);
    });

    const dailyRows: WeeklyData[] = [];
    const cursor = new Date(`${range.startDate}T12:00:00.000-03:00`);
    const endCursor = new Date(`${range.endDate}T12:00:00.000-03:00`);

    while (cursor <= endCursor) {
      const dateStr = getBrazilDateString(cursor);
      dailyRows.push({
        data: dateStr,
        day: dayLabel(dateStr),
        lucro: Number((dailyProfitMap[dateStr] || 0).toFixed(2)),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return dailyRows;
  } catch (error) {
    console.error("[getWeeklyEvolution] Error:", error);
    return [];
  }
}

export async function getDashboardPaymentMethods(
  startDate?: string,
  endDate?: string,
): Promise<PaymentMethodSummary[]> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const grouped = await prisma.sale.groupBy({
      by: ["paymentMethod", "cardType"],
      where: {
        companyId,
        status: "COMPLETED",
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: true,
      _sum: {
        netAmount: true,
        total: true,
      },
    });

    const normalized: Record<string, { count: number; total: number }> = {};

    grouped.forEach((row) => {
      const method = normalizePaymentMethod(row.paymentMethod, row.cardType);
      if (!normalized[method]) {
        normalized[method] = { count: 0, total: 0 };
      }
      normalized[method].count += row._count;
      normalized[method].total += Number(row._sum.netAmount ?? row._sum.total ?? 0);
    });

    const grandTotal = Object.values(normalized).reduce(
      (acc, row) => acc + row.total,
      0,
    );

    return Object.entries(normalized)
      .map(([method, row]) => ({
        method,
        count: row.count,
        total: row.total,
        percentage: grandTotal > 0 ? (row.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error("[getDashboardPaymentMethods] Error:", error);
    return [];
  }
}

export async function getCriticalStockAlerts(): Promise<{
  count: number;
  items: Array<{
    id: string;
    name: string;
    stock: number;
    minStock: number;
    diff: number;
  }>;
}> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";

    const allProducts = await prisma.product.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        stock: true,
        minStock: true,
        minQuantity: true,
      },
    });

    const criticalItems = allProducts.filter((product) => {
      return isProductLowStock(product);
    });

    return {
      count: criticalItems.length,
      items: criticalItems.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        minStock: resolveProductMinStock(item),
        diff: resolveProductMinStock(item) - item.stock,
      })),
    };
  } catch (error) {
    console.error("[getCriticalStockAlerts] Error:", error);
    return { count: 0, items: [] };
  }
}

export async function getTotalStockItems(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";

    const [productsTotal, batchesTotal] = await Promise.all([
      prisma.product.aggregate({
        where: { companyId },
        _sum: {
          stock: true,
        },
      }),
      prisma.productBatch.aggregate({
        where: {
          product: { companyId },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const stockUnits = Number(productsTotal._sum.stock || 0);
    const batchUnits = Number(batchesTotal._sum.quantity || 0);

    return stockUnits > 0 ? stockUnits : batchUnits;
  } catch (error) {
    console.error("[getTotalStockItems] Error:", error);
    return 0;
  }
}

export async function getStockValue(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";

    const products = await prisma.product.findMany({
      where: { companyId },
      select: { stock: true, costPrice: true },
    });

    return products.reduce((acc, product) => {
      return acc + product.stock * Number(product.costPrice || 0);
    }, 0);
  } catch (error) {
    console.error("[getStockValue] Error:", error);
    return 0;
  }
}

export async function getMonthlyEvolution(): Promise<
  Array<{
    month: string;
    monthShort: string;
    revenue: number;
    profit: number;
  }>
> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const monthlyData: Array<{
      month: string;
      monthShort: string;
      revenue: number;
      profit: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - i,
        1,
      );

      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const monthShort = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "2-digit",
      }).format(monthDate);

      const startOfMonth = new Date(`${month}-01T00:00:00.000-03:00`);
      const endOfMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const [sales, serviceOrders] = await Promise.all([
        prisma.sale.findMany({
          where: {
            companyId,
            status: "COMPLETED",
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          include: { items: { include: { product: true } } },
        }),
        prisma.serviceOrder.findMany({
          where: {
            companyId,
            status: "FINALIZADO",
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);

      let revenue = 0;
      let profit = 0;

      sales.forEach((sale) => {
        const saleRevenue = Number(sale.netAmount ?? sale.total ?? 0);
        const saleCost = sale.items.reduce((acc, item) => {
          const unitCost = Number(item.product?.costPrice || 0);
          return acc + Number(item.quantity || 0) * unitCost;
        }, 0);
        revenue += saleRevenue;
        profit += saleRevenue - saleCost;
      });

      serviceOrders.forEach((order) => {
        const orderRevenue = Number(order.totalPrice || 0);
        const orderCost = Number(order.costPrice || 0);
        revenue += orderRevenue;
        profit += orderRevenue - orderCost;
      });

      monthlyData.push({
        month,
        monthShort,
        revenue,
        profit,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error("[getMonthlyEvolution] Error:", error);
    return [];
  }
}

export async function getCashBalanceSummary(
  startDate?: string,
  endDate?: string,
): Promise<CashBalanceSummary> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const [sales, paidShopExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          createdAt: {
            gte: range.start,
            lte: range.end,
          },
        },
        select: {
          netAmount: true,
          total: true,
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
        },
      }),
    ]);

    const totalSales = sales.reduce(
      (acc, sale) => acc + Number(sale.netAmount ?? sale.total ?? 0),
      0,
    );
    const shopExpenses = paidShopExpenses.reduce(
      (acc, expense) => acc + Number(expense.amount || 0),
      0,
    );

    return {
      totalSales,
      shopExpenses,
      cashBalance: totalSales - shopExpenses,
    };
  } catch (error) {
    console.error("[getCashBalanceSummary] Error:", error);
    return {
      totalSales: 0,
      shopExpenses: 0,
      cashBalance: 0,
    };
  }
}

export async function getExpenseBreakdownSummary(
  startDate?: string,
  endDate?: string,
): Promise<ExpenseBreakdownSummary> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const range = resolveDateRange(startDate, endDate);

    const paidExpenses = await prisma.expense.findMany({
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
    });

    return paidExpenses.reduce(
      (acc, expense) => {
        const amount = Number(expense.amount || 0);

        if (expense.type === "SHOP") {
          acc.shop += amount;
        } else {
          acc.personal += amount;
        }

        return acc;
      },
      { shop: 0, personal: 0 },
    );
  } catch (error) {
    console.error("[getExpenseBreakdownSummary] Error:", error);
    return {
      shop: 0,
      personal: 0,
    };
  }
}

export async function getRecurringCommitmentsSummary(
  referenceDate?: string,
): Promise<RecurringCommitmentsSummary> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const companyId = session.user.companyId || "multicell-oficial";
    const monthRange = resolveMonthRange(referenceDate);

    const recurringExpenses = await prisma.expense.findMany({
      where: {
        companyId,
        isRecurring: true,
        dueDate: {
          gte: monthRange.start,
          lte: monthRange.end,
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        description: true,
        category: true,
        amount: true,
        dueDate: true,
        status: true,
      },
    });

    return {
      monthLabel: monthRange.monthLabel,
      total: recurringExpenses.reduce(
        (acc, expense) => acc + Number(expense.amount || 0),
        0,
      ),
      count: recurringExpenses.length,
      pendingCount: recurringExpenses.filter(
        (expense) => expense.status === "PENDING",
      ).length,
      items: recurringExpenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amount: Number(expense.amount || 0),
        dueDate: expense.dueDate.toISOString(),
        status: expense.status,
      })),
    };
  } catch (error) {
    console.error("[getRecurringCommitmentsSummary] Error:", error);
    return {
      monthLabel: "",
      total: 0,
      count: 0,
      pendingCount: 0,
      items: [],
    };
  }
}
