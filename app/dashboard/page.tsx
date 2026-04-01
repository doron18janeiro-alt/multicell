"use client";

import { Suspense, useEffect, useState } from "react";
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
import {
  getDailyProfit,
  getWeeklyEvolution,
  getCriticalStockAlerts,
  getStockValue,
  getTotalStockItems,
  getDashboardPaymentMethods,
  getCashBalanceSummary,
  getExpenseBreakdownSummary,
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
      className={`relative overflow-hidden rounded-2xl backdrop-blur-md p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colorClasses}`}
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
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-700/50 rounded animate-pulse my-1" />
          ) : (
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {value}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses}`}>
          <Icon className="w-6 h-6" />
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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    loadDashboard();
  }, [dateRange.startDate, dateRange.endDate]);

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
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8 animate-in fade-in duration-500">
      {searchParams.get("access") === "denied" && (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-5 py-4 text-red-100">
          <p className="text-sm font-semibold">
            Acesso negado. Esta area e restrita ao administrador.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-amber-400 to-yellow-600 rounded-lg">
              <Activity className="w-8 h-8 text-black" />
            </div>
            Painel Profissional Multicell
          </h1>
          <p className="text-slate-400 mt-2">
            Período ativo: {formatDate(dateRange.startDate)} a{" "}
            {formatDate(dateRange.endDate)}
          </p>
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
              Visão operacional ativa. Custos, lucros e despesas ficam visíveis
              apenas para o administrador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WeeklyRevenueChart data={weeklyEvolution} loading={false} />
            <PaymentMethodsChart data={paymentMethods} />
          </div>

          <div className="rounded-2xl border border-zinc-700/50 bg-zinc-950/70 p-6 backdrop-blur-md">
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
                    <Store className="w-4 h-4 text-amber-400" />
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
                    <User className="w-4 h-4 text-cyan-400" />
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
        <div className="bg-linear-to-r from-red-950/50 to-orange-950/50 backdrop-blur-md rounded-2xl border border-red-700/30 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white">
              ⚠️ Produtos com Estoque Crítico
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalAlerts.items.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900/50 border border-red-500/20 rounded-lg p-3"
              >
                <p className="font-medium text-white text-sm">{item.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Atual: <span className="text-red-400 font-bold">{item.stock}</span>{" "}
                  | Mínimo: {item.minStock}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg border border-zinc-700/50 bg-zinc-950/70 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>✅ Dados sincronizados</span>
          <span>Multicell v3.0 • Tier 1 Profissional • Brasil/SP</span>
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
