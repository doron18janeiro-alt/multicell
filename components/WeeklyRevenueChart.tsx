"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface WeeklyData {
  day: string;
  lucro: number;
  data: string;
}

interface WeeklyRevenueChartProps {
  data: WeeklyData[];
  loading?: boolean;
}

export const WeeklyRevenueChart: React.FC<WeeklyRevenueChartProps> = ({
  data = [],
  loading = false,
}) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      lucroFormatted: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(item.lucro),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="h-64 w-full bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 animate-pulse flex items-center justify-center">
        <span className="text-slate-500 text-sm">Carregando dados...</span>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 w-full bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 flex items-center justify-center">
        <span className="text-slate-500 text-sm">Sem dados para o período</span>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">Evolução do Período</h3>
        <p className="text-xs text-slate-400 mt-1">
          Lucro diário filtrado pelo calendário
        </p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(113, 113, 122, 0.2)"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            stroke="rgba(148, 163, 184, 0.5)"
            style={{ fontSize: "12px" }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
            tickLine={false}
          />

          <YAxis
            stroke="rgba(148, 163, 184, 0.5)"
            style={{ fontSize: "12px" }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
            tickLine={false}
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(113, 113, 122, 0.3)",
              borderRadius: "8px",
              backdropFilter: "blur(10px)",
            }}
            labelStyle={{ color: "#E5E7EB" }}
            formatter={(value: number) => [
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value),
              "Azul = Lucro",
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Area
            type="monotone"
            dataKey="lucro"
            stroke="#60A5FA"
            strokeWidth={2}
            fill="url(#profitGradient)"
            isAnimationActive={true}
            animationDuration={600}
            name="Azul = Lucro"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
