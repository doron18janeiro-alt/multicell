"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  CreditCard,
  Award,
  Target,
  BarChart3,
  AlertCircle,
} from "lucide-react";

interface Stats {
  financials: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    margin: string;
  };
  topProducts: {
    name: string;
    revenue: number;
    profit: number;
    quantity: number;
  }[];
  paymentRanking: {
    method: string;
    total: number;
  }[];
  records: {
    bestDay: { date: string; total: number };
    worstDay: { date: string; total: number };
  };
}

export default function AdvancedReports() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/reports/stats");
        if (!res.ok) throw new Error("Falha ao carregar relatórios");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Erro no relatório:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0B1120] text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full"></div>
          <p className="text-slate-400">Processando milhões de dados...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-[#FFD700]" size={32} />
            Relatórios Inteligentes (Beta)
          </h1>
          <p className="text-slate-400">
            Análise profunda da saúde financeira da Multicell
          </p>
        </header>

        {/* 1. KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-2 text-slate-400">
              <DollarSign size={20} />
              <h3 className="font-bold uppercase text-xs tracking-wider">
                Faturamento Total
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {Number(stats.financials.totalRevenue).toFixed(2)}
            </p>
          </div>

          <div className="bg-[#112240] p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-2 text-slate-400">
              <TrendingDown size={20} />
              <h3 className="font-bold uppercase text-xs tracking-wider">
                Custo de Produtos
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {Number(stats.financials.totalCost).toFixed(2)}
            </p>
          </div>

          <div className="bg-[#112240] p-6 rounded-xl border border-green-500/30 shadow-lg shadow-green-900/10">
            <div className="flex items-center gap-3 mb-2 text-green-400">
              <TrendingUp size={20} />
              <h3 className="font-bold uppercase text-xs tracking-wider">
                Lucro Líquido
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {Number(stats.financials.totalProfit).toFixed(2)}
            </p>
            <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded inline-block mt-2">
              Margem: {stats.financials.margin}%
            </span>
          </div>

          <div className="bg-[#112240] p-6 rounded-xl border border-yellow-500/30 shadow-lg shadow-yellow-900/10">
            <div className="flex items-center gap-3 mb-2 text-[#FFD700]">
              <Award size={20} />
              <h3 className="font-bold uppercase text-xs tracking-wider">
                Melhor Dia
              </h3>
            </div>
            <p className="text-lg font-bold text-white break-words">
              {stats.records.bestDay.date
                ? new Date(stats.records.bestDay.date).toLocaleDateString(
                    "pt-BR",
                    { timeZone: "UTC" },
                  )
                : "N/A"}
            </p>
            <p className="text-[#FFD700]">
              R$ {Number(stats.records.bestDay.total).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Ranking de Produtos */}
          <div className="bg-[#112240] rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Target className="text-blue-400" />
                Top 5 Produtos (Lucro)
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {stats.topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-800 transition-colors border border-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <p
                        className="font-bold text-white max-w-[200px] truncate"
                        title={p.name}
                      >
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">
                      + R$ {Number(p.profit).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Rev: R$ {Number(p.revenue).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-xs">Sincronizando vendas...</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Métodos de Pagamento */}
          <div className="bg-[#112240] rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="text-purple-400" />
                Formas de Pagamento
              </h2>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Método</th>
                  <th className="p-4 text-right">Total Recebido</th>
                  <th className="p-4 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats.paymentRanking.map((pay, idx) => {
                  const percent =
                    stats.financials.totalRevenue > 0
                      ? (pay.total / stats.financials.totalRevenue) * 100
                      : 0;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-4 font-bold text-slate-300">
                        {pay.method === "credit_card"
                          ? "Crédito"
                          : pay.method === "debit_card"
                            ? "Débito"
                            : pay.method === "cash"
                              ? "Dinheiro"
                              : pay.method === "pix"
                                ? "PIX"
                                : pay.method}
                      </td>
                      <td className="p-4 text-right text-white">
                        R$ {Number(pay.total).toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs font-bold text-slate-400 bg-slate-700 px-2 py-1 rounded">
                          {percent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Alerta de Pior Dia */}
            {stats.records.worstDay.date && (
              <div className="m-6 mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-red-400" size={20} />
                <div>
                  <p className="text-red-400 font-bold text-sm">
                    Atenção: Dia de Baixa
                  </p>
                  <p className="text-slate-300 text-xs">
                    O dia{" "}
                    <span className="text-white font-bold">
                      {new Date(stats.records.worstDay.date).toLocaleDateString(
                        "pt-BR",
                        { timeZone: "UTC" },
                      )}
                    </span>{" "}
                    teve o menor faturamento registrado: R${" "}
                    {Number(stats.records.worstDay.total).toFixed(2)}. Prepare
                    uma promoção!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
