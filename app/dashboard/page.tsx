"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Smartphone,
  DollarSign,
  ArrowUpRight,
  Clock,
  MessageCircle,
} from "lucide-react";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    pendingCount: 0,
    finishedCount: 0,
    revenueToday: 0,
    stockValue: 0,
    profitToday: 0,
    recentOrders: [] as any[],
    salesByMethod: [] as any[],
    lowStockProducts: [] as any[],
  });

  useEffect(() => {
    setMounted(true);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Erro ao carregar dashboard:", err));
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8 bg-[#0B1120] text-slate-400">
        Carregando painel...
      </div>
    );
  }

  const handleClosingSummary = () => {
    const f = (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);

    const pixMoney = stats.salesByMethod
      .filter((m) => ["PIX", "DINHEIRO"].includes(m.paymentMethod))
      .reduce((acc, c) => acc + c.total, 0);

    const card = stats.salesByMethod
      .filter((m) => !["PIX", "DINHEIRO"].includes(m.paymentMethod))
      .reduce((acc, c) => acc + c.total, 0);

    const txt = `📊 FECHAMENTO MULTICELL - ${new Date().toLocaleDateString()}\n\n💰 Faturamento Bruto: ${f(
      stats.revenueToday
    )}\n📈 Lucro Líquido: ${f(stats.profitToday)}\n🛠️ Serviços (OS): ${
      stats.finishedCount || 0
    } aparelhos entregues.\n📦 Patrimônio em Estoque: ${f(
      stats.stockValue
    )}\n💳 Pix/Dinheiro: ${f(pixMoney)} | Cartão: ${f(
      card
    )}\n\n📍 Av Paraná, 470 - Cândido de Abreu.`;

    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank");
  };

  const handleWhatsApp = (order: any) => {
    const phone = order.customer?.phone?.replace(/\D/g, "") || "";
    const message = `Olá! Aqui é da MULTICELL. O seu aparelho ${
      order.model
    } já passou pela análise técnica. Status: ${
      order.status
    }. Valor Total: R$ ${
      order.price || "0,00"
    }. Qualquer dúvida, estamos à disposição!`;

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-slate-400">
            Visão geral da loja hoje, {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClosingSummary}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Consolidado do Dia
          </button>
          <button className="btn-primary">+ Nova Venda</button>
        </div>
      </div>

      {/* Critical Stock Alerts */}
      {stats.lowStockProducts?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-500 w-6 h-6" />
            <h2 className="text-xl font-bold text-white">
              ⚠️ ALERTAS DE ESTOQUE CRÍTICO
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.lowStockProducts.map((p: any) => (
              <div
                key={p.id}
                className="bg-[#112240] border border-red-500 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-white">{p.name}</h3>
                  <p className="text-red-400 text-sm font-semibold">
                    Apenas {p.stock} unidades restantes!
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  Min: {p.minQuantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Faturamento */}
        <div className="card-dashboard">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded bg-[#112240] border border-[#233554] text-[#D4AF37]">
              <DollarSign size={24} />
            </div>
            <span className="flex items-center text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">
              +12.5% <ArrowUpRight size={14} className="ml-1" />
            </span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">
            Faturamento do Dia
          </h3>
          <p className="text-2xl font-bold text-white mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(stats.revenueToday || 0)}
          </p>
        </div>

        {/* Card 2: O.S. Abertas */}
        <div className="card-dashboard">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded bg-[#112240] border border-[#233554] text-blue-400">
              <Smartphone size={24} />
            </div>
            <span className="flex items-center text-slate-400 text-xs font-bold bg-slate-700/30 px-2 py-1 rounded">
              {stats.pendingCount || 0} Pendentes
            </span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">
            O.S. em Andamento
          </h3>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.pendingCount || 0}
          </p>
        </div>

        {/* Card 3: Lucro do Dia */}
        <div className="card-dashboard">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded bg-[#112240] border border-[#233554] text-green-500">
              <TrendingUp size={24} />
            </div>
            <span className="flex items-center text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">
              Hoje <ArrowUpRight size={14} className="ml-1" />
            </span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">
            Lucro Líquido (Hoje)
          </h3>
          <p className="text-2xl font-bold text-white mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(stats.profitToday || 0)}
          </p>
        </div>

        {/* Card 4: Patrimônio em Estoque */}
        <div className="card-dashboard border-blue-900/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded bg-[#112240] border border-[#233554] text-blue-400">
              <DollarSign size={24} />
            </div>
            <span className="flex items-center text-blue-400 text-xs font-bold bg-blue-400/10 px-2 py-1 rounded">
              Total
            </span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">
            Valor Atual de Estoque
          </h3>
          <p className="text-2xl font-bold text-white mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(stats.stockValue || 0)}
          </p>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabela de O.S. Recentes */}
        <div className="lg:col-span-2 card-dashboard">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">
              Últimas Ordens de Serviço
            </h2>
            <button className="text-sm text-[#D4AF37] hover:underline">
              Ver todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-[#0A192F]">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">O.S #</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Aparelho</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3 rounded-r-lg">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#233554]">
                {(stats.recentOrders?.length || 0) === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Nenhuma O.S. recente encontrada.
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders?.map((order: any) => (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        order.status === "PRONTO"
                          ? "bg-green-900/10 hover:bg-green-900/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                          : "hover:bg-[#112240]"
                      }`}
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        #{order.id}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {order.customer?.name}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {order.model}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            order.status === "PRONTO"
                              ? "bg-green-500/10 text-green-500"
                              : order.status === "ABERTO"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {order.price ? `R$ ${order.price}` : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleWhatsApp(order)}
                          className="text-green-500 hover:text-green-400 p-2 rounded hover:bg-green-500/10 transition-colors"
                          title="Enviar Status via WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fechamento de Caixa */}
        <div className="card-dashboard">
          <h2 className="text-lg font-bold text-white mb-6">
            Fechamento de Caixa (Hoje)
          </h2>
          <div className="space-y-4">
            {stats.salesByMethod?.length > 0 ? (
              stats.salesByMethod.map((item: any) => (
                <div
                  key={item.paymentMethod}
                  className="flex justify-between items-center p-3 rounded bg-[#0A192F] border border-[#233554]"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-[#D4AF37]" size={20} />
                    <span className="text-sm font-bold text-white">
                      {item.paymentMethod}
                    </span>
                  </div>
                  <span className="text-[#D4AF37] font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(item.total || 0)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">
                Nenhuma venda registrada hoje.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
