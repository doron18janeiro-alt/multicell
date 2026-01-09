"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  Users,
  Plus,
  Download,
  Phone,
  FileText,
  Pencil,
  Trash2,
  Eye,
  ShoppingBag,
  Wrench,
  Clock,
  X,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  _count?: {
    serviceOrders: number;
    sales?: number;
  };
}

interface SaleItem {
  id: number;
  product?: {
    name: string;
  };
  description?: string;
  quantity: number;
  unitPrice: number;
}

interface Sale {
  id: number;
  createdAt: string;
  total: number;
  paymentMethod: string;
  items: SaleItem[];
}

interface ServiceOrder {
  id: number;
  deviceModel: string;
  problem: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

interface CustomerDetails extends Customer {
  sales: Sale[];
  serviceOrders: ServiceOrder[];
}

export default function Clientes() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    document: "",
  });

  // Details Modal
  const [viewingCustomer, setViewingCustomer] =
    useState<CustomerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "orders">("orders");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      document: customer.document || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return;

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Cliente excluído com sucesso!");
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(`Erro ao excluir: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar exclusão.");
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const result = await res.json();
        alert(
          editingId ? "Cliente atualizado!" : "Cliente cadastrado com sucesso!"
        );

        if (!editingId) {
          const confirmar = window.confirm(
            "✅ Cliente cadastrado! Deseja abrir uma Ordem de Serviço para ele agora?"
          );
          if (confirmar) {
            router.push(`/os/novo?clientId=${result.id}&name=${result.name}`);
          }
        }

        setShowForm(false);
        setEditingId(null);
        setFormData({ name: "", phone: "", document: "" });
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error || "Erro ao salvar"}`);
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

  const handleViewDetails = async (id: string) => {
    setLoadingDetails(true);
    setViewingCustomer(null); // Clear previous
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingCustomer(data);
      } else {
        alert("Erro ao carregar detalhes do cliente");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar detalhes");
    } finally {
      setLoadingDetails(false);
    }
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
              onClick={() => {
                setEditingId(null);
                setFormData({ name: "", phone: "", document: "" });
                setShowForm(true);
              }}
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium border-b border-slate-700">
                  Nome
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Telefone
                </th>
                <th className="p-4 font-medium border-b border-slate-700">
                  Documento
                </th>
                <th className="p-4 font-medium border-b border-slate-700 text-center">
                  Ordens de Serviço
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
                    Carregando...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#1e293b] transition-colors group"
                  >
                    <td
                      className="p-4 text-white font-bold group-hover:text-[#FFD700] transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(c.id)}
                    >
                      {c.name}
                    </td>
                    <td className="p-4 text-slate-400 flex items-center gap-2">
                      <Phone size={14} /> {c.phone}
                    </td>
                    <td className="p-4 text-slate-400">{c.document || "—"}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-700 text-white px-2 py-1 rounded text-xs">
                        {c._count?.serviceOrders || 0}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2 justify-center">
                      <button
                        onClick={() => handleViewDetails(c.id)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-2 rounded transition-colors border border-emerald-500/30 hover:border-emerald-500/50"
                        title="Ver Histórico"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-2 rounded transition-colors border border-blue-500/30 hover:border-blue-500/50"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded transition-colors border border-red-500/30 hover:border-red-500/50"
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

        {/* Customer Details Modal */}
        {(viewingCustomer || loadingDetails) && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="relative bg-[#112240] rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {loadingDetails ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
                  Carregando histórico do cliente...
                </div>
              ) : (
                viewingCustomer && (
                  <>
                    {/* Modal Header */}
                    <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-[#0B1120]">
                      <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                          {viewingCustomer.name}
                        </h2>
                        <div className="flex gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Phone size={14} /> {viewingCustomer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText size={14} />{" "}
                            {viewingCustomer.document || "SEM CPF"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingCustomer(null)}
                        className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800 bg-[#0B1120]">
                      <button
                        onClick={() => setActiveTab("orders")}
                        className={`flex-1 py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                          activeTab === "orders"
                            ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Wrench size={18} />
                        Ordens de Serviço (
                        {viewingCustomer.serviceOrders?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab("sales")}
                        className={`flex-1 py-4 px-6 font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                          activeTab === "sales"
                            ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <ShoppingBag size={18} />
                        Histórico de Compras (
                        {viewingCustomer.sales?.length || 0})
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#112240]">
                      {activeTab === "orders" ? (
                        <div className="space-y-4">
                          {viewingCustomer.serviceOrders?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                              Nenhuma ordem de serviço encontrada.
                            </div>
                          ) : (
                            viewingCustomer.serviceOrders?.map((os) => (
                              <div
                                key={os.id}
                                className="bg-[#0B1120] p-4 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs font-mono">
                                      OS #{os.id}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                                        os.status === "FINALIZADO"
                                          ? "bg-green-500/20 text-green-400"
                                          : os.status === "ABERTO"
                                          ? "bg-blue-500/20 text-blue-400"
                                          : "bg-yellow-500/20 text-yellow-400"
                                      }`}
                                    >
                                      {os.status}
                                    </span>
                                    {os.status === "FINALIZADO" &&
                                      (new Date().getTime() -
                                        new Date(os.createdAt).getTime()) /
                                        (1000 * 3600 * 24) <=
                                        90 && (
                                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-bold uppercase border border-blue-500/30">
                                          Garantia Ativa
                                        </span>
                                      )}
                                  </div>
                                  <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(os.createdAt).toLocaleDateString(
                                      "pt-BR"
                                    )}
                                  </span>
                                </div>
                                <h3 className="text-white font-medium mb-1">
                                  {os.deviceModel ||
                                    "Aparelho não identificado"}
                                </h3>
                                <p className="text-slate-400 text-sm mb-3">
                                  Defeito: {os.problem}
                                </p>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                                  <span className="text-[#FFD700] font-bold">
                                    {os.totalPrice > 0
                                      ? `R$ ${os.totalPrice.toFixed(2)}`
                                      : "A Orçar"}
                                  </span>
                                  <button
                                    onClick={() => router.push(`/os/${os.id}`)}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors"
                                  >
                                    Ver Detalhes
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {viewingCustomer.sales?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                              Nenhuma compra registrada.
                            </div>
                          ) : (
                            viewingCustomer.sales?.map((sale) => (
                              <div
                                key={sale.id}
                                className="bg-[#0B1120] p-4 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(
                                      sale.createdAt
                                    ).toLocaleDateString("pt-BR")}{" "}
                                    às{" "}
                                    {new Date(
                                      sale.createdAt
                                    ).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">
                                    {sale.paymentMethod}
                                  </span>
                                </div>

                                <div className="space-y-2 mb-3">
                                  {sale.items?.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between text-sm"
                                    >
                                      <span className="text-white">
                                        {item.quantity}x{" "}
                                        {item.product?.name ||
                                          item.description ||
                                          "Item Avulso"}
                                      </span>
                                      <span className="text-slate-400">
                                        R${" "}
                                        {(
                                          item.unitPrice * item.quantity
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                                  <div className="font-bold text-[#FFD700]">
                                    Total: R$ {sale.total.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#112240] p-8 rounded-xl border border-slate-700 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId ? "Editar Cliente" : "Novo Cliente"}
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
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ name: "", phone: "", document: "" });
                    }}
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
