"use client";

import {
  PieChart,
  Pie,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Cores premium - Mapeadas por método de pagamento
const COLORS: Record<string, string> = {
  CRÉDITO: "#D4AF37", // Ouro
  DÉBITO: "#60A5FA", // Azul
  PIX: "#10B981", // Verde
  DINHEIRO: "#F59E0B", // Laranja
  BOLETO: "#8B5CF6", // Roxo
  "Não informado": "#6B7280", // Cinza
};

const getPaymentColor = (method: string): string => {
  return COLORS[method] || "#4ECDC4";
};

interface PaymentMethod {
  method: string;
  count?: number;
  total: number;
  percentage: number;
}

export function PaymentMethodsChart({ data }: { data: PaymentMethod[] }) {
  const chartData = data.map((item) => ({
    name: item.method,
    value: item.total,
  }));

  return (
    <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        💳 Formas de Pagamento
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={100}
            fill="#D4AF37"
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={getPaymentColor(entry.name)}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value)
            }
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(113, 113, 122, 0.3)",
              borderRadius: "8px",
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "16px" }}
            formatter={(value) => String(value)}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
        {data.map((method, idx) => {
          const color = getPaymentColor(method.method);
          return (
            <div
              key={idx}
              className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3 hover:border-opacity-70 transition-all"
              style={{ borderColor: color + "40" }}
            >
              <p className="text-sm text-slate-400">{method.method}</p>
              <p className="text-lg font-bold" style={{ color }}>
                {method.percentage.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ServiceVsProduct {
  serviceRevenue: number;
  productRevenue: number;
  serviceProfit: number;
  productProfit: number;
}

export function ServiceVsProductChart({ data }: { data: ServiceVsProduct }) {
  const chartData = [
    {
      category: "Serviços",
      Faturamento: data.serviceRevenue,
      Lucro: data.serviceProfit,
    },
    {
      category: "Produtos",
      Faturamento: data.productRevenue,
      Lucro: data.productProfit,
    },
  ];

  return (
    <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📊 Serviços vs Produtos
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(113, 113, 122, 0.2)"
          />
          <XAxis dataKey="category" stroke="rgba(148, 163, 184, 0.5)" />
          <YAxis
            stroke="rgba(148, 163, 184, 0.5)"
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: any) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value)
            }
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(113, 113, 122, 0.3)",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar
            dataKey="Faturamento"
            fill="#D4AF37"
            radius={[8, 8, 0, 0]}
            name="Amarelo = Faturamento"
          />
          <Bar
            dataKey="Lucro"
            fill="#60A5FA"
            radius={[8, 8, 0, 0]}
            name="Azul = Lucro"
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="bg-zinc-900/50 border border-amber-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Faturamento Serviços</p>
          <p className="text-lg font-bold text-amber-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.serviceRevenue)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-cyan-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Lucro Serviços</p>
          <p className="text-lg font-bold text-cyan-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.serviceProfit)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-amber-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Faturamento Produtos</p>
          <p className="text-lg font-bold text-amber-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.productRevenue)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-cyan-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Lucro Produtos</p>
          <p className="text-lg font-bold text-cyan-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.productProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface DailyRevenue {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  profit: number;
}

export function MonthlyEvolutionChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map((item) => ({
    month: item.monthLabel,
    Faturamento: item.revenue,
    Lucro: item.profit,
  }));

  return (
    <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📊 Evolução Mensal (6 Meses)
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(113, 113, 122, 0.2)"
          />
          <XAxis dataKey="month" stroke="rgba(148, 163, 184, 0.5)" />
          <YAxis
            stroke="rgba(148, 163, 184, 0.5)"
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: any) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value)
            }
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(113, 113, 122, 0.3)",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar
            dataKey="Faturamento"
            fill="#D4AF37"
            radius={[8, 8, 0, 0]}
            name="Amarelo = Faturamento"
          />
          <Bar
            dataKey="Lucro"
            fill="#60A5FA"
            radius={[8, 8, 0, 0]}
            name="Azul = Lucro"
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="bg-zinc-900/50 border border-amber-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Faturamento Total</p>
          <p className="text-lg font-bold text-amber-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.reduce((acc, m) => acc + m.revenue, 0))}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-blue-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Lucro Total</p>
          <p className="text-lg font-bold text-blue-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(data.reduce((acc, m) => acc + m.profit, 0))}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-amber-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Ticket Médio</p>
          <p className="text-lg font-bold text-amber-400">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(
              data.reduce((acc, m) => acc + m.revenue, 0) / (data.length || 1),
            )}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-blue-600/30 rounded-lg p-3">
          <p className="text-xs text-slate-400">Margem Média</p>
          <p className="text-lg font-bold text-blue-400">
            {(
              (data.reduce((acc, m) => acc + m.profit, 0) /
                data.reduce((acc, m) => acc + m.revenue, 0)) *
                100 || 0
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>
    </div>
  );
}

export function DailyRevenueChart({ data }: { data: DailyRevenue[] }) {
  return (
    <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📈 Evolução Diária
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(113, 113, 122, 0.2)"
          />
          <XAxis
            dataKey="date"
            stroke="rgba(148, 163, 184, 0.5)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(148, 163, 184, 0.5)"
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: any) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value)
            }
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(113, 113, 122, 0.3)",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#D4AF37"
            fill="url(#colorRevenue)"
            name="Amarelo = Faturamento"
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#60A5FA"
            fill="url(#colorProfit)"
            name="Azul = Lucro"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
