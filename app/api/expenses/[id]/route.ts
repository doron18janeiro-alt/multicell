import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  isExpenseCategory,
  isExpenseType,
  parseBrazilDateInput,
} from "@/lib/expenses";

const serializeExpense = (expense: {
  id: string;
  description: string;
  category: string;
  amount: { toString(): string } | number;
  dueDate: Date;
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
  paidAt: expense.paidAt?.toISOString() ?? null,
  createdAt: expense.createdAt.toISOString(),
  updatedAt: expense.updatedAt.toISOString(),
});

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

    const updatedExpense = await prisma.expense.update({
      where: { id: existingExpense.id },
      data: {
        description,
        category,
        type,
        amount,
        dueDate: parsedDueDate,
      },
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
      select: { id: true },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Despesa nao encontrada." },
        { status: 404 },
      );
    }

    await prisma.expense.delete({
      where: { id: existingExpense.id },
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
