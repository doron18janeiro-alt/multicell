"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Package,
  Layers,
  Activity,
  CalendarCheck,
} from "lucide-react";

// Função helper para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

// Componente do Card (Glassmorphism)
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  type = "profit", // 'profit' | 'stock'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  type?: "profit" | "stock";
}) => {
  const isProfit = type === "profit";

  const colorClasses = isProfit
    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
    : "text-cyan-400 border-cyan-500/20 bg-cyan-500/10";

  const iconBg = isProfit ? "bg-emerald-500/20" : "bg-cyan-500/20";
  const iconColor = isProfit ? "text-emerald-400" : "text-cyan-400";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colorClasses}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Efeito decorativo de fundo */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-3xl opacity-20 ${isProfit ? "bg-emerald-500" : "bg-cyan-500"}`}
      />
    </div>
  );
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 5000, // Polling de 5 segundos
    revalidateOnFocus: true,
  });

  if (error)
    return (
      <div className="text-red-400 p-8">Falha ao carregar dados do painel.</div>
    );
  if (isLoading && !data)
    return (
      <div className="flex bg-[#0B1120] min-h-screen items-center justify-center">
        <div className="animate-pulse text-emerald-500 font-medium">
          Carregando Painel de Gestão...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-400" />
          Painel de Gestão Multicell
        </h1>
        <p className="text-slate-400 mt-2">
          Visão geral financeira e controle de estoque em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Seção de Lucros (Verde Esmeralda) */}
        <StatCard
          title="Lucro Diário (Hoje)"
          value={formatCurrency(data?.dailyProfit)}
          subtitle="Vendas - Taxas - Custos"
          icon={DollarSign}
          type="profit"
        />
        <StatCard
          title="Lucro Semanal"
          value={formatCurrency(data?.weeklyProfit)}
          subtitle="Acumulado da semana atual"
          icon={TrendingUp}
          type="profit"
        />
        <StatCard
          title="Lucro Mensal"
          value={formatCurrency(data?.monthlyProfit)}
          subtitle="Acumulado do mês atual"
          icon={CalendarCheck}
          type="profit"
        />

        {/* Seção de Estoque (Ciano Elétrico) */}
        <StatCard
          title="Valor Atual de Estoque"
          value={formatCurrency(data?.stockValue)}
          subtitle="Soma (Estoque * Custo)"
          icon={Package}
          type="stock"
        />
        <StatCard
          title="Lucro Estimado (Estoque)"
          value={formatCurrency(data?.stockProfitEstimate)}
          subtitle="Soma (Estoque * (Venda - Custo))"
          icon={Activity}
          type="stock"
        />
        <StatCard
          title="Total de Itens no Estoque"
          value={data?.totalStockItems || 0}
          subtitle="Quantidade total de produtos"
          icon={Layers}
          type="stock"
        />
      </div>

      <div className="mt-12 p-4 rounded-lg border border-slate-800 bg-slate-900/50">
        <p className="text-xs text-center text-slate-500">
          Atualização em tempo real (5s). Dados calculados com base nas vendas
          finalizadas e status atual do estoque.
        </p>
      </div>
    </div>
  );
}
