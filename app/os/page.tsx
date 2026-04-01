"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, FileText } from "lucide-react";

export default function ServiceOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/os");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Erro ao buscar O.S.:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(
    (os) =>
      os.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.id?.toString().includes(searchTerm) ||
      os.deviceModel?.toLowerCase().includes(searchTerm) ||
      (os.clientCpf || "").replace(/\D/g, "").includes(searchTerm.replace(/\D/g, "")),
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="text-[#FFD700]" />
            Ordens de Serviço
          </h1>
          <Link
            href="/os/novo"
            className="bg-[#FFD700] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#E5C100] transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova O.S.
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="bg-amber-400/5 p-4 rounded-xl border border-amber-400/30 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-amber-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou protocolo..."
              className="w-full bg-[#0B1120] border border-amber-400/40 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-[#112240] rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#0B1120] text-slate-400">
              <tr>
                <th className="p-4">O.S #</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Aparelho</th>
                <th className="p-4">Defeito</th>
                <th className="p-4">Status</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhuma O.S. encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((os) => (
                  <tr
                    key={os.id}
                    className="hover:bg-[#1e293b] transition-colors"
                  >
                    <td className="p-4 font-bold text-[#FFD700]">#{os.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-white">
                        {os.clientName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {os.clientPhone}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {os.deviceBrand} {os.deviceModel}
                    </td>
                    <td className="p-4 text-slate-400 max-w-50 truncate">
                      {os.problem}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border ${
                          os.status === "FINALIZADO" ||
                          os.status === "PRONTO" ||
                          os.status === "ENTREGUE"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : os.status === "ABERTO" ||
                              os.status === "EM_ANALISE" ||
                              os.status === "EM_REPARO" ||
                              os.status === "AGUARDANDO_PECA"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-slate-700/50 text-slate-400 border-slate-600"
                        }`}
                      >
                        {os.status === "ABERTO" && "🔴 ABERTO"}
                        {os.status === "FINALIZADO" && "🟢 FINALIZADO"}
                        {os.status !== "ABERTO" &&
                          os.status !== "FINALIZADO" &&
                          os.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-white">
                      {os.totalPrice
                        ? `R$ ${os.totalPrice.toFixed(2)}`
                        : "A verificar"}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/os/${os.id}`}
                        className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
