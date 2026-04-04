"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  AlertTriangle,
  DollarSign,
  MessageCircle,
  NotebookPen,
  Printer,
  ReceiptText,
} from "lucide-react";
import { FoodConsumptionStatement } from "@/components/FoodConsumptionStatement";
import { SaleReceiptThermal } from "@/components/SaleReceiptThermal";
import {
  buildFoodPendingWhatsAppMessage,
  formatCurrency,
  resolvePaymentMethodLabel,
} from "@/lib/food";
import { formatWhatsAppLink } from "@/lib/whatsapp";

type PendingEntry = {
  id: string;
  amount: number;
  dueDate?: string | null;
  status: string;
  description?: string | null;
  createdAt: string;
  settledAt?: string | null;
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
  itemsSnapshot: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    consumedAt?: string | null;
  }>;
  summary: string;
};

type PendingPayload = {
  entries: PendingEntry[];
  summary: {
    openCount: number;
    overdueCount: number;
    totalOpenBalance: number;
  };
};

type CompanyConfig = {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

const defaultConfig: CompanyConfig = {
  name: "Minha Empresa",
  cnpj: "",
  document: "",
  address: "",
  phone: "",
  logoUrl: "/wtm-float.png",
};

export default function PendingAccountsPage() {
  const [payload, setPayload] = useState<PendingPayload>({
    entries: [],
    summary: {
      openCount: 0,
      overdueCount: 0,
      totalOpenBalance: 0,
    },
  });
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [settlementMethodByEntry, setSettlementMethodByEntry] = useState<
    Record<string, string>
  >({});
  const [documentByEntry, setDocumentByEntry] = useState<Record<string, string>>({});
  const [statementTarget, setStatementTarget] = useState<{
    customer: PendingEntry["customer"] | null;
    entries: PendingEntry[];
  }>({
    customer: null,
    entries: [],
  });
  const [lastSale, setLastSale] = useState<any>(null);
  const statementPrintRef = useRef<HTMLDivElement>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const handleStatementPrint = useReactToPrint({
    contentRef: statementPrintRef,
  });
  const handleReceiptPrint = useReactToPrint({
    contentRef: receiptPrintRef,
  });

  const loadPendingEntries = async () => {
    const response = await fetch("/api/food/pending", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao carregar pendentes.");
    }

    setPayload(data);
  };

  const loadConfig = async () => {
    const response = await fetch("/api/config");
    const data = await response.json();

    if (!data || data.error) {
      return;
    }

    setCompanyConfig({
      name: data.name || "Minha Empresa",
      cnpj: data.cnpj || data.document || "",
      document: data.cnpj || data.document || "",
      address: data.address || "",
      phone: data.phone || "",
      logoUrl: data.logoUrl || "/wtm-float.png",
    });
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await Promise.all([loadPendingEntries(), loadConfig()]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const groupedEntries = useMemo(
    () =>
      Array.from(
        payload.entries.reduce((map, entry) => {
          const group = map.get(entry.customer.id) || {
            customer: entry.customer,
            entries: [] as PendingEntry[],
            total: 0,
            overdueCount: 0,
          };

          group.entries.push(entry);
          if (entry.status !== "PAGO") {
            group.total += entry.amount;
          }
          if (entry.status === "VENCIDO") {
            group.overdueCount += 1;
          }

          map.set(entry.customer.id, group);
          return map;
        }, new Map<string, {
          customer: PendingEntry["customer"];
          entries: PendingEntry[];
          total: number;
          overdueCount: number;
        }>()),
      ).map(([, group]) => group),
    [payload.entries],
  );

  const openCustomerStatement = async (group: (typeof groupedEntries)[number]) => {
    setStatementTarget({
      customer: group.customer,
      entries: group.entries,
    });

    window.setTimeout(() => handleStatementPrint(), 250);
  };

  const settleEntry = async (entry: PendingEntry) => {
    const paymentMethod = settlementMethodByEntry[entry.id] || "DINHEIRO";
    const receiptDocument = documentByEntry[entry.id] || entry.customer.document || "";

    setProcessingId(entry.id);

    try {
      const response = await fetch(`/api/food/pending/${entry.id}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          receiptDocument,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao liquidar pendência.");
      }

      setLastSale(data.sale);
      if (window.confirm("Pendência quitada. Deseja imprimir o recibo?")) {
        window.setTimeout(() => handleReceiptPrint(), 250);
      }

      await loadPendingEntries();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao liquidar pendência.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black text-white">
              <NotebookPen className="text-[#FFD700]" />
              Pendentes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              O caderno digital do restaurante: saldo por cliente, histórico de consumo,
              aviso de vencimento e quitação sem cobrança agressiva.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
              Total em Aberto
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {formatCurrency(payload.summary.totalOpenBalance)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {payload.summary.openCount} lançamento(s) em aberto
            </p>
          </div>
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-100">
              Vencidos
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {payload.summary.overdueCount}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Mesmo pulso visual do alerta de estoque crítico
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              Comunicação
            </p>
            <p className="mt-3 text-3xl font-black text-white">WhatsApp</p>
            <p className="mt-2 text-sm text-slate-300">
              Extrato informativo com consumo consolidado por cliente
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-3xl border border-slate-800 bg-[#112240]"
              />
            ))
          ) : groupedEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-[#112240] p-10 text-center text-slate-400">
              Nenhum pendente encontrado.
            </div>
          ) : (
            groupedEntries.map((group) => {
              const message = buildFoodPendingWhatsAppMessage({
                clientName: group.customer.name,
                companyName: companyConfig.name,
                amount: group.total,
                items: group.entries.flatMap((entry) => entry.itemsSnapshot),
              });
              const whatsappUrl = formatWhatsAppLink(group.customer.phone, message);

              return (
                <section
                  key={group.customer.id}
                  className="rounded-3xl border border-slate-800 bg-[#112240] p-6 shadow-[0_24px_50px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-white">
                          {group.customer.name}
                        </h2>
                        {group.overdueCount > 0 ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {group.overdueCount} vencido(s)
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        Telefone: {group.customer.phone || "Não informado"} • CPF/CNPJ:{" "}
                        {group.customer.document || "Não informado"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void openCustomerStatement(group)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 font-semibold text-slate-100 transition-colors hover:border-slate-500"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir Extrato
                      </button>
                      <a
                        href={whatsappUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition-colors ${
                          whatsappUrl
                            ? "bg-emerald-500 text-white hover:bg-emerald-400"
                            : "cursor-not-allowed bg-slate-700 text-slate-300"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp Informativo
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                      Saldo Atual do Cliente
                    </p>
                    <p className="mt-3 text-3xl font-black text-white">
                      {formatCurrency(group.total)}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {group.entries.map((entry) => (
                      <article
                        key={entry.id}
                        className={`rounded-3xl border p-5 ${
                          entry.status === "VENCIDO"
                            ? "border-red-500/30 bg-red-500/10"
                            : entry.status === "PAGO"
                              ? "border-emerald-500/20 bg-emerald-500/10"
                              : "border-slate-700 bg-[#0B1120]"
                        }`}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-bold text-white">
                                {entry.description || `Lançamento ${entry.id.slice(-6)}`}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                                  entry.status === "VENCIDO"
                                    ? "bg-red-500/20 text-red-100"
                                    : entry.status === "PAGO"
                                      ? "bg-emerald-500/20 text-emerald-100"
                                      : "bg-amber-400/20 text-amber-100"
                                }`}
                              >
                                {entry.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">
                              {entry.summary}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              Mesa: {entry.order?.tableNumber || "Balcão"} • Lançado em{" "}
                              {new Date(entry.createdAt).toLocaleString("pt-BR")}
                              {entry.dueDate
                                ? ` • Vencimento ${new Date(entry.dueDate).toLocaleDateString("pt-BR")}`
                                : ""}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-black text-white">
                              {formatCurrency(entry.amount)}
                            </p>
                            {entry.settledAt ? (
                              <p className="mt-2 text-xs text-slate-300">
                                Quitado em {new Date(entry.settledAt).toLocaleString("pt-BR")}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {entry.status !== "PAGO" ? (
                          <div className="mt-5 grid gap-3 xl:grid-cols-[180px_1fr_auto]">
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Receber via
                              </span>
                              <select
                                value={settlementMethodByEntry[entry.id] || "DINHEIRO"}
                                onChange={(event) =>
                                  setSettlementMethodByEntry((previous) => ({
                                    ...previous,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-slate-700 bg-[#112240] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                              >
                                {["DINHEIRO", "PIX", "DEBITO", "CREDITO"].map((method) => (
                                  <option key={method} value={method}>
                                    {resolvePaymentMethodLabel(method)}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                CPF/CNPJ do recibo
                              </span>
                              <input
                                value={documentByEntry[entry.id] ?? entry.customer.document ?? ""}
                                onChange={(event) =>
                                  setDocumentByEntry((previous) => ({
                                    ...previous,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                placeholder="Opcional"
                                className="w-full rounded-2xl border border-slate-700 bg-[#112240] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => void settleEntry(entry)}
                              disabled={processingId === entry.id}
                              className="inline-flex items-center justify-center gap-2 self-end rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ReceiptText className="h-4 w-4" />
                              {processingId === entry.id ? "Quitando..." : "Quitar"}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>

      <div className="hidden">
        <FoodConsumptionStatement
          ref={statementPrintRef}
          config={companyConfig}
          customer={statementTarget.customer}
          entries={statementTarget.entries}
        />
      </div>

      <div className="hidden">
        <SaleReceiptThermal
          ref={receiptPrintRef}
          sale={lastSale}
          config={companyConfig}
          termsUrl="/termos"
        />
      </div>
    </div>
  );
}
