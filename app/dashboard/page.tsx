"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Activity,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";

// Helper de formatação
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

// Componente Card
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  type = "profit",
  loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  type?: "profit" | "stock";
  loading?: boolean;
}) => {
  const isProfit = type === "profit";

  // Cores Glassmorphism
  const colorClasses = isProfit
    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
    : "text-cyan-400 border-cyan-500/20 bg-cyan-500/10";

  const iconBg = isProfit ? "bg-emerald-500/20" : "bg-cyan-500/20";
  const iconColor = isProfit ? "text-emerald-400" : "text-cyan-400";
  const glowColor = isProfit ? "bg-emerald-500" : "bg-cyan-500";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${colorClasses}`}
    >
      <div className="flex items-center justify-between z-10 relative">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-700/50 rounded animate-pulse my-1" />
          ) : (
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {value}
            </h3>
          )}
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
      {/* Background Decor */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none ${glowColor}`}
      />
    </div>
  );
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-400">
        <div className="text-center">
          <p className="mb-2">Erro ao carregar dados do painel.</p>
          <button
            onClick={() => mutate()}
            className="text-sm underline hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            Painel de Gestão
          </h1>
          <p className="text-slate-400 mt-2">
            Visão financeira em tempo real e controle patrimonial.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 text-slate-500 text-sm hover:text-emerald-400 transition-colors cursor-pointer opacity-80 hover:opacity-100"
          title="Clique para atualizar agora"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading && !data
            ? "Sincronizando..."
            : "Atualização em tempo real (2s)"}
        </button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* === LUCROS === */}
        <StatCard
          title="Lucro Diário (Hoje)"
          value={formatCurrency(data?.dailyProfit)}
          subtitle="Vendas Líquidas - Custos"
          icon={DollarSign}
          type="profit"
          loading={isLoading && !data}
        />
        <StatCard
          title="Lucro Semanal"
          value={formatCurrency(data?.weeklyProfit)}
          subtitle="Acumulado da semana atual"
          icon={TrendingUp}
          type="profit"
          loading={isLoading && !data}
        />
        <StatCard
          title="Lucro Mensal"
          value={formatCurrency(data?.monthlyProfit)}
          subtitle="Acumulado do mês atual"
          icon={CalendarCheck}
          type="profit"
          loading={isLoading && !data}
        />

        {/* === ESTOQUE === */}
        <StatCard
          title="Valor Atual de Estoque"
          value={formatCurrency(data?.stockValue)}
          subtitle="Patrimônio (Custo Total)"
          icon={Package}
          type="stock"
          loading={isLoading && !data}
        />
        <StatCard
          title="Lucro Estimado (Estoque)"
          value={formatCurrency(data?.stockProfitEstimate)}
          subtitle="Projeção na venda de tudo"
          icon={Activity}
          type="stock"
          loading={isLoading && !data}
        />
        <StatCard
          title="Total de Itens"
          value={data?.totalStockItems || 0}
          subtitle="Produtos físicos em loja"
          icon={Layers}
          type="stock"
          loading={isLoading && !data}
        />
      </div>

      <div className="mt-8 p-4 rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Atualização automática (5s)</span>
          <span>Versão v2.1 • Fuso: America/Sao_Paulo</span>
        </div>
      </div>
    </div>
  );
}
