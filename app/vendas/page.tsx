"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  Share2,
  Zap,
} from "lucide-react";

interface Sale {
  id: number;
  total: number;
  paymentMethod: string;
  items: any[];
  createdAt: string;
}

export default function SalesMetrics() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [todayTotals, setTodayTotals] = useState({
    money: 0,
    pix: 0,
    debit: 0,
    credit: 0,
    total: 0,
  });

  // Data atual formatada (YYYY-MM-DD) para a API
  const getTodayString = () => {
    const now = new Date(); // Browser time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchSales();
    const interval = setInterval(fetchSales, 30000); // Auto-refresh a cada 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSales = async () => {
    try {
      const today = getTodayString();
      const res = await fetch(`/api/sales?date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Sale[] = await res.json();

      if (Array.isArray(data)) {
        setSales(data);
        calculateTotals(data);
      }
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data: Sale[]) => {
    const totals = data.reduce(
      (acc, sale) => {
        const value = sale.total;

        // Normalização simples caso venha algo diferente
        const method = sale.paymentMethod?.toUpperCase() || "";

        if (method === "DINHEIRO") acc.money += value;
        else if (method === "PIX") acc.pix += value;
        // Check for specific Debit/Credit or generic Card with cardType
        else if (method.includes("DEBITO")) acc.debit += value;
        else if (method.includes("CREDITO")) acc.credit += value;
        else if (method === "CARTAO") {
          // Fallback if paymentMethod is generic "CARTAO", try to check other property if available or split logic?
          // The prompt implies we have card_type column separately but frontend might not have it in the Sale interface yet.
          // However, if the API was returning mapped paymentMethod as DEBITO/CREDITO based on cardType, we are good.
          // If API returns "Carta" and cardType "DEBITO", we need to check cardType.
          // Let's assume the API might return generic "CARTAO" and we check the sale object.
          if ((sale as any).cardType === "DEBITO") acc.debit += value;
          else if ((sale as any).cardType === "CREDITO") acc.credit += value;
          else acc.credit += value; // Default to credit if unknown card
        }

        acc.total += value;
        return acc;
      },
      { money: 0, pix: 0, debit: 0, credit: 0, total: 0 }
    );
    setTodayTotals(totals);
  };

  const handleDelete = async (saleId: number) => {
    if (
      !confirm(
        "ATENÇÃO: Deseja excluir esta venda? O valor será subtraído do caixa."
      )
    )
      return;

    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Atualização otimista
        const newSales = sales.filter((s) => s.id !== saleId);
        setSales(newSales);
        calculateTotals(newSales);
        alert("Venda estornada com sucesso!");
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao excluir.");
    }
  };

  const setupCloseDay = () => {
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const message = `
🔒 *FECHAMENTO DE CAIXA* - ${dateStr}
-------------------------
💵 *Dinheiro:* R$ ${todayTotals.money.toFixed(2)}
⚡ *Pix:* R$ ${todayTotals.pix.toFixed(2)}
💳 *Débito:* R$ ${todayTotals.debit.toFixed(2)}
💳 *Crédito:* R$ ${todayTotals.credit.toFixed(2)}
-------------------------
💰 *TOTAL GERAL:* R$ ${todayTotals.total.toFixed(2)}

_Gerado pelo Sistema Multicell_
    `.trim();

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const filteredSales = sales.filter((sale) =>
    sale.id.toString().includes(searchTerm)
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 ml-64">
        {/* Header & Title */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-[#FFD700]" />
              Resumo de Caixa (Hoje)
            </h1>
            <p className="text-slate-400 text-sm">
              Centro de Comando Financeiro
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={setupCloseDay}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Share2 className="w-4 h-4" />
              Fechar Dia (WhatsApp)
            </button>

            <a
              href="/vendas/novo"
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
            >
              <DollarSign className="w-5 h-5" />
              Nova Venda
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card Dinheiro */}
          <div className="bg-[#112240] p-6 rounded-xl border border-green-900/50 shadow-[0_0_20px_rgba(34,197,94,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-green-500/20"></div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider">
                Total em Dinheiro
              </h3>
              <div className="p-2 bg-green-900/30 rounded-lg text-green-400 border border-green-800">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {todayTotals.money.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
              <Zap size={12} fill="currentColor" /> Atualizado agora
            </div>
          </div>

          {/* Card Pix */}
          <div className="bg-[#112240] p-6 rounded-xl border border-teal-900/50 shadow-[0_0_20px_rgba(45,212,191,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-teal-500/20"></div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider">
                Total via Pix
              </h3>
              <div className="p-2 bg-teal-900/30 rounded-lg text-teal-400 border border-teal-800">
                <Zap size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {todayTotals.pix.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-teal-400 flex items-center gap-1">
              <Zap size={12} fill="currentColor" /> Sincronizado
            </div>
          </div>

          {/* Card Débito */}
          <div className="bg-[#112240] p-6 rounded-xl border border-blue-900/50 shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider">
                Débito
              </h3>
              <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400 border border-blue-800">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {todayTotals.debit.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
              <Zap size={12} fill="currentColor" /> Processado
            </div>
          </div>

          {/* Card Crédito */}
          <div className="bg-[#112240] p-6 rounded-xl border border-purple-900/50 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20"></div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider">
                Crédito
              </h3>
              <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400 border border-purple-800">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {todayTotals.credit.toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
              <Zap size={12} fill="currentColor" /> Processado
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#112240] p-4 rounded-xl border border-slate-800 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por ID da venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FFD700]"
            />
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-[#112240] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium border-b border-slate-700">
                  ID
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Hora
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Forma Pagto
                </th>
                <th className="p-4 font-medium border-b border-slate-700 text-right">
                  Valor
                </th>
                <th className="p-4 font-medium border-b border-slate-700 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <div className="animate-pulse flex justify-center">
                      Carregando transações...
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhuma venda registrada hoje.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-[#1e293b] transition-colors group"
                  >
                    <td className="p-4 text-slate-300 font-mono text-sm border-l-2 border-transparent hover:border-[#FFD700]">
                      #{sale.id}
                    </td>
                    <td className="p-4 text-slate-300 text-sm">
                      {new Date(sale.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                          sale.paymentMethod === "DINHEIRO"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : sale.paymentMethod === "PIX"
                            ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {sale.paymentMethod === "DINHEIRO" && (
                          <DollarSign size={12} />
                        )}
                        {sale.paymentMethod === "PIX" && <Zap size={12} />}
                        {sale.paymentMethod !== "DINHEIRO" &&
                          sale.paymentMethod !== "PIX" && (
                            <CreditCard size={12} />
                          )}
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-[#FFD700]">
                      R$ {sale.total.toFixed(2)}
                    </td>
                    <td className="p-4 flex justify-center">
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded transition-all border border-red-500/20 hover:border-red-500/50"
                        title="Excluir Venda"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
