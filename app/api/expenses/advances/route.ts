import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  getAuditActorName,
} from "@/lib/audit";
import { isExpensePaymentMethod } from "@/lib/expenses";

const BRAZIL_TZ = "America/Sao_Paulo";

const getBrazilReferenceMonth = (value = new Date()) => {
  const yearMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(value);

  return new Date(`${yearMonth}-01T12:00:00.000-03:00`);
};

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const body = await request.json();
    const employeeId = String(body.employeeId || "").trim();
    const grossSalary = roundCurrency(Number(body.grossSalary || 0));
    const amount = roundCurrency(Number(body.amount || 0));
    const paymentMethod = String(body.paymentMethod || "")
      .trim()
      .toUpperCase();
    const notes = String(body.notes || "").trim() || null;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Selecione o funcionario do adiantamento." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(grossSalary) || grossSalary <= 0) {
      return NextResponse.json(
        { error: "Informe um salario base valido." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Informe um valor de adiantamento valido." },
        { status: 400 },
      );
    }

    if (!isExpensePaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Forma de pagamento invalida." },
        { status: 400 },
      );
    }

    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId,
      },
      select: {
        id: true,
        fullName: true,
        name: true,
        cpf: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Funcionario nao encontrado." },
        { status: 404 },
      );
    }

    if (!employee.cpf) {
      return NextResponse.json(
        { error: "Este funcionario nao possui CPF cadastrado." },
        { status: 400 },
      );
    }

    const referenceMonth = getBrazilReferenceMonth();
    const previousAdvanceAggregate = await prisma.salaryAdvance.aggregate({
      where: {
        companyId,
        employeeId: employee.id,
        referenceMonth,
      },
      _sum: {
        advanceAmount: true,
      },
    });

    const previousAdvanceTotal = Number(
      previousAdvanceAggregate._sum.advanceAmount || 0,
    );
    const remainingSalary = roundCurrency(
      grossSalary - previousAdvanceTotal - amount,
    );

    if (remainingSalary < 0) {
      return NextResponse.json(
        {
          error:
            "O valor do vale ultrapassa o salario base informado para este mes.",
          remainingAvailable: roundCurrency(grossSalary - previousAdvanceTotal),
        },
        { status: 400 },
      );
    }

    const employeeName = employee.fullName || employee.name || "Funcionario";
    const actorName = getAuditActorName(currentUser);
    const now = new Date();

    const createdAdvance = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId,
          description: `Adiantamento salarial - ${employeeName}`,
          category: "ADIANTAMENTO_SALARIAL",
          amount,
          dueDate: now,
          isRecurring: false,
          nextDueDate: null,
          paidAt: now,
          status: "PAID",
          type: "SHOP",
          paymentMethod,
        },
      });

      const advance = await tx.salaryAdvance.create({
        data: {
          companyId,
          employeeId: employee.id,
          expenseId: expense.id,
          employeeName,
          employeeCpf: employee.cpf,
          grossSalary,
          advanceAmount: amount,
          remainingSalary,
          referenceMonth,
          notes,
        },
        include: {
          expense: {
            select: {
              id: true,
              paymentMethod: true,
            },
          },
        },
      });

      await createAuditLog(tx, {
        companyId,
        userName: actorName,
        action: "INSERT",
        tableName: "salary_advances",
        description: `${actorName} lançou um adiantamento salarial para ${employeeName} (${employee.cpf}) no valor de ${formatAuditCurrency(amount)} via ${paymentMethod}. Restante do mês: ${formatAuditCurrency(remainingSalary)}.`,
      });

      return advance;
    });

    return NextResponse.json(
      {
        advance: {
          id: createdAdvance.id,
          employeeId: createdAdvance.employeeId,
          expenseId: createdAdvance.expenseId,
          employeeName: createdAdvance.employeeName,
          employeeCpf: createdAdvance.employeeCpf,
          grossSalary: Number(createdAdvance.grossSalary),
          advanceAmount: Number(createdAdvance.advanceAmount),
          remainingSalary: Number(createdAdvance.remainingSalary),
          referenceMonth: createdAdvance.referenceMonth.toISOString(),
          notes: createdAdvance.notes,
          createdAt: createdAdvance.createdAt.toISOString(),
          updatedAt: createdAdvance.updatedAt.toISOString(),
          paymentMethod: createdAdvance.expense.paymentMethod,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[expenses][advances][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao lançar adiantamento salarial." },
      { status: 500 },
    );
  }
}
