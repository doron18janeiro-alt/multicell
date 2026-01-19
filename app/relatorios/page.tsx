"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  DollarSign,
  Trophy,
  AlertTriangle,
  Calendar,
  X,
  FileText,
  ShoppingBag,
} from "lucide-react";

// Helper de formatação seguro contra NaN
const formatCurrency = (value: any) => {
  const val = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PerformanceData {
  closings: any[];
  bestDay: any;
  worstDay: any;
}

export default function RelatoriosPage() {
  const [selectedClosing, setSelectedClosing] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 5000,
  });

  const { data: performanceData } = useSWR<PerformanceData>(
    "/api/reports/performance",
    fetcher,
  );

  const handleRowClick = async (closing: any) => {
    setSelectedClosing(closing);
    setLoadingDetails(true);
    try {
      const dateStr = new Date(closing.date).toISOString().split("T")[0];
      const res = await fetch(`/api/sales?date=${dateStr}`);
      const data = await res.json();
      setDetails(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Cards de Recordes (Melhor e Pior Dia)
  const highestValue = data?.highestValue || 0;
  const lowestValue = data?.lowestValue || 0;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8">
      {/* Modal de Detalhes */}
      {selectedClosing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#112240] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#0f172a] rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-[#FFD700]" />
                  Detalhamento de Vendas
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Referente ao fechamento de{" "}
                  {new Date(selectedClosing.date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedClosing(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              {loadingDetails ? (
                <div className="text-center py-12 text-slate-500 animate-pulse">
                  Carregando transações...
                </div>
              ) : details.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Nenhuma venda encontrada para este dia.
                </div>
              ) : (
                <div className="space-y-4">
                  {details.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl flex justify-between items-center group hover:border-[#FFD700]/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-800 rounded-lg text-[#FFD700] group-hover:bg-[#FFD700]/10">
                          <ShoppingBag size={20} />
                        </div>
                        <div>
                          <div className="text-slate-300 font-mono text-xs mb-1">
                            ID #{sale.id} •{" "}
                            {new Date(sale.createdAt).toLocaleTimeString(
                              "pt-BR",
                            )}
                          </div>
                          <div className="text-white font-medium">
                            {sale.paymentMethod}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {sale.items?.length || 0} itens
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#FFD700] font-bold text-lg">
                          {formatCurrency(sale.total)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-[#0f172a] rounded-b-2xl text-right">
              <span className="text-slate-400 text-sm mr-2">
                Total Consolidado:
              </span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(
                  selectedClosing.total_bruto || selectedClosing.totalNet,
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" /> Relatórios Financeiros
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Melhor Dia */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Melhor Dia (Faturamento)
            </p>
            <h2 className="text-3xl font-bold text-white mt-2">
              {formatCurrency(highestValue)}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Recorde registrado no histórico
            </p>
          </div>
        </div>

        {/* Card Pior Dia */}
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-red-400 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pior Dia (Faturamento)
            </p>
            <h2 className="text-3xl font-bold text-white mt-2">
              {formatCurrency(lowestValue)}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Menor valor registrado
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Histórico (daily_closing) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" /> Histórico de
          Fechamentos
        </h3>
        {performanceData?.closings && performanceData.closings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-right">Bruto</th>
                  <th className="py-3 px-4 text-right">Taxas</th>
                  <th className="py-3 px-4 text-right text-white">Líquido</th>
                  <th className="py-3 px-4 text-right text-emerald-400">
                    Lucro
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-300">
                {performanceData.closings.map((closing, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleRowClick(closing)}
                    className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    title="Clique para ver detalhes"
                  >
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {new Date(closing.date).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(closing.total_bruto || closing.totalNet)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-400">
                      - {formatCurrency(closing.total_taxas)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-white">
                      {formatCurrency(
                        closing.total_liquido || closing.totalNet,
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(closing.total_lucro_diario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto text-center py-8">
            <p className="text-slate-400 mb-2">
              Nenhum fechamento registrado ainda.
            </p>
            <p className="text-xs text-slate-500 italic">
              Clique em <strong>FECHAR CAIXA</strong> no painel principal para
              consolidar os dados de hoje e vê-los aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
