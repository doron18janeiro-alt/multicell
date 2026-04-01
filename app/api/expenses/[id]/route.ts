import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  formatAuditDate,
  getAuditActorName,
} from "@/lib/audit";
import {
  isExpenseCategory,
  isExpenseType,
  parseBrazilDateInput,
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

const describeExpenseChanges = (
  actorName: string,
  previousExpense: {
    description: string;
    category: string;
    type: string;
    amount: { toString(): string } | number;
    dueDate: Date;
    isRecurring: boolean;
  },
  nextExpense: {
    description: string;
    category: string;
    type: string;
    amount: { toString(): string } | number;
    dueDate: Date;
    isRecurring: boolean;
  },
) => {
  const changes: string[] = [];

  if (previousExpense.description !== nextExpense.description) {
    changes.push(
      `descricao de "${previousExpense.description}" para "${nextExpense.description}"`,
    );
  }

  if (previousExpense.category !== nextExpense.category) {
    changes.push(
      `categoria de ${previousExpense.category} para ${nextExpense.category}`,
    );
  }

  if (previousExpense.type !== nextExpense.type) {
    changes.push(`tipo de ${previousExpense.type} para ${nextExpense.type}`);
  }

  if (Number(previousExpense.amount) !== Number(nextExpense.amount)) {
    changes.push(
      `valor de ${formatAuditCurrency(previousExpense.amount)} para ${formatAuditCurrency(nextExpense.amount)}`,
    );
  }

  if (previousExpense.dueDate.getTime() !== nextExpense.dueDate.getTime()) {
    changes.push(
      `vencimento de ${formatAuditDate(previousExpense.dueDate)} para ${formatAuditDate(nextExpense.dueDate)}`,
    );
  }

  if (previousExpense.isRecurring !== nextExpense.isRecurring) {
    changes.push(
      nextExpense.isRecurring
        ? "ativou a recorrencia mensal"
        : "removeu a recorrencia mensal",
    );
  }

  if (changes.length === 0) {
    return `${actorName} atualizou a despesa "${nextExpense.description}" sem alterar campos monitorados.`;
  }

  return `${actorName} alterou a despesa "${nextExpense.description}": ${changes.join("; ")}.`;
};

export async function PATCH(
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

    const { id } = await params;
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

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        companyId: currentUser.companyId || "multicell-oficial",
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Despesa nao encontrada." },
        { status: 404 },
      );
    }

    const actorName = getAuditActorName(currentUser);

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const nextExpense = await tx.expense.update({
        where: { id: existingExpense.id },
        data: {
          description,
          category,
          type,
          amount,
          dueDate: parsedDueDate,
          isRecurring,
          nextDueDate: isRecurring
            ? addOneMonthToExpenseDate(parsedDueDate)
            : null,
        },
      });

      await createAuditLog(tx, {
        companyId: currentUser.companyId,
        userName: actorName,
        action: "UPDATE",
        tableName: "expenses",
        description: describeExpenseChanges(actorName, existingExpense, nextExpense),
      });

      return nextExpense;
    });

    return NextResponse.json(serializeExpense(updatedExpense));
  } catch (error) {
    console.error("[expenses][PATCH] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar despesa." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const { id } = await params;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        companyId: currentUser.companyId || "multicell-oficial",
      },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Despesa nao encontrada." },
        { status: 404 },
      );
    }

    const actorName = getAuditActorName(currentUser);

    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({
        where: { id: existingExpense.id },
      });

      await createAuditLog(tx, {
        companyId: currentUser.companyId,
        userName: actorName,
        action: "DELETE",
        tableName: "expenses",
        description: `${actorName} excluiu a despesa "${existingExpense.description}" de ${formatAuditCurrency(existingExpense.amount)} com vencimento em ${formatAuditDate(existingExpense.dueDate)}.`,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[expenses][DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir despesa." },
      { status: 500 },
    );
  }
}
