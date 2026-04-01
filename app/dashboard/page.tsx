"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Activity,
  CalendarCheck,
  AlertTriangle,
  Wallet,
  Store,
  User,
} from "lucide-react";
import { WeeklyRevenueChart } from "@/components/WeeklyRevenueChart";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { DateRangePickerGlass } from "@/components/DateRangePickerGlass";
import { PaymentMethodsChart } from "@/components/ReportsCharts";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  getDailyProfit,
  getWeeklyEvolution,
  getCriticalStockAlerts,
  getStockValue,
  getTotalStockItems,
  getDashboardPaymentMethods,
  getCashBalanceSummary,
  getExpenseBreakdownSummary,
  getRecurringCommitmentsSummary,
} from "@/app/actions/dashboard";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const toInput = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: toInput(start),
    endDate: toInput(end),
  };
};

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  type = "profit",
  loading = false,
  alertCount = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  type?: "profit" | "stock";
  loading?: boolean;
  alertCount?: number;
}) => {
  const isProfit = type === "profit";
  const colorClasses = isProfit
    ? "bg-zinc-950/70 border border-zinc-700/50 hover:border-amber-600/30"
    : "bg-zinc-950/70 border border-zinc-700/50 hover:border-blue-600/30";

  const iconBgClasses = isProfit
    ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black"
    : "bg-gradient-to-br from-blue-400 to-cyan-600 text-white";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:p-6 ${colorClasses}`}
    >
      {alertCount > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse blur-md opacity-50" />
            <div className="relative bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {alertCount > 9 ? "9+" : alertCount}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between z-10 relative">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400 sm:text-sm">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-700/50 rounded animate-pulse my-1" />
          ) : (
            <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {value}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 sm:p-3 ${iconBgClasses}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isProfit ? "bg-amber-400" : "bg-cyan-500"
        }`}
      />
    </div>
  );
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "active" | "inactive"
  >("connecting");
  const [userRole, setUserRole] = useState<"ADMIN" | "ATTENDANT" | null>(null);
  const [trialStatus, setTrialStatus] = useState<{
    subscriptionStatus: string;
    daysRemaining: number;
    isTrialActive: boolean;
  } | null>(null);
  const [dateRange, setDateRange] = useState(getDefaultRange);
  const [dailyProfit, setDailyProfit] = useState({
    value: 0,
    formatted: "R$ 0,00",
    itemsCount: 0,
  });
  const [weeklyEvolution, setWeeklyEvolution] = useState<any[]>([]);
  const [stockValue, setStockValue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [cashBalance, setCashBalance] = useState({
    cashBalance: 0,
    totalSales: 0,
    shopExpenses: 0,
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState({
    shop: 0,
    personal: 0,
  });
  const [recurringCommitments, setRecurringCommitments] = useState({
    monthLabel: "",
    total: 0,
    count: 0,
    pendingCount: 0,
    items: [] as Array<{
      id: string;
      description: string;
      category: string;
      amount: number;
      dueDate: string;
      status: string;
    }>,
  });
  const [criticalAlerts, setCriticalAlerts] = useState<{
    count: number;
    items: Array<{
      id: string;
      name: string;
      stock: number;
      minStock: number;
      diff: number;
    }>;
  }>({
    count: 0,
    items: [],
  });
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const stockAlertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stockAlertPulse, setStockAlertPulse] = useState(false);

  const loadDashboard = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionData = sessionResponse.ok
          ? await sessionResponse.json()
          : null;
        const role = sessionData?.role === "ATTENDANT" ? "ATTENDANT" : "ADMIN";
        setUserRole(role);

        if (role === "ATTENDANT") {
          const [criticalData, totalItemsData, subscriptionResponse] =
            await Promise.all([
              getCriticalStockAlerts(),
              getTotalStockItems(),
              fetch("/api/subscription/status", { cache: "no-store" }),
            ]);

          setCriticalAlerts(criticalData);
          setTotalItems(totalItemsData);
          setDailyProfit({ value: 0, formatted: "R$ 0,00", itemsCount: 0 });
          setWeeklyEvolution([]);
          setStockValue(0);
          setPaymentMethods([]);
          setCashBalance({
            cashBalance: 0,
            totalSales: 0,
            shopExpenses: 0,
          });
          setExpenseBreakdown({ shop: 0, personal: 0 });
          setRecurringCommitments({
            monthLabel: "",
            total: 0,
            count: 0,
            pendingCount: 0,
            items: [],
          });

          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            setTrialStatus({
              subscriptionStatus: subscriptionData.subscriptionStatus,
              daysRemaining: subscriptionData.daysRemaining,
              isTrialActive: subscriptionData.isTrialActive,
            });
          }

          return;
        }

        const [
          profitData,
          evolutionData,
          criticalData,
          stockValueData,
          totalItemsData,
          paymentData,
          cashBalanceData,
          expenseBreakdownData,
          recurringCommitmentsData,
          subscriptionResponse,
        ] = await Promise.all([
          getDailyProfit(dateRange.startDate, dateRange.endDate),
          getWeeklyEvolution(dateRange.startDate, dateRange.endDate),
          getCriticalStockAlerts(),
          getStockValue(),
          getTotalStockItems(),
          getDashboardPaymentMethods(dateRange.startDate, dateRange.endDate),
          getCashBalanceSummary(dateRange.startDate, dateRange.endDate),
          getExpenseBreakdownSummary(dateRange.startDate, dateRange.endDate),
          getRecurringCommitmentsSummary(dateRange.endDate),
          fetch("/api/subscription/status", { cache: "no-store" }),
        ]);

        setDailyProfit(profitData);
        setWeeklyEvolution(evolutionData);
        setCriticalAlerts(criticalData);
        setStockValue(stockValueData);
        setTotalItems(totalItemsData);
        setPaymentMethods(paymentData);
        setCashBalance(cashBalanceData);
        setExpenseBreakdown(expenseBreakdownData);
        setRecurringCommitments(recurringCommitmentsData);

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setTrialStatus({
            subscriptionStatus: subscriptionData.subscriptionStatus,
            daysRemaining: subscriptionData.daysRemaining,
            isTrialActive: subscriptionData.isTrialActive,
          });
        }
      } catch (error) {
        console.error("[Dashboard] Error:", error);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [dateRange.endDate, dateRange.startDate],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setRealtimeStatus("inactive");
      return;
    }

    const scheduleDashboardRefresh = () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        void loadDashboard({ showLoading: false });
      }, 350);
    };

    setRealtimeStatus("connecting");

    const channel = supabase
      .channel("dashboard_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        scheduleDashboardRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        scheduleDashboardRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os" },
        scheduleDashboardRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        scheduleDashboardRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("active");
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("inactive");
          return;
        }

        setRealtimeStatus("connecting");
      });

    return () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }

      void channel.unsubscribe();
    };
  }, [loadDashboard]);

  useEffect(() => {
    const handleStockCriticalAlert = () => {
      setStockAlertPulse(true);

      if (stockAlertTimeoutRef.current) {
        clearTimeout(stockAlertTimeoutRef.current);
      }

      stockAlertTimeoutRef.current = setTimeout(() => {
        setStockAlertPulse(false);
        stockAlertTimeoutRef.current = null;
      }, 12000);
    };

    window.addEventListener("stock-critical-alert", handleStockCriticalAlert);

    return () => {
      window.removeEventListener("stock-critical-alert", handleStockCriticalAlert);
      if (stockAlertTimeoutRef.current) {
        clearTimeout(stockAlertTimeoutRef.current);
        stockAlertTimeoutRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const totalPaidExpenses =
    expenseBreakdown.shop + expenseBreakdown.personal;
  const shopPercent =
    totalPaidExpenses > 0
      ? (expenseBreakdown.shop / totalPaidExpenses) * 100
      : 0;
  const personalPercent =
    totalPaidExpenses > 0
      ? (expenseBreakdown.personal / totalPaidExpenses) * 100
      : 0;

  return (
    <div className="min-h-full bg-[#0B1120] text-slate-100 animate-in fade-in duration-500">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
        {searchParams.get("access") === "denied" && (
          <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-5 py-4 text-red-100">
            <p className="text-sm font-semibold">
              Acesso negado. Esta area e restrita ao administrador.
            </p>
          </div>
        )}

        <div className="mb-2 flex flex-col gap-4 md:mb-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-4xl">
              <div className="rounded-lg bg-linear-to-br from-amber-400 to-yellow-600 p-2">
                <Activity className="h-6 w-6 text-black sm:h-8 sm:w-8" />
              </div>
              <span className="min-w-0">Painel Profissional Multicell</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Período ativo: {formatDate(dateRange.startDate)} a{" "}
              {formatDate(dateRange.endDate)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 self-start md:items-end">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                stockAlertPulse
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : realtimeStatus === "active"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : realtimeStatus === "connecting"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-slate-700 bg-slate-800/70 text-slate-300"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  stockAlertPulse
                    ? "bg-red-400 animate-pulse"
                    : realtimeStatus === "active"
                    ? "bg-emerald-400 animate-pulse"
                    : realtimeStatus === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-slate-500"
                }`}
              />
              <span>
                {stockAlertPulse
                  ? "Estoque Crítico"
                  : realtimeStatus === "active"
                  ? "Realtime Ativo"
                  : realtimeStatus === "connecting"
                    ? "Realtime Conectando"
                    : "Realtime Inativo"}
              </span>
            </div>

            <DateRangePickerGlass
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              defaultFromDays={7}
              onDateRangeChange={(startDate, endDate) =>
                setDateRange({ startDate, endDate })
              }
            />
          </div>
        </div>

        {trialStatus?.subscriptionStatus === "unpaid" &&
          trialStatus.isTrialActive && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-amber-100">
            <p className="text-sm font-semibold">
              Você está no período de teste gratuito. Faltam{" "}
              {trialStatus.daysRemaining} dia(s) para o bloqueio.
            </p>
          </div>
          )}

        {userRole === "ATTENDANT" ? (
          <>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-cyan-100">
              <p className="text-sm font-semibold">
                Visão operacional ativa. Custos, lucros e despesas ficam
                visíveis apenas para o administrador.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <StatCard
                title="📊 Total de Itens"
                value={totalItems}
                subtitle="Unidades físicas em estoque"
                icon={Layers}
                type="stock"
              />
              <StatCard
                title="🚨 Itens Críticos"
                value={criticalAlerts.count}
                subtitle="Estoque baixo ou crítico"
                icon={AlertTriangle}
                type="stock"
                alertCount={criticalAlerts.count}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="💰 Lucro do Período"
                value={dailyProfit.formatted}
                subtitle={`${dailyProfit.itemsCount} transações`}
                icon={DollarSign}
                type="profit"
              />
              <StatCard
                title="📈 Evolução do Período"
                value={formatCurrency(
                  weeklyEvolution.reduce((acc, point) => acc + point.lucro, 0),
                )}
                subtitle="Lucro acumulado"
                icon={TrendingUp}
                type="profit"
              />
              <StatCard
                title="📅 Ticket de Lucro Médio"
                value={formatCurrency(
                  dailyProfit.itemsCount > 0
                    ? dailyProfit.value / dailyProfit.itemsCount
                    : 0,
                )}
                subtitle="Lucro médio por transação"
                icon={CalendarCheck}
                type="profit"
              />
              <StatCard
                title="💼 Saldo em Caixa"
                value={formatCurrency(cashBalance.cashBalance)}
                subtitle={`${formatCurrency(cashBalance.totalSales)} em vendas - ${formatCurrency(cashBalance.shopExpenses)} em despesas da loja`}
                icon={Wallet}
                type="profit"
              />

              <StatCard
                title="📦 Valor de Estoque"
                value={formatCurrency(stockValue)}
                subtitle="Custo total investido"
                icon={Package}
                type="stock"
              />
              <StatCard
                title="📊 Total de Itens"
                value={totalItems}
                subtitle="Unidades físicas em estoque"
                icon={Layers}
                type="stock"
              />
              <StatCard
                title="🚨 Itens Críticos"
                value={criticalAlerts.count}
                subtitle="Stock baixo/crítico"
                icon={AlertTriangle}
                type="stock"
                alertCount={criticalAlerts.count}
              />
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Compromissos do Mês
                  </h3>
                  <p className="text-sm text-slate-400">
                    Despesas recorrentes previstas para{" "}
                    {recurringCommitments.monthLabel || "o mês ativo"}, pagas ou
                    pendentes.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                    Total Previsto
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {formatCurrency(recurringCommitments.total)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {recurringCommitments.count} conta(s) recorrente(s) •{" "}
                    {recurringCommitments.pendingCount} pendente(s)
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {recurringCommitments.items.length > 0 ? (
                  recurringCommitments.items.slice(0, 6).map((expense) => (
                    <div
                      key={expense.id}
                      className="rounded-2xl border border-zinc-700/50 bg-[#0B1120]/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {expense.description}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {expense.category} • vence em{" "}
                            {formatDate(expense.dueDate)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            expense.status === "PAID"
                              ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                              : "border border-amber-400/20 bg-amber-500/10 text-amber-200"
                          }`}
                        >
                          {expense.status === "PAID" ? "Pago" : "Pendente"}
                        </span>
                      </div>

                      <p className="mt-4 text-lg font-bold text-white">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#0B1120]/60 px-5 py-6 text-sm text-slate-400 lg:col-span-3">
                    Nenhum compromisso recorrente cadastrado para este mês.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <WeeklyRevenueChart data={weeklyEvolution} loading={false} />
              <PaymentMethodsChart data={paymentMethods} />
            </div>

            <div className="rounded-2xl border border-zinc-700/50 bg-zinc-950/70 p-4 backdrop-blur-md sm:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Gastos Loja vs Gastos Pessoais
                  </h3>
                  <p className="text-sm text-slate-400">
                    Comparativo de despesas pagas no periodo selecionado.
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  Total pago: {formatCurrency(totalPaidExpenses)}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/20 bg-[#0B1120]/70 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200">
                      <Store className="h-4 w-4 text-amber-400" />
                      Despesas da Loja
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {shopPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                      style={{ width: `${shopPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {formatCurrency(expenseBreakdown.shop)}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-[#0B1120]/70 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                      <User className="h-4 w-4 text-cyan-400" />
                      Despesas Pessoais
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {personalPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${personalPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {formatCurrency(expenseBreakdown.personal)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {criticalAlerts.count > 0 && (
          <div className="rounded-2xl border border-red-700/30 bg-linear-to-r from-red-950/50 to-orange-950/50 p-4 shadow-lg backdrop-blur-md sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">
                ⚠️ Produtos com Estoque Crítico
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {criticalAlerts.items.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-red-500/20 bg-zinc-900/50 p-3"
                >
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Atual:{" "}
                    <span className="font-bold text-red-400">{item.stock}</span>{" "}
                    | Mínimo: {item.minStock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/70 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span>✅ Dados sincronizados</span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/privacidade"
                  className="transition-colors hover:text-slate-300"
                >
                  Privacidade
                </Link>
                <span>|</span>
                <Link
                  href="/termos"
                  className="transition-colors hover:text-slate-300"
                >
                  Termos
                </Link>
                <span>|</span>
                <Link
                  href="/suporte"
                  className="transition-colors hover:text-slate-300"
                >
                  Suporte
                </Link>
              </div>
            </div>
            <span>Multicell v3.0 • Tier 1 Profissional • Brasil/SP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
