import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPendingItemsSummary, resolvePendingStatus } from "@/lib/food";

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

    const entries = await prisma.customerPendingEntry.findMany({
      where: {
        companyId,
        status: {
          in: ["ABERTO", "VENCIDO", "PAGO"],
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
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    const normalizedEntries = entries.map((entry) => {
      const itemsSnapshot = parseItemsSnapshot(entry.itemsSnapshot);
      const status = resolvePendingStatus(entry.status, entry.dueDate);

      return {
        id: entry.id,
        amount: Number(entry.amount || 0),
        dueDate: entry.dueDate?.toISOString() ?? null,
        status: entry.status === "PAGO" ? "PAGO" : status,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
        settledAt: entry.settledAt?.toISOString() ?? null,
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

    return NextResponse.json({
      entries: normalizedEntries,
      summary: {
        openCount: normalizedEntries.filter((entry) => entry.status !== "PAGO").length,
        overdueCount: normalizedEntries.filter((entry) => entry.status === "VENCIDO")
          .length,
        totalOpenBalance: Number(
          normalizedEntries
            .filter((entry) => entry.status !== "PAGO")
            .reduce((total, entry) => total + entry.amount, 0)
            .toFixed(2),
        ),
      },
    });
  } catch (error) {
    console.error("[api/food/pending][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar contas pendentes." },
      { status: 500 },
    );
  }
}
