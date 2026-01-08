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
  RotateCcw,
} from "lucide-react";

interface Sale {
  id: number;
  total: number; // mapped from API
  paymentMethod: string;
  items: any[];
  itemsCount?: number;
  createdAt: string;
}

export default function SalesList() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSales(data);
      }
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId: number) => {
    if (
      !confirm(
        "ATENÇÃO: Deseja realmente excluir esta venda?\n\nIsso irá estornar o valor do caixa e devolver os produtos ao estoque automaticamente."
      )
    )
      return;

    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Venda excluída e estornada com sucesso!");
        fetchSales();
      } else {
        const errorData = await res.json();
        alert(`Erro ao excluir: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir venda.");
    }
  };

  const filteredSales = sales.filter((sale) =>
    sale.id.toString().includes(searchTerm)
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="text-[#FFD700]" />
              Gestão de Vendas
            </h1>
            <p className="text-slate-400 mt-2">
              Histórico e gerenciamento de transações
            </p>
          </div>
          <a
            href="/vendas/novo"
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-5 h-5" />
            Nova Venda (PDV)
          </a>
        </header>

        {/* Filters */}
        <div className="bg-[#112240] p-4 rounded-xl border border-slate-800 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por ID da Venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FFD700]"
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-[#112240] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium border-b border-slate-700">
                  ID
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Data
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Forma Pagto
                </th>
                <th className="p-4 font-medium border-b border-slate-700 text-right">
                  Total
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
                    Carregando vendas...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-[#1e293b] transition-colors"
                  >
                    <td className="p-4 text-slate-300">#{sale.id}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-500" />
                        {new Date(sale.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          sale.paymentMethod === "DINHEIRO"
                            ? "bg-green-900/30 text-green-400 border border-green-900/50"
                            : sale.paymentMethod === "PIX"
                            ? "bg-teal-900/30 text-teal-400 border border-teal-900/50"
                            : "bg-blue-900/30 text-blue-400 border border-blue-900/50"
                        }`}
                      >
                        {sale.paymentMethod === "DINHEIRO" ||
                        sale.paymentMethod === "PIX" ? (
                          <DollarSign size={12} />
                        ) : (
                          <CreditCard size={12} />
                        )}
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-[#FFD700]">
                      R$ {sale.total.toFixed(2)}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded transition-colors border border-red-500/30 hover:border-red-500/50"
                        title="Excluir e Estornar"
                      >
                        <Trash2 size={18} />
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
