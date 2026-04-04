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

const BRAZIL_TZ = "America/Sao_Paulo";

const getBrazilReferenceMonth = (value = new Date()) => {
  const yearMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
  }).format(value);

  return new Date(`${yearMonth}-01T12:00:00.000-03:00`);
};

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
  salaryAdvance?: {
    id: string;
  } | null;
}) => ({
  ...expense,
  amount: Number(expense.amount),
  dueDate: expense.dueDate.toISOString(),
  isRecurring: expense.isRecurring,
  nextDueDate: expense.nextDueDate?.toISOString() ?? null,
  paidAt: expense.paidAt?.toISOString() ?? null,
  createdAt: expense.createdAt.toISOString(),
  updatedAt: expense.updatedAt.toISOString(),
  salaryAdvanceId: expense.salaryAdvance?.id ?? null,
});

const serializeSalaryAdvance = (advance: {
  id: string;
  employeeId: string | null;
  expenseId: string;
  employeeName: string;
  employeeCpf: string;
  grossSalary: { toString(): string } | number;
  advanceAmount: { toString(): string } | number;
  remainingSalary: { toString(): string } | number;
  referenceMonth: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  expense: {
    id: string;
    paymentMethod: string | null;
  };
}) => ({
  id: advance.id,
  employeeId: advance.employeeId,
  expenseId: advance.expenseId,
  employeeName: advance.employeeName,
  employeeCpf: advance.employeeCpf,
  grossSalary: Number(advance.grossSalary),
  advanceAmount: Number(advance.advanceAmount),
  remainingSalary: Number(advance.remainingSalary),
  referenceMonth: advance.referenceMonth.toISOString(),
  notes: advance.notes,
  createdAt: advance.createdAt.toISOString(),
  updatedAt: advance.updatedAt.toISOString(),
  paymentMethod: advance.expense.paymentMethod,
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
    const currentReferenceMonth = getBrazilReferenceMonth();

    const [sales, expenses, salaryAdvances, employees, company] = await Promise.all([
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
        include: {
          salaryAdvance: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.salaryAdvance.findMany({
        where: { companyId },
        include: {
          expense: {
            select: {
              id: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.user.findMany({
        where: {
          companyId,
        },
        orderBy: [{ fullName: "asc" }, { name: "asc" }],
        select: {
          id: true,
          fullName: true,
          name: true,
          cpf: true,
          role: true,
        },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          logoUrl: true,
        },
      }),
    ]);

    let totalSales = 0;
    let shopPaidTotal = 0;
    let personalPaidTotal = 0;
    let pendingTotal = 0;
    let overdueCount = 0;
    let salaryAdvanceTotal = 0;
    let salaryAdvanceCount = 0;

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

    const latestRemainingByEmployee = new Map<string, number>();

    salaryAdvances.forEach((advance) => {
      if (
        advance.referenceMonth.getTime() === currentReferenceMonth.getTime()
      ) {
        salaryAdvanceTotal += Number(advance.advanceAmount);
        salaryAdvanceCount += 1;
        latestRemainingByEmployee.set(
          advance.employeeCpf,
          Number(advance.remainingSalary),
        );
      }
    });

    return NextResponse.json({
      expenses: expenses.map(serializeExpense),
      salaryAdvances: salaryAdvances.map(serializeSalaryAdvance),
      employees: employees.map((employee) => ({
        id: employee.id,
        fullName: employee.fullName || employee.name || "",
        cpf: employee.cpf,
        role: employee.role,
      })),
      company: {
        name: company?.name || "Minha Empresa",
        logoUrl: company?.logoUrl || "/wtm-float.png",
      },
      summary: {
        totalSales,
        shopPaidTotal,
        personalPaidTotal,
        pendingTotal,
        overdueCount,
        cashBalance: totalSales - shopPaidTotal,
        salaryAdvanceTotal,
        salaryAdvanceCount,
        salaryAdvanceOutstanding: Array.from(
          latestRemainingByEmployee.values(),
        ).reduce((accumulator, value) => accumulator + value, 0),
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
