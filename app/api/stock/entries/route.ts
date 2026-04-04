import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const entries = await prisma.stockEntry.findMany({
      where: { companyId },
      include: {
        items: {
          select: {
            id: true,
            action: true,
          },
        },
        expenses: {
          select: {
            id: true,
            amount: true,
            dueDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    });

    return NextResponse.json(
      entries.map((entry) => ({
        id: entry.id,
        accessKey: entry.accessKey,
        invoiceNumber: entry.invoiceNumber,
        series: entry.series,
        supplierName: entry.supplierName,
        sourceType: entry.sourceType,
        status: entry.status,
        issueDate: entry.issueDate?.toISOString() ?? null,
        entryDate: entry.entryDate.toISOString(),
        totalAmount: Number(entry.totalAmount || 0),
        itemsCount: entry.items.length,
        payablesCount: entry.expenses.length,
        pendingAmount: entry.expenses
          .filter((expense) => expense.status === "PENDING")
          .reduce((accumulator, expense) => accumulator + Number(expense.amount || 0), 0),
      })),
    );
  } catch (error) {
    console.error("[stock][entries][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar entradas recentes." },
      { status: 500 },
    );
  }
}

