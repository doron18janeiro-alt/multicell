"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CarFront,
  CalendarClock,
  CircleDollarSign,
  Loader2,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wrench,
} from "lucide-react";
import { useSegment } from "@/hooks/useSegment";

type ConsultaResult = {
  query: string;
  summary: {
    serialNumber: string;
    lookupMode: "PLATE" | "SERIAL";
    deviceBrand: string | null;
    deviceModel: string | null;
    lastServiceOrderId: number | null;
    totalVisits: number;
    totalLinkedSales: number;
    warrantyBaseDate: string;
    warrantyExpiresAt: string;
    warrantyStatus: "ACTIVE" | "EXPIRED";
    warrantyDaysRemaining: number;
    warrantyDaysExpired: number;
    warrantyCoverage: string;
  };
  timeline: Array<{
    id: string;
    type: "service-order" | "sale";
    date: string;
    title: string;
    subtitle: string;
    description: string;
    status: string;
    value: number;
    responsible: string;
    notes: string | null;
    parts: string[];
  }>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ConsultaPage() {
  const { segment } = useSegment();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const isAutoSegment = segment === "AUTO";

  const warrantyLabel = useMemo(() => {
    if (!result) {
      return "";
    }

    if (result.summary.warrantyStatus === "ACTIVE") {
      return `Faltam ${result.summary.warrantyDaysRemaining} dia(s) para o fim da garantia.`;
    }

    return `Garantia expirada há ${result.summary.warrantyDaysExpired} dia(s).`;
  }, [result]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (isAutoSegment && query.trim().replace(/[^a-zA-Z0-9]/g, "").length < 7) {
      setError("Digite uma placa válida do veículo.");
      setResult(null);
      return;
    }

    if (!isAutoSegment && query.trim().length < 3) {
      setError("Digite um IMEI ou número de série válido.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/consulta?code=${encodeURIComponent(query.trim())}`,
        {
          cache: "no-store",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setResult(null);
        setError(data.error || "Não foi possível consultar o histórico.");
        return;
      }

      setResult(data);
    } catch (searchError) {
      console.error("[Consulta] Error:", searchError);
      setResult(null);
      setError("Erro de conexão ao consultar o histórico.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-amber-400/15 bg-[#112240]/80 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-[#0B1120] shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              {isAutoSegment ? <CarFront size={32} /> : <ShieldCheck size={32} />}
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
              {isAutoSegment
                ? "Consulta de Garantia por Placa"
                : "Consulta de IMEI e Garantia"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              {isAutoSegment
                ? "Digite a placa para localizar o histórico do veículo, o tempo restante de garantia e a cobertura do serviço executado."
                : "Bipar ou digitar o IMEI / número de série para localizar o histórico completo do aparelho, garantia de 90 dias e todas as passagens pela loja."}
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    isAutoSegment
                      ? "Digite a Placa do Veículo"
                      : "Bipar IMEI ou Número de Série"
                  }
                  className="h-14 w-full rounded-2xl border border-slate-700 bg-[#0B1120] pl-12 pr-4 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-amber-400"
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 font-bold text-[#0B1120] transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Consultando
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Consultar
                  </>
                )}
              </button>
            </form>

            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
              {isAutoSegment
                ? "Pressione Enter após digitar a placa"
                : "Pressione Enter após bipar o código"}
            </p>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>

        {result && (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.9fr]">
              <div
                className={`rounded-3xl border p-6 shadow-2xl backdrop-blur-md ${
                  result.summary.warrantyStatus === "ACTIVE"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-300">
                      Status da Garantia
                    </p>
                    <h2 className="mt-3 text-2xl font-bold text-white">
                      {result.summary.warrantyStatus === "ACTIVE"
                        ? "DENTRO DA GARANTIA"
                        : "GARANTIA EXPIRADA"}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-200">
                      {warrantyLabel}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl p-3 ${
                      result.summary.warrantyStatus === "ACTIVE"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-red-400/20 text-red-300"
                    }`}
                  >
                    {result.summary.warrantyStatus === "ACTIVE" ? (
                      <ShieldCheck className="h-8 w-8" />
                    ) : (
                      <ShieldAlert className="h-8 w-8" />
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#0B1120]/40 p-4">
                  <div className="flex items-center gap-3">
                    {isAutoSegment ? (
                      <CarFront className="h-5 w-5 text-amber-300" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-amber-300" />
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {isAutoSegment ? "Veículo" : "Aparelho"}
                      </p>
                      <p className="font-semibold text-white">
                        {[result.summary.deviceBrand, result.summary.deviceModel]
                          .filter(Boolean)
                          .join(" ") ||
                          (isAutoSegment
                            ? "Veículo não identificado"
                            : "Aparelho não identificado")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-amber-300" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {isAutoSegment ? "Placa" : "IMEI / Série"}
                      </p>
                      <p className="break-all font-semibold text-white">
                        {result.summary.serialNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-amber-300" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Garantia até
                      </p>
                      <p className="font-semibold text-white">
                        {formatDate(result.summary.warrantyExpiresAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-[#112240]/80 p-6 shadow-2xl backdrop-blur-md">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-700 bg-[#0B1120]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Passagens na Loja
                    </p>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {result.summary.totalVisits}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-[#0B1120]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Vendas Vinculadas
                    </p>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {result.summary.totalLinkedSales}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-[#0B1120]/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Última O.S.
                    </p>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {result.summary.lastServiceOrderId
                        ? `#${result.summary.lastServiceOrderId}`
                        : "--"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-sm text-slate-300">
                  Histórico completo {isAutoSegment ? "do veículo" : "do aparelho"} encontrado para{" "}
                  <span className="font-semibold text-white">{result.query}</span>
                  . As vendas aparecem quando houve lançamento financeiro ou
                  peças vinculadas à O.S.
                </div>

                {isAutoSegment ? (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-slate-200">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
                      O que a garantia cobre
                    </p>
                    <p className="mt-3">{result.summary.warrantyCoverage}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-[#112240]/80 p-6 shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {isAutoSegment ? "Timeline do Veículo" : "Timeline do Aparelho"}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {isAutoSegment
                      ? "Todas as entradas, serviços e vendas vinculadas à placa consultada."
                      : "Todas as vezes que este equipamento passou pela loja."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {result.timeline.map((entry) => {
                  const isServiceOrder = entry.type === "service-order";

                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-slate-700 bg-[#0B1120]/60 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className={`rounded-2xl p-3 ${
                              isServiceOrder
                                ? "bg-amber-400/15 text-amber-300"
                                : "bg-cyan-400/15 text-cyan-300"
                            }`}
                          >
                            {isServiceOrder ? (
                              <Wrench className="h-6 w-6" />
                            ) : (
                              <Receipt className="h-6 w-6" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-lg font-semibold text-white">
                                {entry.title}
                              </p>
                              <p className="text-sm text-slate-400">
                                {entry.subtitle}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                                {entry.status}
                              </span>
                              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                                {formatDate(entry.date)}
                              </span>
                            </div>

                            <p className="text-sm leading-6 text-slate-300">
                              {entry.description}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[290px] lg:grid-cols-1">
                          <div className="rounded-xl border border-slate-700 bg-[#09101d] p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                              <CircleDollarSign className="h-4 w-4 text-amber-300" />
                              Valor
                            </div>
                            <p className="mt-2 text-base font-semibold text-white">
                              {formatCurrency(entry.value)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-700 bg-[#09101d] p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                              <UserRound className="h-4 w-4 text-amber-300" />
                              Responsável
                            </div>
                            <p className="mt-2 text-sm font-medium text-white">
                              {entry.responsible}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(entry.parts.length > 0 || entry.notes) && (
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 lg:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                              Peças / Itens
                            </p>
                            {entry.parts.length > 0 ? (
                              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                {entry.parts.map((part, index) => (
                                  <li key={`${entry.id}-part-${index}`}>
                                    • {part}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">
                                Nenhuma peça vinculada nesta etapa.
                              </p>
                            )}
                          </div>

                          {entry.notes && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                                Observações
                              </p>
                              <p className="mt-3 text-sm leading-6 text-slate-300">
                                {entry.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!result && !loading && !error && (
          <div className="rounded-3xl border border-slate-800 bg-[#112240]/70 p-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-white">
              Nenhuma consulta realizada ainda
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              {isAutoSegment
                ? "Digite a placa para localizar o histórico do veículo, o tempo restante de garantia e os serviços cobertos."
                : "Digite ou bipar o IMEI / número de série para localizar o histórico completo do aparelho, incluindo garantia, O.S. e vendas vinculadas."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
