"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
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
  paidAt: string | null;
  status: "PENDING" | "PAID";
  type: (typeof EXPENSE_TYPES)[number];
  paymentMethod: (typeof EXPENSE_PAYMENT_METHODS)[number] | null;
};

type ExpensesSummary = {
  totalSales: number;
  shopPaidTotal: number;
  personalPaidTotal: number;
  pendingTotal: number;
  overdueCount: number;
  cashBalance: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
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
};

export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpensesSummary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState<
    (typeof EXPENSE_PAYMENT_METHODS)[number]
  >("PIX");
  const [formData, setFormData] = useState({
    category: "OUTROS" as (typeof EXPENSE_CATEGORIES)[number],
    description: "",
    amount: "",
    dueDate: formatExpenseDateInput(new Date()),
    type: "SHOP" as (typeof EXPENSE_TYPES)[number],
  });

  const resetForm = () => {
    setFormData({
      category: "OUTROS",
      description: "",
      amount: "",
      dueDate: formatExpenseDateInput(new Date()),
      type: "SHOP",
    });
    setEditingExpense(null);
  };

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

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      dueDate: formatExpenseDateInput(expense.dueDate),
      type: expense.type,
    });
    setShowCreateModal(true);
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
      setMessage("Despesa quitada com sucesso.");
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setMessage("Erro ao processar pagamento.");
    } finally {
      setPaying(false);
    }
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
        </header>

        {message && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm font-medium text-amber-100">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
