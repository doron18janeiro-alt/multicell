"use client";

import { useState, useEffect } from "react";
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

export default function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [abcData, setAbcData] = useState<ABCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"cards" | "performance">(
    "performance"
  );

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const [cardRes, reportRes] = await Promise.all([
        fetch("/api/reports/card-sales"),
        fetch("/api/reports"),
      ]);

      if (cardRes.ok) {
        const jsonData = await cardRes.json();
        // Defensive check
        if (!jsonData.sales) jsonData.sales = [];
        if (!jsonData.summary)
          jsonData.summary = { debitTotal: 0, creditTotal: 0 };
        setData(jsonData);
      }

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        if (reportData.abc) {
          setAbcData(reportData.abc);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (saleId: number) => {
    if (
      !confirm(
        "Deseja estornar esta venda? O valor será subtraído do lucro de hoje e o item voltará ao estoque."
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
        fetchReport();
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
    if (!data) return amount;
    const rate =
      type === "DEBITO" ? data.config.debitRate : data.config.creditRate;
    return amount - (amount * rate) / 100;
  };

  const calculateTotalNet = () => {
    if (!data) return 0;
    const debitNet = calculateNet(data.summary.debitTotal, "DEBITO");
    const creditNet = calculateNet(data.summary.creditTotal, "CREDITO");
    return debitNet + creditNet;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
        </main>
      </div>
    );
  }

  // Se falhar o carregamento principal, exibe msg
  if (!data && !abcData) return null;

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

        {activeTab === "performance" && abcData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sugestões de Compra */}
            {abcData.suggestions.length > 0 && (
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
                            Receita Gerada:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              className: "currency",
                              style: "currency",
                              currency: "BRL",
                            }).format(p.revenue)}
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
                          {new Intl.NumberFormat("pt-BR", {
                            className: "currency",
                            style: "currency",
                            currency: "BRL",
                          }).format(p.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cards" && data && (
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
                    R$ {(data.summary.debitTotal || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Líquido Est.: R${" "}
                    {(
                      calculateNet(data.summary.debitTotal || 0, "DEBITO") || 0
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
                    R$ {(data.summary.creditTotal || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Líquido Est.: R${" "}
                    {(
                      calculateNet(data.summary.creditTotal || 0, "CREDITO") ||
                      0
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
                  {data.sales.length} registros
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
                    {data.sales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-500"
                        >
                          Nenhuma venda com cartão registrada este mês.
                        </td>
                      </tr>
                    ) : (
                      data.sales.map((sale) => {
                        const isDebit = sale.cardType === "DEBITO";
                        const rate = isDebit
                          ? data.config.debitRate
                          : data.config.creditRate;
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
                                  }
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
