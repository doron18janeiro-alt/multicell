import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPendingItemsSummary,
  formatCurrency,
  resolvePendingStatus,
} from "@/lib/food";

const startOfToday = () => {
  const now = new Date();
  return new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00.000-03:00`,
  );
};

const parseItemsSnapshot = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is {
          description: string;
          quantity: number;
          unitPrice: number;
          consumedAt?: string | null;
        } =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as { description?: unknown }).description === "string",
      )
    : [];

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId;
    const today = startOfToday();

    await prisma.customerPendingEntry.updateMany({
      where: {
        companyId,
        status: "ABERTO",
        dueDate: {
          lt: today,
        },
      },
      data: {
        status: "VENCIDO",
      },
    });

    const [tables, pendingEntries, recentSales] = await Promise.all([
      prisma.table.findMany({
        where: { companyId },
        orderBy: { number: "asc" },
        include: {
          currentOrder: {
            include: {
              customer: true,
              items: {
                orderBy: { createdAt: "asc" },
              },
              payments: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
        },
      }),
      prisma.customerPendingEntry.findMany({
        where: {
          companyId,
          status: {
            in: ["ABERTO", "VENCIDO"],
          },
        },
        include: {
          customer: true,
          order: {
            include: {
              table: true,
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
      prisma.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          customer: true,
          items: true,
        },
      }),
    ]);

    const normalizedTables = tables.map((table) => ({
      id: table.id,
      number: table.number,
      status: table.status,
      currentOrder: table.currentOrder
        ? {
            id: table.currentOrder.id,
            status: table.currentOrder.status,
            total: Number(table.currentOrder.total || 0),
            paidAmount: Number(table.currentOrder.paidAmount || 0),
            pendingTransferredAmount: Number(
              table.currentOrder.pendingTransferredAmount || 0,
            ),
            balanceDue: Number(table.currentOrder.balanceDue || 0),
            customer: table.currentOrder.customer
              ? {
                  id: table.currentOrder.customer.id,
                  name: table.currentOrder.customer.name,
                  phone: table.currentOrder.customer.phone,
                  document: table.currentOrder.customer.document,
                }
              : null,
            items: table.currentOrder.items.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              status: item.status,
              settledQuantity: item.settledQuantity,
              unitPrice: Number(item.unitPrice || 0),
              createdAt: item.createdAt.toISOString(),
            })),
            payments: table.currentOrder.payments.map((payment) => ({
              id: payment.id,
              amount: Number(payment.amount || 0),
              paymentMethod: payment.paymentMethod,
              dueDate: payment.dueDate?.toISOString() ?? null,
              receiptDocument: payment.receiptDocument,
              createdAt: payment.createdAt.toISOString(),
            })),
          }
        : null,
    }));

    const normalizedPendingEntries = pendingEntries.map((entry) => {
      const itemsSnapshot = parseItemsSnapshot(entry.itemsSnapshot);
      const resolvedStatus = resolvePendingStatus(entry.status, entry.dueDate);

      return {
        id: entry.id,
        amount: Number(entry.amount || 0),
        dueDate: entry.dueDate?.toISOString() ?? null,
        status: resolvedStatus,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
        customer: {
          id: entry.customer.id,
          name: entry.customer.name,
          phone: entry.customer.phone,
          document: entry.customer.document,
          pendingBalance: Number(entry.customer.pendingBalance || 0),
        },
        order: entry.order
          ? {
              id: entry.order.id,
              tableNumber: entry.order.table?.number ?? null,
            }
          : null,
        itemsSnapshot,
        summary: buildPendingItemsSummary(itemsSnapshot),
      };
    });

    const pendingByCustomer = Array.from(
      normalizedPendingEntries.reduce((map, entry) => {
        const current = map.get(entry.customer.id) || {
          customer: entry.customer,
          total: 0,
          overdueCount: 0,
          entries: [] as typeof normalizedPendingEntries,
        };

        current.total += entry.amount;
        current.overdueCount += entry.status === "VENCIDO" ? 1 : 0;
        current.entries.push(entry);
        map.set(entry.customer.id, current);
        return map;
      }, new Map<string, {
        customer: (typeof normalizedPendingEntries)[number]["customer"];
        total: number;
        overdueCount: number;
        entries: typeof normalizedPendingEntries;
      }>()),
    ).map(([, group]) => ({
      customer: group.customer,
      total: Number(group.total.toFixed(2)),
      formattedTotal: formatCurrency(group.total),
      overdueCount: group.overdueCount,
      entries: group.entries,
    }));

    const summary = {
      totalTables: normalizedTables.length,
      occupiedTables: normalizedTables.filter((table) => table.status === "OCUPADO")
        .length,
      availableTables: normalizedTables.filter(
        (table) => table.status === "DISPONIVEL",
      ).length,
      openTableBalance: Number(
        normalizedTables
          .reduce(
            (total, table) =>
              total + Number(table.currentOrder?.balanceDue || 0),
            0,
          )
          .toFixed(2),
      ),
      pendingBalance: Number(
        normalizedPendingEntries
          .reduce((total, entry) => total + entry.amount, 0)
          .toFixed(2),
      ),
      overdueCount: normalizedPendingEntries.filter(
        (entry) => entry.status === "VENCIDO",
      ).length,
      recentSalesTotal: Number(
        recentSales
          .reduce((total, sale) => total + Number(sale.total || 0), 0)
          .toFixed(2),
      ),
    };

    return NextResponse.json({
      summary,
      tables: normalizedTables,
      pendingEntries: normalizedPendingEntries,
      pendingByCustomer,
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        total: Number(sale.total || 0),
        paymentMethod: sale.paymentMethod,
        tableNumber: sale.tableNumber,
        customerName: sale.customer?.name || null,
        customerDocument: sale.customerDocument || sale.customer?.document || null,
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
        })),
      })),
    });
  } catch (error) {
    console.error("[api/food/dashboard][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar o dashboard gastronômico." },
      { status: 500 },
    );
  }
}
