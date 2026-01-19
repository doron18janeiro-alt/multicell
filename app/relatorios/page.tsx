"use client";

import { useState } from "react";
import useSWR from "swr";
import Sidebar from "@/components/Sidebar";
import {
  BarChart3,
  CreditCard,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  RotateCcw,
  Package,
  ShoppingCart,
  AlertTriangle,
  FileText,
  Calendar,
} from "lucide-react";

interface SaleReportItem {
  id: number;
  total: number;
  cardType: string;
  createdAt: string;
}

interface ABCData {
  bestSellers: { name: string; sold: number; revenue: number }[];
  mostProfitable: { name: string; profit: number; margin: string }[];
  suggestions: {
    name: string;
    stock: number;
    minQuantity: number;
    sold: number;
  }[];
}

interface ReportData {
  summary: {
    debitTotal: number;
    creditTotal: number;
  };
  sales: SaleReportItem[];
  config: {
    debitRate: number;
    creditRate: number;
  };
}

interface PerformanceData {
  closings: any[];
  bestDay: any;
  worstDay: any;
}

const fetcher = (url: string) =>
  fetch(`${url}?t=${Date.now()}`).then((res) => res.json());

const formatCurrency = (value: number | string | undefined | null) => {
  const numValue = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
};

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<"cards" | "abc" | "performance">(
    "performance",
  );

  const {
    data: data,
    mutate: mutateCard,
    isLoading: cardLoading,
  } = useSWR<ReportData>("/api/reports/card-sales", fetcher, {
    refreshInterval: 5000,
  });

  const { data: rawReportData, isLoading: reportLoading } = useSWR(
    "/api/reports",
    fetcher,
    { refreshInterval: 5000 },
  );

  const { data: performanceData, isLoading: perfLoading } =
    useSWR<PerformanceData>("/api/reports/performance", fetcher, {
      refreshInterval: 5000,
    });

  // Derived state
  const abcData: ABCData | null = rawReportData?.abc || null;

  // Safe data access
  const safeCardData = data
    ? {
        ...data,
        sales: data.sales || [],
        summary: data.summary || { debitTotal: 0, creditTotal: 0 },
      }
    : null;

  const loading = cardLoading || reportLoading || perfLoading;

  const handleRefund = async (saleId: number) => {
    if (
      !confirm(
        "Deseja estornar esta venda? O valor será subtraído do lucro de hoje e o item voltará ao estoque.",
      )
    )
      return;

    try {
      const res = await fetch(`/api/sales/${saleId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Devolução solicitada via Painel" }),
      });

      if (res.ok) {
        alert("Venda estornada com sucesso!");
        mutateCard(); // Refresh card data
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao estornar venda");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao realizar estorno");
    }
  };

  const calculateNet = (amount: number, type: string) => {
    if (!safeCardData) return amount;
    const rate =
      type === "DEBITO"
        ? safeCardData.config.debitRate
        : safeCardData.config.creditRate;
    return amount - (amount * rate) / 100;
  };

  const calculateTotalNet = () => {
    if (!safeCardData) return 0;
    const debitNet = calculateNet(safeCardData.summary.debitTotal, "DEBITO");
    const creditNet = calculateNet(safeCardData.summary.creditTotal, "CREDITO");
    return debitNet + creditNet;
  };

  if (loading && !data && !abcData && !performanceData) {
    return (
      <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64 pb-20">
        <header className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-light text-white flex items-center gap-3">
              <BarChart3
                className="text-[#D4AF37]"
                size={32}
                strokeWidth={1.5}
              />
              Relatórios Financeiros
            </h1>
            <p className="text-slate-400 mt-2 ml-11">
              Análise estratégica e controle financeiro
            </p>
          </div>
          <div className="flex gap-2 bg-[#112240] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("performance")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === "performance"
                  ? "bg-[#D4AF37] text-black shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <TrendingUp size={16} />
              Ranking de Performance
            </button>
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === "cards"
                  ? "bg-[#D4AF37] text-black shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <CreditCard size={16} />
              Conciliação de Cartões
            </button>
          </div>
        </header>

        {activeTab === "performance" && (abcData || performanceData) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Performance - Melhor/Pior Dia */}
            {performanceData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#112240] rounded-2xl p-6 border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-900/10">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp size={120} className="text-emerald-500" />
                  </div>
                  <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={20} /> Melhor Dia (Faturamento)
                  </h3>
                  {performanceData.bestDay ? (
                    <div>
                      <p className="text-4xl font-bold text-white mb-2">
                        {formatCurrency(performanceData.bestDay.total)}
                      </p>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold uppercase border border-emerald-500/20">
                          RECORD
                        </span>
                        <p className="capitalize">
                          {new Date(
                            performanceData.bestDay.date,
                          ).toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 py-4">
                      Ainda sem dados de fechamento.
                    </p>
                  )}
                </div>

                <div className="bg-[#112240] rounded-2xl p-6 border border-rose-500/30 relative overflow-hidden shadow-lg shadow-rose-900/10">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <AlertTriangle size={120} className="text-rose-500" />
                  </div>
                  <h3 className="text-rose-400 font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} /> Pior Dia (Faturamento)
                  </h3>
                  {performanceData.worstDay ? (
                    <div>
                      <p className="text-4xl font-bold text-white mb-2">
                        {formatCurrency(performanceData.worstDay.total)}
                      </p>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded text-xs font-bold uppercase border border-rose-500/20">
                          BAIXA
                        </span>
                        <p className="capitalize">
                          {new Date(
                            performanceData.worstDay.date,
                          ).toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 py-4">
                      Ainda sem dados de fechamento.
                    </p>
                  )}
                </div>
              </div>
            )}

            {performanceData &&
              performanceData.closings &&
              performanceData.closings.length > 0 && (
                <div className="bg-[#112240] rounded-2xl border border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar size={20} className="text-[#D4AF37]" />
                    Histórico de Fechamentos
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-sm">
                          <th className="py-3 px-4">Data</th>
                          <th className="py-3 px-4 text-right">Dinheiro</th>
                          <th className="py-3 px-4 text-right">Pix</th>
                          <th className="py-3 px-4 text-right">Cartões</th>
                          <th className="py-3 px-4 text-right text-white">
                            Total Bruto
                          </th>
                          <th className="py-3 px-4 text-right text-emerald-400">
                            Total Líquido
                          </th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-300">
                        {performanceData.closings.map(
                          (closing: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-800 hover:bg-slate-800/50"
                            >
                              <td className="py-3 px-4">
                                {new Date(closing.date).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                R$ {closing.totalCash.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                R$ {closing.totalPix.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                R${" "}
                                {(
                                  closing.totalDebit + closing.totalCredit
                                ).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-white">
                                R${" "}
                                {(
                                  closing.totalCash +
                                  closing.totalPix +
                                  closing.totalDebit +
                                  closing.totalCredit
                                ).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-400">
                                R$ {closing.totalNet.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded border border-green-500/20">
                                  {closing.status}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Sugestões de Compra */}
            {abcData && abcData.suggestions.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-500" />
                  <h2 className="text-xl font-bold text-white">
                    Sugestão de Compra (Urgente)
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {abcData.suggestions.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0B1120] p-4 rounded-xl border border-red-500/20 flex justify-between items-center"
                    >
                      <div>
                        <h3
                          className="font-bold text-white truncate max-w-[150px]"
                          title={p.name}
                        >
                          {p.name}
                        </h3>
                        <p className="text-red-400 text-sm">
                          Estoque: {p.stock} (Min: {p.minQuantity})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">
                          Vendeu
                        </span>
                        <span className="text-lg font-bold text-white">
                          {p.sold} un
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {abcData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Mais Vendidos */}
                <div className="bg-[#112240] rounded-2xl border border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Package className="text-blue-400" />
                    Produtos Mais Vendidos (Vol.)
                  </h2>
                  <div className="space-y-4">
                    {abcData.bestSellers.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[#0B1120] rounded-lg border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              Receita Gerada: {formatCurrency(p.revenue)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-white">
                          {p.sold}{" "}
                          <span className="text-sm text-slate-500 font-normal">
                            un
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mais Lucrativos */}
                <div className="bg-[#112240] rounded-2xl border border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-emerald-400" />
                    Produtos Mais Lucrativos (Margem Real)
                  </h2>
                  <div className="space-y-4">
                    {abcData.mostProfitable.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[#0B1120] rounded-lg border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-white">{p.name}</p>
                            <p className="text-xs text-emerald-400">
                              Margem: {p.margin}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-sm text-slate-500">
                            Lucro Total
                          </span>
                          <span className="text-lg font-bold text-white">
                            {formatCurrency(p.profit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "cards" && safeCardData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Dash Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Débito */}
              <div className="bg-gradient-to-br from-[#1e3a8a]/20 to-[#1e3a8a]/5 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet size={100} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
                    <ArrowUpRight size={18} /> Total Débito
                  </h3>
                  <p className="text-3xl font-bold text-white mb-2">
                    R$ {(safeCardData.summary.debitTotal || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Líquido Est.: R${" "}
                    {(
                      calculateNet(
                        safeCardData.summary.debitTotal || 0,
                        "DEBITO",
                      ) || 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="w-full h-1 bg-slate-700/50 mt-4 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[70%]"></div>
                </div>
              </div>

              {/* Crédito */}
              <div className="bg-gradient-to-br from-[#5b21b6]/20 to-[#5b21b6]/5 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard size={100} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-purple-400 font-semibold mb-1 flex items-center gap-2">
                    <TrendingUp size={18} /> Total Crédito
                  </h3>
                  <p className="text-3xl font-bold text-white mb-2">
                    R$ {(safeCardData.summary.creditTotal || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Líquido Est.: R${" "}
                    {(
                      calculateNet(
                        safeCardData.summary.creditTotal || 0,
                        "CREDITO",
                      ) || 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="w-full h-1 bg-slate-700/50 mt-4 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[45%]"></div>
                </div>
              </div>

              {/* Total Consolidad */}
              <div className="bg-[#112240] border border-[#D4AF37]/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-[#D4AF37] font-semibold mb-1 flex items-center gap-2">
                    <Briefcase size={18} /> Caixa Líquido (Cartões)
                  </h3>
                  <p className="text-4xl font-bold text-white mb-2">
                    R$ {(calculateTotalNet() || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Valor real previsto após desconto das taxas.
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  Transações do Mês
                </h2>
                <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                  {safeCardData.sales.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0f172a] text-slate-400 text-sm uppercase tracking-wider">
                      <th className="p-4 font-medium border-b border-slate-700">
                        Data
                      </th>
                      <th className="p-4 font-medium border-b border-slate-700">
                        Tipo
                      </th>
                      <th className="p-4 font-medium border-b border-slate-700 text-right">
                        Valor Bruto
                      </th>
                      <th className="p-4 font-medium border-b border-slate-700 text-right">
                        Taxa (%)
                      </th>
                      <th className="p-4 font-medium border-b border-slate-700 text-right text-white">
                        Líquido
                      </th>
                      <th className="p-4 font-medium border-b border-slate-700 text-right text-white">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 text-sm">
                    {safeCardData.sales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-500"
                        >
                          Nenhuma venda com cartão registrada este mês.
                        </td>
                      </tr>
                    ) : (
                      safeCardData.sales.map((sale) => {
                        const isDebit = sale.cardType === "DEBITO";
                        const rate = isDebit
                          ? safeCardData.config.debitRate
                          : safeCardData.config.creditRate;
                        const net = sale.total - (sale.total * rate) / 100;

                        return (
                          <tr
                            key={sale.id}
                            className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="p-4">
                              {new Date(sale.createdAt).toLocaleDateString()}{" "}
                              <span className="text-slate-500 text-xs ml-1">
                                {new Date(sale.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  isDebit
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                }`}
                              >
                                {sale.cardType}
                              </span>
                            </td>
                            <td className="p-4 text-right font-medium">
                              R$ {(sale.total || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right text-slate-500">
                              {rate}%
                            </td>
                            <td className="p-4 text-right text-[#D4AF37] font-bold">
                              R$ {(net || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleRefund(sale.id)}
                                className="p-2 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-colors"
                                title="Estornar Venda"
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Identidade / Rodapé */}
        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p className="font-bold">MULTICELL - CNPJ: 48.002.640.0001/67</p>
          <p>Av Paraná, 470 - (43) 99603-1208</p>
        </footer>
      </main>
    </div>
  );
}
