"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";

export default function Relatorios() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0B1120] text-white items-center justify-center">
        Carregando inteligência financeira...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <PieChart className="text-[#D4AF37]" />
          Relatórios Financeiros
        </h1>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded bg-blue-500/10 text-blue-400">
                <DollarSign size={24} />
              </div>
              <span className="text-xs text-slate-400 uppercase font-bold">
                Receita Bruta (Mês)
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(data.totalRevenue)}
            </p>
          </div>

          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded bg-red-500/10 text-red-400">
                <TrendingDown size={24} />
              </div>
              <span className="text-xs text-slate-400 uppercase font-bold">
                Custos (CMV)
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(data.totalCost)}
            </p>
          </div>

          <div className="bg-[#112240] p-6 rounded-xl border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded bg-[#D4AF37]/10 text-[#D4AF37]">
                <TrendingUp size={24} />
              </div>
              <span className="text-xs text-[#D4AF37] uppercase font-bold">
                Lucro Líquido
              </span>
            </div>
            <p className="text-3xl font-bold text-[#D4AF37]">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(data.netProfit)}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-[#112240] p-6 rounded-xl border border-slate-800 h-96">
          <h2 className="text-xl font-bold text-white mb-6">
            Desempenho Trimestral
          </h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#233554" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0A192F",
                  borderColor: "#233554",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="vendas" name="Vendas" fill="#D4AF37" />
              <Bar dataKey="servicos" name="Serviços" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
