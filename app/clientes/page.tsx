"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, Users, Plus, Download, Phone, FileText } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  _count?: {
    serviceOrders: number;
  };
}

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    document: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Cliente cadastrado com sucesso!");
        setShowForm(false);
        setFormData({ name: "", phone: "", document: "" });
        fetchCustomers();
      } else {
        alert("Erro ao cadastrar cliente.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Nome", "Telefone", "Documento", "Ordens de Serviço"];
    const csvContent = [
      headers.join(","),
      ...customers.map((c) =>
        [
          `"${c.name}"`,
          `"${c.phone}"`,
          `"${c.document || ""}"`,
          c._count?.serviceOrders || 0,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "clientes_multicell.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-[#FFD700]" />
            Gestão de Clientes
          </h1>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-[#112240] text-white border border-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-[#1e293b] transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#FFD700] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#E5C100] transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#112240] p-4 rounded-xl border border-slate-800 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FFD700]"
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
                <th className="p-4">Nome</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Documento</th>
                <th className="p-4">OSs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#1e293b]">
                    <td className="p-4 font-medium text-white">
                      {customer.name}
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      {customer.phone}
                    </td>
                    <td className="p-4 text-slate-400">
                      {customer.document || "-"}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-sm">
                        {customer._count?.serviceOrders || 0} OSs
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#112240] p-8 rounded-xl border border-slate-700 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                Novo Cliente
              </h2>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1">Nome</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Telefone</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    CPF/CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={formData.document}
                    onChange={(e) =>
                      setFormData({ ...formData, document: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#FFD700] hover:bg-[#E5C100] text-black py-2 rounded font-bold"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
