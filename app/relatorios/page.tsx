"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Target,
  BarChart3,
  FileDown,
  MessageCircle,
} from "lucide-react";
import {
  PaymentMethodsChart,
  ServiceVsProductChart,
  DailyRevenueChart,
  MonthlyEvolutionChart,
} from "@/components/ReportsCharts";
import {
  generatePDFReport,
  generateWhatsAppMessage,
} from "@/components/ReportsPDF";
import { DateRangePickerGlass } from "@/components/DateRangePickerGlass";
import {
  getReportMetrics,
  getDailyRevenueData,
  getMonthlyEvolution,
} from "@/app/actions/reports";
import type { ReportMetrics } from "@/app/actions/reports";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const toInput = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: toInput(start),
    endDate: toInput(end),
  };
};

export default function AdvancedReports() {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultRange);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [metricsData, dailyRevenueData, monthlyEvolutionData] =
          await Promise.all([
            getReportMetrics(dateRange.startDate, dateRange.endDate),
            getDailyRevenueData(dateRange.startDate, dateRange.endDate),
            getMonthlyEvolution(dateRange.endDate),
          ]);

        setMetrics(metricsData);
        setDailyData(dailyRevenueData);
        setMonthlyData(monthlyEvolutionData);
      } catch (error) {
        console.error("[Relatórios] Erro:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  const handleGeneratePDF = async () => {
    if (!metrics) return;
    try {
      setGeneratingPDF(true);
      await generatePDFReport(metrics);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!metrics) return;
    const message = generateWhatsAppMessage(metrics);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0B1120] text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"></div>
          <p className="text-slate-400">
            Carregando inteligência financeira...
          </p>
        </div>
      </div>
    );
  }

  if (!metrics)
    return (
      <div className="flex min-h-screen bg-[#0B1120] text-white items-center justify-center">
        <p className="text-red-400">Erro ao carregar relatórios</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-amber-400 to-yellow-600 rounded-lg">
              <BarChart3 className="w-8 h-8 text-black" />
            </div>
            Centro de Inteligência Financeira
          </h1>
          <p className="text-slate-400 mt-2">
            Período: {formatDate(metrics.period.startDate)} a{" "}
            {formatDate(metrics.period.endDate)}
          </p>
        </div>

        {/* Botões */}
        <div className="flex flex-col md:flex-row gap-3">
          <DateRangePickerGlass
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            defaultFromDays={30}
            onDateRangeChange={(startDate, endDate) =>
              setDateRange({ startDate, endDate })
            }
          />
          <button
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-br from-amber-400 to-yellow-600 text-black rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
          >
            <FileDown className="w-5 h-5" />
            {generatingPDF ? "Gerando..." : "Gerar PDF"}
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg hover:border-amber-600/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-linear-to-br from-amber-400 to-yellow-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-black" />
            </div>
            <p className="text-sm font-medium text-slate-400">💰 Faturamento</p>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.financials.totalRevenue)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.ticketMetrics.totalTransactions} transações
          </p>
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg hover:border-green-600/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              📈 Lucro Líquido
            </p>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.financials.totalProfit)}
          </h3>
          <p className="text-xs text-green-400 mt-2">
            Margem real: {metrics.financials.marginPercent}%
          </p>
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg hover:border-cyan-600/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              🎯 Ticket Médio
            </p>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {formatCurrency(metrics.ticketMetrics.averageTicket)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Por transação</p>
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg hover:border-blue-600/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Award className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">🏆 Melhor Dia</p>
          </div>
          <h3 className="text-lg font-bold text-white">
            {formatDate(metrics.performance.bestDay.date)}
          </h3>
          <p className="text-xs text-blue-400 mt-2">
            {formatCurrency(metrics.performance.bestDay.revenue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-amber-600/20 p-6 shadow-lg">
          <p className="text-sm font-medium text-slate-400">
            Lucro Operacional
          </p>
          <h3 className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(metrics.financials.operatingProfit)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Antes das despesas pagas da loja.
          </p>
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-red-600/20 p-6 shadow-lg">
          <p className="text-sm font-medium text-slate-400">
            Despesas da Loja Pagas
          </p>
          <h3 className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(metrics.financials.shopExpensesPaid)}
          </h3>
          <p className="mt-2 text-xs text-red-400">
            Ja abatidas do lucro liquido real.
          </p>
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-cyan-600/20 p-6 shadow-lg">
          <p className="text-sm font-medium text-slate-400">
            Despesas Pessoais Pagas
          </p>
          <h3 className="mt-3 text-2xl font-bold text-white">
            {formatCurrency(metrics.financials.personalExpensesPaid)}
          </h3>
          <p className="mt-2 text-xs text-cyan-400">
            Controle separado, sem impactar o lucro da loja.
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PaymentMethodsChart data={metrics.paymentMethods} />
        <ServiceVsProductChart data={metrics.serviceVsProducts} />
      </div>

      {/* Evolução Diária */}
      <DailyRevenueChart data={dailyData} />

      {/* Evolução Mensal */}
      <div className="mt-8">
        <MonthlyEvolutionChart data={monthlyData} />
      </div>

      {/* PERFORMANCE DA EQUIPE */}
      <div className="mt-8 bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              👥 Performance da Equipe
            </h3>
            <p className="text-sm text-slate-400">
              Total vendido por cada usuário e comissão estimada no período.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Comissão = total de vendas x percentual individual
          </p>
        </div>

        {metrics.teamPerformance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#0B1120]/60 px-6 py-12 text-center text-slate-400">
            Nenhum vendedor encontrado para o período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {metrics.teamPerformance.map((seller, index) => (
              <div
                key={seller.sellerId}
                className="rounded-2xl border border-zinc-700/40 bg-[#0B1120]/80 p-5 shadow-lg transition-colors hover:border-amber-500/30"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      #{index + 1} no período
                    </p>
                    <h4 className="text-lg font-bold text-white">
                      {seller.sellerName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {seller.role === "ADMIN" ? "Administrador" : "Atendente"}{" "}
                      • Comissão {seller.commissionRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                    {seller.revenueSharePercent.toFixed(1)}% da equipe
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-950/60 p-3">
                    <p className="text-xs text-slate-400">Total de Vendas</p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {formatCurrency(seller.totalSales)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-950/60 p-3">
                    <p className="text-xs text-slate-400">Comissão a Pagar</p>
                    <p className="mt-2 text-lg font-bold text-green-400">
                      {formatCurrency(seller.commissionToPay)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-950/60 p-3">
                    <p className="text-xs text-slate-400">Qtde. de Vendas</p>
                    <p className="mt-2 text-lg font-bold text-cyan-300">
                      {seller.salesCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-950/60 p-3">
                    <p className="text-xs text-slate-400">Ticket Médio</p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {formatCurrency(seller.averageTicket)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Aproveitamento</span>
                    <span>{seller.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-lime-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, seller.progressPercent))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP 5 PRODUTOS */}
      <div className="mt-8 bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          🏆 Top 5 Produtos (Por Lucro)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-700/50">
              <tr className="text-slate-400">
                <th className="pb-4 font-bold">Produto</th>
                <th className="pb-4 font-bold text-right">Quantidade</th>
                <th className="pb-4 font-bold text-right">Faturamento</th>
                <th className="pb-4 font-bold text-right">Custo</th>
                <th className="pb-4 font-bold text-right">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/30">
              {metrics.topProducts.slice(0, 5).map((product, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-4 font-medium text-white">
                    <span className="inline-block w-6 h-6 bg-amber-400/20 text-amber-400 rounded-full text-center text-xs mr-2 font-bold">
                      {idx + 1}
                    </span>
                    {product.name}
                  </td>
                  <td className="py-4 text-right text-slate-300">
                    {product.quantity}
                  </td>
                  <td className="py-4 text-right text-slate-300">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="py-4 text-right text-slate-300">
                    {formatCurrency(product.cost)}
                  </td>
                  <td className="py-4 text-right font-bold text-green-400">
                    {formatCurrency(product.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RANKING DE CATEGORIAS */}
      <div className="mt-8 bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          🎯 Ranking de Categorias
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.categoryRanking.map((category, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 hover:border-amber-600/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-white">{category.category}</h4>
                <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-1 rounded">
                  #{idx + 1}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-slate-400">Faturamento</p>
                  <p className="font-bold text-white text-sm">
                    {formatCurrency(category.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Lucro</p>
                  <p className="font-bold text-green-400 text-sm">
                    {formatCurrency(category.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Qtd</p>
                  <p className="font-bold text-cyan-400 text-sm">
                    {category.quantity}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALERTAS */}
      {metrics.performance.worstDay && (
        <div className="mt-8 bg-linear-to-r from-red-950/50 to-orange-950/50 backdrop-blur-md rounded-2xl border border-red-700/30 p-6 shadow-lg flex items-start gap-4">
          <div className="p-3 bg-red-500/20 rounded-lg">
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">
              ⚠️ Dia de Baixa Detectado
            </h4>
            <p className="text-slate-300 text-sm">
              O dia{" "}
              <span className="font-bold">
                {formatDate(metrics.performance.worstDay.date)}
              </span>{" "}
              registrou o menor faturamento:{" "}
              <span className="text-red-400 font-bold">
                {formatCurrency(metrics.performance.worstDay.revenue)}
              </span>
              . Considere estratégias de retenção.
            </p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-12 p-4 bg-zinc-950/70 backdrop-blur-md rounded-lg border border-zinc-700/50 text-center text-xs text-slate-500">
        <p>
          📍 Av. Paraná, 470 - Cândido de Abreu/PR | 📞 (43) 99603-1208 | CNPJ:
          48.002.640.0001/67
        </p>
      </div>
    </div>
  );
}
