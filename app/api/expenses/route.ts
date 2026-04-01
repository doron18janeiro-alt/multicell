import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  isExpenseCategory,
  isExpenseType,
  parseBrazilDateInput,
  isExpenseOverdue,
  addOneMonthToExpenseDate,
} from "@/lib/expenses";

const serializeExpense = (expense: {
  id: string;
  description: string;
  category: string;
  amount: { toString(): string } | number;
  dueDate: Date;
  isRecurring: boolean;
  nextDueDate: Date | null;
  paidAt: Date | null;
  status: string;
  type: string;
  paymentMethod: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...expense,
  amount: Number(expense.amount),
  dueDate: expense.dueDate.toISOString(),
  isRecurring: expense.isRecurring,
  nextDueDate: expense.nextDueDate?.toISOString() ?? null,
  paidAt: expense.paidAt?.toISOString() ?? null,
  createdAt: expense.createdAt.toISOString(),
  updatedAt: expense.updatedAt.toISOString(),
});

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

    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          companyId,
          status: "COMPLETED",
        },
        select: {
          netAmount: true,
          total: true,
        },
      }),
      prisma.expense.findMany({
        where: { companyId },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    let totalSales = 0;
    let shopPaidTotal = 0;
    let personalPaidTotal = 0;
    let pendingTotal = 0;
    let overdueCount = 0;

    sales.forEach((sale) => {
      totalSales += Number(sale.netAmount ?? sale.total ?? 0);
    });

    expenses.forEach((expense) => {
      const amount = Number(expense.amount);

      if (expense.status === "PAID") {
        if (expense.type === "SHOP") {
          shopPaidTotal += amount;
        } else {
          personalPaidTotal += amount;
        }
      } else {
        pendingTotal += amount;

        if (isExpenseOverdue(expense.dueDate, expense.status)) {
          overdueCount += 1;
        }
      }
    });

    return NextResponse.json({
      expenses: expenses.map(serializeExpense),
      summary: {
        totalSales,
        shopPaidTotal,
        personalPaidTotal,
        pendingTotal,
        overdueCount,
        cashBalance: totalSales - shopPaidTotal,
      },
    });
  } catch (error) {
    console.error("[expenses][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar despesas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim().toUpperCase();
    const type = String(body.type || "").trim().toUpperCase();
    const amount = Number(body.amount);
    const dueDate = String(body.dueDate || "").trim();
    const isRecurring = Boolean(body.isRecurring);

    if (!description || !dueDate || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Preencha descricao, valor e vencimento corretamente." },
        { status: 400 },
      );
    }

    if (!isExpenseCategory(category) || !isExpenseType(type)) {
      return NextResponse.json(
        { error: "Categoria ou tipo de despesa invalido." },
        { status: 400 },
      );
    }

    const parsedDueDate = parseBrazilDateInput(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        { error: "Data de vencimento invalida." },
        { status: 400 },
      );
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: currentUser.companyId || "multicell-oficial",
        description,
        category,
        type,
        amount,
        dueDate: parsedDueDate,
        isRecurring,
        nextDueDate: isRecurring
          ? addOneMonthToExpenseDate(parsedDueDate)
          : null,
        status: "PENDING",
      },
    });

    return NextResponse.json(serializeExpense(expense), { status: 201 });
  } catch (error) {
    console.error("[expenses][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar despesa." },
      { status: 500 },
    );
  }
}
