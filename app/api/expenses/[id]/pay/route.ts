import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isExpensePaymentMethod } from "@/lib/expenses";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        companyId: session.user.companyId || "multicell-oficial",
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Despesa nao encontrada." },
        { status: 404 },
      );
    }

    const updatedExpense =
      expense.status === "PAID"
        ? expense
        : await prisma.expense.update({
            where: { id: expense.id },
            data: {
              status: "PAID",
              paymentMethod,
              paidAt: new Date(),
            },
          });

    return NextResponse.json(serializeExpense(updatedExpense));
  } catch (error) {
    console.error("[expenses][pay] Error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar pagamento." },
      { status: 500 },
    );
  }
}
