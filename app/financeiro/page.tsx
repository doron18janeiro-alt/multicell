"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Pencil,
  Printer,
  Plus,
  Search,
  Store,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
import { VoucherPrint, type VoucherPrintData } from "@/components/Financeiro/VoucherPrint";
import { formatCpf } from "@/lib/cpf";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPES,
  formatExpenseDateInput,
  isExpenseOverdue,
} from "@/lib/expenses";

type Expense = {
  id: string;
  description: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  nextDueDate: string | null;
  paidAt: string | null;
  status: "PENDING" | "PAID";
  type: (typeof EXPENSE_TYPES)[number];
  paymentMethod: (typeof EXPENSE_PAYMENT_METHODS)[number] | null;
  salaryAdvanceId?: string | null;
};

type SalaryAdvance = VoucherPrintData & {
  id: string;
  employeeId: string | null;
  expenseId: string;
  createdAt: string;
  updatedAt: string;
};

type EmployeeOption = {
  id: string;
  fullName: string;
  cpf: string | null;
  role: "ADMIN" | "FUNCIONARIO" | "CONTADOR" | "ATTENDANT";
};

type ExpensesSummary = {
  totalSales: number;
  shopPaidTotal: number;
  personalPaidTotal: number;
  pendingTotal: number;
  overdueCount: number;
  cashBalance: number;
  salaryAdvanceTotal: number;
  salaryAdvanceCount: number;
  salaryAdvanceOutstanding: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const formatDate = (value: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "--";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "--";

const initialSummary: ExpensesSummary = {
  totalSales: 0,
  shopPaidTotal: 0,
  personalPaidTotal: 0,
  pendingTotal: 0,
  overdueCount: 0,
  cashBalance: 0,
  salaryAdvanceTotal: 0,
  salaryAdvanceCount: 0,
  salaryAdvanceOutstanding: 0,
};

export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [companyName, setCompanyName] = useState("Minha Empresa");
  const [summary, setSummary] = useState<ExpensesSummary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState<
    (typeof EXPENSE_PAYMENT_METHODS)[number]
  >("PIX");
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: "",
    grossSalary: "",
    amount: "",
    paymentMethod: "PIX" as (typeof EXPENSE_PAYMENT_METHODS)[number],
    notes: "",
  });
  const [voucherToPrint, setVoucherToPrint] = useState<SalaryAdvance | null>(null);
  const [pendingVoucherPrint, setPendingVoucherPrint] = useState(false);
  const voucherPrintRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    category: "OUTROS" as (typeof EXPENSE_CATEGORIES)[number],
    description: "",
    amount: "",
    dueDate: formatExpenseDateInput(new Date()),
    type: "SHOP" as (typeof EXPENSE_TYPES)[number],
    isRecurring: false,
  });

  const resetForm = () => {
    setFormData({
      category: "OUTROS",
      description: "",
      amount: "",
      dueDate: formatExpenseDateInput(new Date()),
      type: "SHOP",
      isRecurring: false,
    });
    setEditingExpense(null);
  };

  const resetAdvanceForm = () => {
    setAdvanceForm({
      employeeId: "",
      grossSalary: "",
      amount: "",
      paymentMethod: "PIX",
      notes: "",
    });
  };

  const handleVoucherPrint = useReactToPrint({
    contentRef: voucherPrintRef,
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/expenses", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Erro ao carregar despesas.");
        return;
      }

      setExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
      setSalaryAdvances(
        Array.isArray(payload.salaryAdvances) ? payload.salaryAdvances : [],
      );
      setEmployees(Array.isArray(payload.employees) ? payload.employees : []);
      setCompanyName(payload.company?.name || "Minha Empresa");
      setSummary(payload.summary || initialSummary);
    } catch (error) {
      console.error(error);
      setMessage("Erro ao carregar o modulo financeiro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (!pendingVoucherPrint || !voucherToPrint) {
      return;
    }

    handleVoucherPrint();
    setPendingVoucherPrint(false);
  }, [handleVoucherPrint, pendingVoucherPrint, voucherToPrint]);

  const employeesWithCpf = useMemo(
    () => employees.filter((employee) => Boolean(employee.cpf)),
    [employees],
  );

  const currentReferenceMonth = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).format(new Date()),
    [],
  );

  const selectedAdvanceEmployee = useMemo(
    () =>
      employeesWithCpf.find(
        (employee) => employee.id === advanceForm.employeeId,
      ) || null,
    [advanceForm.employeeId, employeesWithCpf],
  );

  const employeeMonthAdvances = useMemo(() => {
    if (!selectedAdvanceEmployee) {
      return [];
    }

    return salaryAdvances.filter((advance) => {
      const advanceMonth = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(advance.referenceMonth || advance.createdAt));

      return (
        advanceMonth === currentReferenceMonth &&
        (advance.employeeId === selectedAdvanceEmployee.id ||
          advance.employeeCpf === selectedAdvanceEmployee.cpf)
      );
    });
  }, [currentReferenceMonth, salaryAdvances, selectedAdvanceEmployee]);

  const employeeAdvanceTotal = useMemo(
    () =>
      employeeMonthAdvances.reduce(
        (accumulator, advance) => accumulator + Number(advance.advanceAmount || 0),
        0,
      ),
    [employeeMonthAdvances],
  );

  const latestAdvanceForEmployee = employeeMonthAdvances[0] || null;
  const previewRemainingSalary = useMemo(() => {
    const grossSalary = Number(advanceForm.grossSalary || 0);
    const advanceAmount = Number(advanceForm.amount || 0);

    if (!Number.isFinite(grossSalary) || grossSalary <= 0) {
      return null;
    }

    return grossSalary - employeeAdvanceTotal - advanceAmount;
  }, [advanceForm.amount, advanceForm.grossSalary, employeeAdvanceTotal]);

  useEffect(() => {
    if (
      !showAdvanceModal ||
      !selectedAdvanceEmployee ||
      advanceForm.grossSalary ||
      !latestAdvanceForEmployee
    ) {
      return;
    }

    setAdvanceForm((current) =>
      current.employeeId === selectedAdvanceEmployee.id && !current.grossSalary
        ? {
            ...current,
            grossSalary: String(latestAdvanceForEmployee.grossSalary),
          }
        : current,
    );
  }, [
    advanceForm.grossSalary,
    latestAdvanceForEmployee,
    selectedAdvanceEmployee,
    showAdvanceModal,
  ]);

  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter((expense) => {
        const matchesSearch =
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          EXPENSE_CATEGORY_LABELS[expense.category]
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" || expense.status === statusFilter;
        const matchesType = typeFilter === "ALL" || expense.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        const aOverdue = isExpenseOverdue(a.dueDate, a.status);
        const bOverdue = isExpenseOverdue(b.dueDate, b.status);

        if (aOverdue !== bOverdue) {
          return aOverdue ? -1 : 1;
        }

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [expenses, searchTerm, statusFilter, typeFilter]);

  const handleSaveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const isEditing = Boolean(editingExpense);
      const response = await fetch(
        isEditing ? `/api/expenses/${editingExpense?.id}` : "/api/expenses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(
          payload.error ||
            (isEditing
              ? "Erro ao atualizar despesa."
              : "Erro ao criar despesa."),
        );
        return;
      }

      setShowCreateModal(false);
      resetForm();
      setMessage(
        isEditing
          ? "Despesa atualizada com sucesso."
          : "Despesa cadastrada com sucesso.",
      );
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setMessage(
        editingExpense
          ? "Erro ao atualizar despesa."
          : "Erro ao salvar despesa.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdvance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingAdvance(true);
    setMessage("");

    try {
      const response = await fetch("/api/expenses/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: advanceForm.employeeId,
          grossSalary: Number(advanceForm.grossSalary || 0),
          amount: Number(advanceForm.amount || 0),
          paymentMethod: advanceForm.paymentMethod,
          notes: advanceForm.notes,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Erro ao lançar vale/adiantamento.");
        return;
      }

      setShowAdvanceModal(false);
      resetAdvanceForm();
      setVoucherToPrint(payload.advance || null);
      setPendingVoucherPrint(Boolean(payload.advance));
      setMessage("Vale/adiantamento registrado com sucesso.");
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setMessage("Erro ao lançar vale/adiantamento.");
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      dueDate: formatExpenseDateInput(expense.dueDate),
      type: expense.type,
      isRecurring: expense.isRecurring,
    });
    setShowCreateModal(true);
  };

  const maybeCreateNextRecurringExpense = async (suggestion: {
    description: string;
    category: (typeof EXPENSE_CATEGORIES)[number];
    amount: number;
    dueDate: string;
    dueDateIso: string;
    type: (typeof EXPENSE_TYPES)[number];
    isRecurring: boolean;
  }) => {
    const confirmed = window.confirm(
      `Conta recorrente quitada. Deseja criar agora a próxima despesa para ${formatDate(suggestion.dueDateIso)}?`,
    );

    if (!confirmed) {
      return `Despesa quitada. Próxima parcela sugerida para ${formatDate(suggestion.dueDateIso)}.`;
    }

    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: suggestion.description,
        category: suggestion.category,
        amount: suggestion.amount,
        dueDate: suggestion.dueDate,
        type: suggestion.type,
        isRecurring: suggestion.isRecurring,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      return `Despesa quitada, mas a próxima parcela não foi criada: ${payload.error || "erro desconhecido"}.`;
    }

    return `Despesa quitada e próxima parcela criada para ${formatDate(suggestion.dueDateIso)}.`;
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja apagar esta despesa?",
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Erro ao excluir despesa.");
        return;
      }

      if (editingExpense?.id === expense.id) {
        setShowCreateModal(false);
        resetForm();
      }

      setMessage("Despesa excluida com sucesso.");
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setMessage("Erro ao excluir despesa.");
    }
  };

  const handlePayExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!expenseToPay) return;

    setPaying(true);
    setMessage("");

    try {
      const response = await fetch(`/api/expenses/${expenseToPay.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Erro ao registrar pagamento.");
        return;
      }

      setExpenseToPay(null);
      setPaymentMethod("PIX");
      let successMessage = "Despesa quitada com sucesso.";

      if (payload.recurringSuggestion) {
        successMessage = await maybeCreateNextRecurringExpense(
          payload.recurringSuggestion,
        );
      }

      setMessage(successMessage);
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setMessage("Erro ao processar pagamento.");
    } finally {
      setPaying(false);
    }
  };

  const handleReprintAdvance = (advance: SalaryAdvance) => {
    setVoucherToPrint(advance);
    setPendingVoucherPrint(true);
  };

  const totalExpensePaid = summary.shopPaidTotal + summary.personalPaidTotal;
  const shopPercent =
    totalExpensePaid > 0 ? (summary.shopPaidTotal / totalExpensePaid) * 100 : 0;
  const personalPercent =
    totalExpensePaid > 0
      ? (summary.personalPaidTotal / totalExpensePaid) * 100
      : 0;

  return (
    <div className="min-h-full bg-[#0B1120] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold text-white sm:text-3xl xl:text-4xl">
              <div className="rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 p-2 text-black">
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <span>Financeiro Elite</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Gestao de despesas, fluxo de caixa e alerta visual para contas
              vencidas.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => {
                const defaultEmployee = employeesWithCpf[0] || null;
                resetAdvanceForm();
                setAdvanceForm((current) => ({
                  ...current,
                  employeeId: defaultEmployee?.id || "",
                }));
                setShowAdvanceModal(true);
              }}
              disabled={employeesWithCpf.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-3 text-sm font-bold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <FileText className="h-5 w-5" />
              Lancar Vale
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 text-sm font-bold text-black shadow-[0_0_30px_rgba(250,204,21,0.25)] transition-transform hover:scale-[1.01] sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              Nova Despesa
            </button>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm font-medium text-amber-100">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Saldo em Caixa</p>
            <Wallet className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {formatCurrency(summary.cashBalance)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Vendas totais - despesas da loja pagas
          </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Entradas em Vendas</p>
            <ArrowUpCircle className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {formatCurrency(summary.totalSales)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Base para o saldo do caixa
          </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Pendentes</p>
            <ArrowDownCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {formatCurrency(summary.pendingTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {summary.overdueCount} conta(s) vencida(s)
          </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Gastos Pagos</p>
            <CheckCircle2 className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {formatCurrency(totalExpensePaid)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Loja {formatCurrency(summary.shopPaidTotal)} | Pessoal{" "}
            {formatCurrency(summary.personalPaidTotal)}
          </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Vales no Mês</p>
            <FileText className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {formatCurrency(summary.salaryAdvanceTotal)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {summary.salaryAdvanceCount} lancamento(s) | saldo restante{" "}
            {formatCurrency(summary.salaryAdvanceOutstanding)}
          </p>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Historico de Vales e Adiantamentos
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Cada lancamento registra funcionario, CPF, data/hora exata e o saldo
                restante a pagar no fechamento do mes.
              </p>
            </div>

            {employeesWithCpf.length === 0 ? (
              <span className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                Cadastre funcionarios com CPF para liberar o modulo de vales.
              </span>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {salaryAdvances.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#0B1120]/60 px-6 py-10 text-center text-slate-400">
                Nenhum vale/adiantamento registrado ate o momento.
              </div>
            ) : (
              salaryAdvances.map((advance) => (
                <div
                  key={advance.id}
                  className="rounded-2xl border border-zinc-700/60 bg-[#0B1120]/70 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                          Vale / Adiantamento
                        </span>
                        <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs font-semibold text-slate-300">
                          {formatDateTime(advance.createdAt)}
                        </span>
                      </div>

                      <div>
                        <p className="text-lg font-semibold text-white">
                          {advance.employeeName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {formatCpf(advance.employeeCpf)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {EXPENSE_PAYMENT_METHOD_LABELS[
                              (advance.paymentMethod || "PIX") as (typeof EXPENSE_PAYMENT_METHODS)[number]
                            ] || advance.paymentMethod || "Nao informado"}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Mes ref. {formatDate(advance.referenceMonth)}
                          </span>
                        </div>
                      </div>

                      {advance.notes ? (
                        <p className="rounded-2xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-slate-300">
                          {advance.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-100">
                          Vale
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {formatCurrency(advance.advanceAmount)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-700 bg-zinc-900/70 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Salario Base
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {formatCurrency(advance.grossSalary)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">
                          Restante do Mes
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {formatCurrency(advance.remainingSalary)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleReprintAdvance(advance)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-white"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir cupom
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-zinc-700/50 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold text-white">
              Lista de Despesas
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar descricao"
                  className="w-full rounded-xl border border-zinc-700 bg-[#0B1120] py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-colors focus:border-amber-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-[#0B1120] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="ALL">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="PAID">Pagas</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-[#0B1120] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              >
                <option value="ALL">Todos os tipos</option>
                <option value="SHOP">Loja</option>
                <option value="PERSONAL">Pessoal</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Carregando despesas...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#0B1120]/60 px-6 py-12 text-center text-slate-400">
              Nenhuma despesa encontrada para os filtros atuais.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => {
                const overdue = isExpenseOverdue(expense.dueDate, expense.status);
                const isSalaryAdvanceExpense = Boolean(expense.salaryAdvanceId);

                return (
                  <div
                    key={expense.id}
                    className={`rounded-2xl border p-5 backdrop-blur-md transition-all ${
                      overdue
                        ? "border-red-500/70 bg-red-500/10 shadow-[0_0_35px_rgba(239,68,68,0.16)] animate-pulse"
                        : "border-zinc-700/50 bg-[#0B1120]/70"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                            {EXPENSE_CATEGORY_LABELS[expense.category]}
                          </span>
                          <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                            {EXPENSE_TYPE_LABELS[expense.type]}
                          </span>
                          {expense.isRecurring && (
                            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                              Recorrente mensal
                            </span>
                          )}
                          {isSalaryAdvanceExpense && (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                              Vale / Adiantamento
                            </span>
                          )}
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              expense.status === "PAID"
                                ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                : "border border-red-400/20 bg-red-500/10 text-red-200"
                            }`}
                          >
                            {EXPENSE_STATUS_LABELS[expense.status]}
                          </span>
                          {overdue && (
                            <span className="rounded-full border border-red-400/20 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-100">
                              Vencida
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-lg font-semibold text-white">
                            {expense.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="w-4 h-4" />
                              Vence em {formatDate(expense.dueDate)}
                            </span>
                            {expense.isRecurring && expense.nextDueDate && (
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                Proxima em {formatDate(expense.nextDueDate)}
                              </span>
                            )}
                            {expense.paidAt && (
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Pago em {formatDate(expense.paidAt)}
                              </span>
                            )}
                            {expense.paymentMethod && (
                              <span className="inline-flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                {
                                  EXPENSE_PAYMENT_METHOD_LABELS[
                                    expense.paymentMethod
                                  ]
                                }
                              </span>
                            )}
                            {isSalaryAdvanceExpense && (
                              <span className="inline-flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Gerenciado pelo modulo de vales
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 lg:items-end">
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(expense.amount)}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {expense.status === "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setExpenseToPay(expense);
                                setPaymentMethod("PIX");
                              }}
                              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
                            >
                              Pagar
                            </button>
                          ) : (
                            <span className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-slate-300">
                              Quitada
                            </span>
                          )}

                          {!isSalaryAdvanceExpense ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditExpense(expense)}
                                className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-amber-200 transition-colors hover:bg-amber-400/20"
                                aria-label={`Editar despesa ${expense.description}`}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense)}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-200 transition-colors hover:bg-red-500/20"
                                aria-label={`Excluir despesa ${expense.description}`}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-700/50 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Loja vs Pessoal
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Indicador de destino do dinheiro nas despesas ja pagas.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-200">
                    <Store className="w-4 h-4 text-amber-400" />
                    Loja
                  </span>
                  <span className="font-semibold text-white">
                    {shopPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                    style={{ width: `${shopPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {formatCurrency(summary.shopPaidTotal)}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-200">
                    <User className="w-4 h-4 text-cyan-400" />
                    Pessoal
                  </span>
                  <span className="font-semibold text-white">
                    {personalPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{ width: `${personalPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {formatCurrency(summary.personalPaidTotal)}
                </p>
              </div>
            </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Alertas vivos</h3>
                <p className="text-sm text-slate-400">
                  Contas vencidas pulsam em vermelho ate serem quitadas.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {summary.overdueCount > 0
                ? `${summary.overdueCount} despesa(s) vencida(s) exigem atencao imediata.`
                : "Nenhuma despesa vencida no momento."}
            </div>
          </div>
        </div>
      </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-[#0B1120]/95 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingExpense ? "Editar Despesa" : "Nova Despesa"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {editingExpense
                    ? "Ajuste os dados da despesa selecionada."
                    : "Cadastre uma conta da loja ou um gasto pessoal."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-xl border border-zinc-700 p-2 text-slate-400 transition-colors hover:border-red-400 hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EXPENSE_TYPES.map((expenseType) => {
                  const active = formData.type === expenseType;

                  return (
                    <button
                      key={expenseType}
                      type="button"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          type: expenseType,
                        }))
                      }
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-amber-400 bg-amber-400/10 text-amber-100"
                          : "border-zinc-700 bg-zinc-950/50 text-slate-300 hover:border-zinc-500"
                      }`}
                    >
                      <p className="font-semibold">
                        {EXPENSE_TYPE_LABELS[expenseType]}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {expenseType === "SHOP"
                          ? "Entra nos indicadores de caixa e lucro real."
                          : "Fica separado para controle pessoal."}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        category: event.target.value as (typeof EXPENSE_CATEGORIES)[number],
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {EXPENSE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Data de vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Descricao
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex: Conta de energia da loja"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Valor
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-zinc-700 bg-zinc-950/50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      isRecurring: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Repetir mensalmente?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Ao quitar esta conta, o sistema sugere a criação automática
                    da próxima parcela com vencimento no mês seguinte.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-slate-300 transition-colors hover:border-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 font-bold text-black transition-opacity disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : editingExpense
                      ? "Salvar alteracoes"
                      : "Salvar despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdvanceModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-[#0B1120]/95 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Lancar Vale / Adiantamento
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Registra a saida de caixa imediata e calcula quanto ainda resta
                  pagar no fechamento do mes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdvanceModal(false);
                  resetAdvanceForm();
                }}
                className="rounded-xl border border-zinc-700 p-2 text-slate-400 transition-colors hover:border-red-400 hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Funcionario
                  </label>
                  <select
                    value={advanceForm.employeeId}
                    onChange={(event) => {
                      const nextEmployeeId = event.target.value;
                      const employee = employeesWithCpf.find(
                        (item) => item.id === nextEmployeeId,
                      );
                      const latestAdvance = salaryAdvances.find(
                        (advance) =>
                          advance.employeeId === nextEmployeeId ||
                          (employee?.cpf && advance.employeeCpf === employee.cpf),
                      );

                      setAdvanceForm((current) => ({
                        ...current,
                        employeeId: nextEmployeeId,
                        grossSalary:
                          current.grossSalary ||
                          (latestAdvance
                            ? String(latestAdvance.grossSalary)
                            : current.grossSalary),
                      }));
                    }}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                    required
                  >
                    <option value="">Selecione</option>
                    {employeesWithCpf.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} • {formatCpf(employee.cpf || "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Forma de pagamento
                  </label>
                  <select
                    value={advanceForm.paymentMethod}
                    onChange={(event) =>
                      setAdvanceForm((current) => ({
                        ...current,
                        paymentMethod:
                          event.target.value as (typeof EXPENSE_PAYMENT_METHODS)[number],
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  >
                    {EXPENSE_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {EXPENSE_PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Salario Base do Mes
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advanceForm.grossSalary}
                    onChange={(event) =>
                      setAdvanceForm((current) => ({
                        ...current,
                        grossSalary: event.target.value,
                      }))
                    }
                    placeholder="2000.00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Valor do Vale
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advanceForm.amount}
                    onChange={(event) =>
                      setAdvanceForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="500.00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-slate-200">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Ja adiantado no mes
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {formatCurrency(employeeAdvanceTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Ultimo saldo restante
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {latestAdvanceForEmployee
                        ? formatCurrency(latestAdvanceForEmployee.remainingSalary)
                        : "R$ 0,00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Saldo apos este vale
                    </p>
                    <p
                      className={`mt-2 text-lg font-bold ${
                        previewRemainingSalary !== null && previewRemainingSalary < 0
                          ? "text-red-200"
                          : "text-white"
                      }`}
                    >
                      {previewRemainingSalary === null
                        ? "--"
                        : formatCurrency(previewRemainingSalary)}
                    </p>
                  </div>
                </div>

                {selectedAdvanceEmployee?.cpf ? (
                  <p className="mt-4 text-xs text-cyan-50/80">
                    CPF vinculado: {formatCpf(selectedAdvanceEmployee.cpf)}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Observacoes
                </label>
                <textarea
                  value={advanceForm.notes}
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Ex: vale quinzenal, ajuda de deslocamento, adiantamento excepcional..."
                  className="min-h-28 w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanceModal(false);
                    resetAdvanceForm();
                  }}
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-slate-300 transition-colors hover:border-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    savingAdvance ||
                    !advanceForm.employeeId ||
                    !advanceForm.grossSalary ||
                    !advanceForm.amount
                  }
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAdvance ? "Lancando..." : "Confirmar vale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {expenseToPay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-[#0B1120]/95 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Quitar Despesa
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Selecione a forma de pagamento para concluir a baixa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseToPay(null)}
                className="rounded-xl border border-zinc-700 p-2 text-slate-400 transition-colors hover:border-red-400 hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4">
              <p className="text-sm text-slate-400">Despesa selecionada</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {expenseToPay.description}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {formatCurrency(expenseToPay.amount)} | vence em{" "}
                {formatDate(expenseToPay.dueDate)}
              </p>
            </div>

            <form onSubmit={handlePayExpense} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Forma de pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as (typeof EXPENSE_PAYMENT_METHODS)[number],
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                >
                  {EXPENSE_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {EXPENSE_PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseToPay(null)}
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-slate-300 transition-colors hover:border-zinc-500"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white transition-opacity disabled:opacity-60"
                >
                  {paying ? "Registrando..." : "Confirmar pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {voucherToPrint && (
        <div className="pointer-events-none fixed left-[-9999px] top-0">
          <div ref={voucherPrintRef}>
            <VoucherPrint companyName={companyName} voucher={voucherToPrint} />
          </div>
        </div>
      )}
    </div>
  );
}
