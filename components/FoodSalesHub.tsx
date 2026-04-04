"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  NotebookPen,
  ReceiptText,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/food";

type FoodDashboardPayload = {
  summary: {
    totalTables: number;
    occupiedTables: number;
    availableTables: number;
    openTableBalance: number;
    pendingBalance: number;
    overdueCount: number;
    recentSalesTotal: number;
  };
  tables: Array<{
    id: string;
    number: string;
    status: "DISPONIVEL" | "OCUPADO";
    currentOrder: null | {
      id: string;
      status: string;
      total: number;
      paidAmount: number;
      pendingTransferredAmount: number;
      balanceDue: number;
      customer: null | {
        id: string;
        name: string;
        phone: string;
        document?: string | null;
      };
      items: Array<{
        id: string;
        description: string;
        quantity: number;
        settledQuantity: number;
        unitPrice: number;
        createdAt: string;
      }>;
    };
  }>;
  pendingEntries: Array<{
    id: string;
    amount: number;
    dueDate?: string | null;
    status: string;
    summary: string;
    customer: {
      id: string;
      name: string;
      phone: string;
      document?: string | null;
      pendingBalance: number;
    };
    order?: {
      id: string;
      tableNumber?: string | null;
    } | null;
  }>;
  recentSales: Array<{
    id: number;
    total: number;
    paymentMethod: string;
    tableNumber?: string | null;
    customerName?: string | null;
    createdAt: string;
  }>;
};

const statCards = (summary: FoodDashboardPayload["summary"]) => [
  {
    label: "Mesas Ocupadas",
    value: summary.occupiedTables,
    helper: `${summary.availableTables} disponíveis`,
    tone: "red",
    icon: UtensilsCrossed,
  },
  {
    label: "Saldo em Mesas",
    value: formatCurrency(summary.openTableBalance),
    helper: "Conta ainda em aberto",
    tone: "amber",
    icon: DollarSign,
  },
  {
    label: "Pendentes",
    value: formatCurrency(summary.pendingBalance),
    helper:
      summary.overdueCount > 0
        ? `${summary.overdueCount} vencido(s)`
        : "Sem atrasos críticos",
    tone: summary.overdueCount > 0 ? "red" : "sky",
    icon: NotebookPen,
  },
  {
    label: "Caixa Recente",
    value: formatCurrency(summary.recentSalesTotal),
    helper: "Últimas vendas registradas",
    tone: "emerald",
    icon: Wallet,
  },
] as const;

const toneClassMap = {
  red: "border-red-500/20 bg-red-500/10 text-red-100",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
};

const FOOD_DASHBOARD_REFRESH_EVENT = "wtm-food-dashboard-refresh";
const FOOD_DASHBOARD_REFRESH_STORAGE_KEY = "wtm-food-dashboard-refresh";

