"use client";

import useSWR from "swr";
import { DollarSign, Trophy, AlertTriangle, Calendar } from "lucide-react";

// Helper de formatação seguro contra NaN
const formatCurrency = (value: any) => {
  const val = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RelatoriosPage() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 5000,
  });

  // Cards de Recordes (Melhor e Pior Dia)
  // Nota: Estes dados devem vir da sua API de fechamento consolidado
  const highestValue = data?.highestValue || 0;
  const lowestValue = data?.lowestValue || 0;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8">
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
        <div className="overflow-x-auto text-center py-8">
          <p className="text-slate-400 mb-2">
            Nenhum fechamento registrado ainda.
          </p>
          <p className="text-xs text-slate-500 italic">
            Clique em <strong>FECHAR CAIXA</strong> no painel principal para
            consolidar os dados de hoje e vê-los aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
