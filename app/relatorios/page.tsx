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
} from "lucide-react";

interface SaleReportItem {
  id: number;
  total: number;
  cardType: string;
  createdAt: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await fetch("/api/reports/card-sales");
      if (!res.ok) throw new Error("Falha ao buscar dados");
      const jsonData = await res.json();
      setData(jsonData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  if (!data) return null;

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
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
              Análise detalhada de transações em Cartão (Mês Atual)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">
              TAXAS ESTRUTURAIS
            </span>
            <span className="text-xs text-slate-400">
              Débito: <strong>{data.config.debitRate}%</strong> | Crédito:{" "}
              <strong>{data.config.creditRate}%</strong>
            </span>
          </div>
        </header>

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
                  calculateNet(data.summary.creditTotal || 0, "CREDITO") || 0
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
                </tr>
              </thead>
              <tbody className="text-slate-300 text-sm">
                {data.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
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
                            {new Date(sale.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