export function FoodSalesHub() {
  const [data, setData] = useState<FoodDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const response = await fetch("/api/food/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar painel gastronômico.");
      }

      const payload = await response.json();
      setData(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(loadDashboard, 30000);
    const handleRefresh = () => {
      void loadDashboard();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FOOD_DASHBOARD_REFRESH_STORAGE_KEY) {
        void loadDashboard();
      }
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener(
      FOOD_DASHBOARD_REFRESH_EVENT,
      handleRefresh as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener(
        FOOD_DASHBOARD_REFRESH_EVENT,
        handleRefresh as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const highlightedPendingEntries = useMemo(
    () =>
      (data?.pendingEntries || [])
        .filter((entry) => entry.status !== "PAGO")
        .slice(0, 6),
    [data],
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
              <UtensilsCrossed className="text-[#FFD700]" />
              Gestão Gastronômica
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Mesas ocupadas, consumo em aberto, pagamentos parciais e o caderno
              digital de pendentes em um único fluxo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pendentes"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
            >
              <NotebookPen className="h-4 w-4" />
              Pendentes
            </Link>
            <Link
              href="/vendas/novo"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-bold text-[#0B1120] transition-colors hover:bg-yellow-300"
            >
              <ReceiptText className="h-4 w-4" />
              Abrir Mesa / Lançar Consumo
            </Link>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards(
            data?.summary || {
              totalTables: 0,
              occupiedTables: 0,
              availableTables: 0,
              openTableBalance: 0,
              pendingBalance: 0,
              overdueCount: 0,
              recentSalesTotal: 0,
            },
          ).map((card) => (
            <div
              key={card.label}
              className={`rounded-3xl border p-5 shadow-[0_20px_40px_rgba(15,23,42,0.18)] ${
                toneClassMap[card.tone]
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/90">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">
                    {loading ? "--" : card.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-300/80">{card.helper}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Mapa de Mesas</h2>
              <p className="text-sm text-slate-400">
                Verde significa liberada; vermelho indica mesa em consumo ou com
                saldo ainda em aberto.
              </p>
            </div>
            <Link
              href="/vendas/novo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFD700] transition-colors hover:text-yellow-300"
            >
              Abrir nova comanda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-3xl border border-slate-800 bg-[#112240]"
                />
              ))}
            </div>
          ) : data?.tables.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.tables.map((table) => {
                const currentOrder = table.currentOrder;
                const orderItems = currentOrder?.items || [];

                return (
                  <article
                    key={table.id}
                    className={`overflow-hidden rounded-3xl border shadow-[0_24px_50px_rgba(15,23,42,0.18)] ${
                      table.status === "OCUPADO"
                        ? "border-red-500/30 bg-linear-to-br from-red-500/12 via-[#112240] to-[#112240]"
                        : "border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-[#112240] to-[#112240]"
                    }`}
                  >
                    <div className="border-b border-white/10 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Mesa
                          </p>
                          <h3 className="mt-2 text-3xl font-black text-white">
                            {table.number}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                            table.status === "OCUPADO"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {table.status === "OCUPADO" ? "Ocupada" : "Disponível"}
                        </span>
                      </div>

                      {currentOrder ? (
                        <div className="mt-4 space-y-2 text-sm text-slate-300">
                          <p>
                            Cliente:{" "}
                            <span className="font-semibold text-white">
                              {currentOrder.customer?.name || "Mesa avulsa"}
                            </span>
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                              <p>Total</p>
                              <p className="mt-1 text-lg font-bold text-white">
                                {formatCurrency(currentOrder.total)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                              <p>Saldo restante</p>
                              <p className="mt-1 text-lg font-bold text-[#FFD700]">
                                {formatCurrency(currentOrder.balanceDue)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                            <div>
                              Pago:{" "}
                              <span className="font-semibold text-emerald-300">
                                {formatCurrency(currentOrder.paidAmount)}
                              </span>
                            </div>
                            <div>
                              Fiado:{" "}
                              <span className="font-semibold text-amber-300">
                                {formatCurrency(currentOrder.pendingTransferredAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-400">
                          Nenhuma comanda aberta nesta mesa.
                        </p>
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      {orderItems.length > 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Consumo Lancado
                          </p>
                          <div className="mt-3 space-y-2 text-sm text-slate-200">
                            {orderItems.slice(-4).reverse().map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="line-clamp-1">
                                  {item.quantity}x {item.description}
                                </span>
                                <span className="font-semibold text-[#FFD700]">
                                  {formatCurrency(item.quantity * item.unitPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">
                          Nenhum item pendente nesta mesa.
                        </div>
                      )}

                      <Link
                        href={
                          table.status === "OCUPADO"
                            ? `/vendas/novo?mesa=${encodeURIComponent(table.number)}&pagamento=1`
                            : `/vendas/novo?mesa=${encodeURIComponent(table.number)}`
                        }
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold transition-colors ${
                          table.status === "OCUPADO"
                            ? "bg-red-500/15 text-red-100 hover:bg-red-500/25"
                            : "bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                        }`}
                      >
                        {table.status === "OCUPADO"
                          ? `Mesa Encerramento (${formatCurrency(
                              currentOrder?.balanceDue || 0,
                            )})`
                          : "Ocupar / Lançar Consumo"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-[#112240] p-10 text-center text-slate-400">
              Nenhuma mesa foi utilizada ainda. Abra uma comanda e o mapa começa a se formar automaticamente.
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-[#112240] p-6 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Pendentes Urgentes</h2>
                <p className="text-sm text-slate-400">
                  O caderno digital mostra quem está em aberto ou já venceu.
                </p>
              </div>
              <Link
                href="/pendentes"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFD700] hover:text-yellow-300"
              >
                Ver tudo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {highlightedPendingEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                  Nenhum pendente em aberto agora.
                </div>
              ) : (
                highlightedPendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-2xl border p-4 ${
                      entry.status === "VENCIDO"
                        ? "border-red-500/30 bg-red-500/10"
                        : "border-amber-400/20 bg-amber-400/10"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">
                            {entry.customer.name}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              entry.status === "VENCIDO"
                                ? "bg-red-500/20 text-red-200"
                                : "bg-amber-400/20 text-amber-100"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{entry.summary}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Mesa: {entry.order?.tableNumber || "Balcão"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">
                          {formatCurrency(entry.amount)}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Vencimento{" "}
                          {entry.dueDate
                            ? new Date(entry.dueDate).toLocaleDateString("pt-BR")
                            : "não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#112240] p-6 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[#FFD700]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Últimos Recebimentos</h2>
                <p className="text-sm text-slate-400">
                  Vendas concluídas a partir das mesas e do balcão.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.recentSales || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                  Nenhuma venda concluída ainda.
                </div>
              ) : (
                (data?.recentSales || []).slice(0, 8).map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          Venda #{sale.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {sale.customerName || "Consumidor final"}
                          {sale.tableNumber ? ` • Mesa ${sale.tableNumber}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#FFD700]">
                          {formatCurrency(sale.total)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {sale.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
