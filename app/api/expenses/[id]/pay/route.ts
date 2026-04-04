import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  getAuditActorName,
} from "@/lib/audit";
import {
  addOneMonthToExpenseDate,
  formatExpenseDateInput,
  isExpensePaymentMethod,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const paymentMethod = String(body.paymentMethod || "")
      .trim()
      .toUpperCase();

    if (!isExpensePaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Forma de pagamento invalida." },
        { status: 400 },
      );
    }

    const { id } = await params;

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        companyId: currentUser.companyId || "multicell-oficial",
      },
      include: {
        salaryAdvance: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Despesa nao encontrada." },
        { status: 404 },
      );
    }

    if (expense.salaryAdvance) {
      return NextResponse.json(
        { error: "Adiantamentos salariais ja sao registrados como pagos no lancamento." },
        { status: 400 },
      );
    }

    const updatedExpense =
      expense.status === "PAID"
        ? expense
        : await prisma.$transaction(async (tx) => {
            const nextExpense = await tx.expense.update({
              where: { id: expense.id },
              data: {
                status: "PAID",
                paymentMethod,
                paidAt: new Date(),
              },
            });

            const actorName = getAuditActorName(currentUser);

            await createAuditLog(tx, {
              companyId: currentUser.companyId,
              userName: actorName,
              action: "UPDATE",
              tableName: "expenses",
              description: `${actorName} alterou a despesa "${expense.description}" de PENDING para PAID via ${paymentMethod}, no valor de ${formatAuditCurrency(expense.amount)}.`,
            });

            return nextExpense;
          });

    const nextDueDate =
      updatedExpense.nextDueDate || addOneMonthToExpenseDate(updatedExpense.dueDate);

    return NextResponse.json({
      expense: serializeExpense(updatedExpense),
      recurringSuggestion:
        updatedExpense.status === "PAID" && updatedExpense.isRecurring
          ? {
              description: updatedExpense.description,
              category: updatedExpense.category,
              amount: Number(updatedExpense.amount),
              dueDate: formatExpenseDateInput(nextDueDate),
              dueDateIso: nextDueDate.toISOString(),
              type: updatedExpense.type,
              isRecurring: true,
            }
          : null,
    });
  } catch (error) {
    console.error("[expenses][pay] Error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar pagamento." },
      { status: 500 },
    );
  }
}
