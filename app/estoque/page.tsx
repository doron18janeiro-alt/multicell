"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  Package,
  AlertTriangle,
  Plus,
  Truck,
  Download,
  Pencil,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number; // Changed from stockQuantity to match API/Prisma
  minQuantity: number;
  category: string;
  supplierId?: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function Estoque() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    costPrice: "",
    stockQuantity: "",
    minQuantity: "2",
    category: "PECA",
    supplierId: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierData, setSupplierData] = useState({
    name: "",
    contact: "",
    whatsapp: "",
    catalogUrl: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      stockQuantity: product.stock.toString(),
      minQuantity: product.minQuantity.toString(),
      category: product.category,
      supplierId: product.supplierId || "",
    });
    setShowForm(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(
          editingId ? "Produto atualizado!" : "Produto cadastrado com sucesso!"
        );
        setShowForm(false);
        setEditingId(null);
        setFormData({
          name: "",
          price: "",
          costPrice: "",
          stockQuantity: "",
          minQuantity: "2",
          category: "PECA",
          supplierId: "",
        });
        fetchProducts();
      } else {
        alert("Erro ao salvar produto.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });

      if (res.ok) {
        alert("Fornecedor cadastrado!");
        setShowSupplierForm(false);
        setSupplierData({
          name: "",
          contact: "",
          whatsapp: "",
          catalogUrl: "",
        });
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Nome",
      "Categoria",
      "Preço Venda",
      "Preço Custo",
      "Estoque",
      "Fornecedor",
    ];
    const csvContent = [
      headers.join(","),
      ...products.map((p) => {
        const supplier =
          suppliers.find((s) => s.id === p.supplierId)?.name || "N/A";
        return [
          `"${p.name}"`,
          p.category,
          p.price,
          p.costPrice,
          p.stock,
          `"${supplier}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "estoque_multicell.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "TODOS" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="text-[#FFD700]" />
            Gestão de Estoque
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
              onClick={() => setShowSupplierForm(true)}
              className="bg-[#112240] text-white border border-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-[#1e293b] transition-colors flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Fornecedores
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  price: "",
                  costPrice: "",
                  stockQuantity: "",
                  minQuantity: "2",
                  category: "PECA",
                  supplierId: "",
                });
                setShowForm(true);
              }}
              className="bg-[#FFD700] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#E5C100] transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Produto
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#112240] p-4 rounded-xl border border-slate-800 mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar produto..."
              className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#FFD700]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="bg-[#0B1120] border border-slate-700 rounded-lg px-4 text-white focus:outline-none focus:border-[#FFD700]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="TODOS">Todas Categorias</option>
            <option value="PECA">Peças</option>
            <option value="ACESSORIO">Acessórios</option>
          </select>
        </div>

        {/* Product List */}
        <div className="bg-[#112240] rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#0B1120] text-slate-400">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Preço Custo</th>
                <th className="p-4">Preço Venda</th>
                <th className="p-4">Estoque</th>
                <th className="p-4">Status</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-[#1e293b] transition-colors"
                  >
                    <td className="p-4 font-medium text-white">
                      {product.name}
                    </td>
                    <td className="p-4 text-slate-300">
                      <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      R$ {(product.costPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-[#FFD700] font-bold">
                      R$ {(product.price || 0).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold ${
                          product.stock <= product.minQuantity
                            ? "text-red-500"
                            : "text-white"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      {product.stock <= product.minQuantity && (
                        <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4" />
                          BAIXO ESTOQUE
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Create Product */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#112240] p-8 rounded-xl border border-slate-700 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId ? "Editar Produto" : "Novo Produto"}
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Preço Custo
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costPrice: e.target.value.replace(",", "."),
                        })
                      }
                    />
                    {formData.costPrice &&
                      (isNaN(parseFloat(formData.costPrice)) ||
                        parseFloat(formData.costPrice) < 0) && (
                        <p className="text-red-500 text-xs mt-1">
                          Valor inválido
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Preço Venda
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value.replace(",", "."),
                        })
                      }
                    />
                    {(!formData.price ||
                      isNaN(parseFloat(formData.price)) ||
                      parseFloat(formData.price) <= 0) && (
                      <p className="text-red-500 text-xs mt-1">
                        Obrigatório (&gt; 0)
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Estoque</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.stockQuantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stockQuantity: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mínimo</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.minQuantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minQuantity: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Categoria
                    </label>
                    <select
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      <option value="PECA">Peça</option>
                      <option value="ACESSORIO">Acessório</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Fornecedor
                  </label>
                  <select
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={formData.supplierId}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value })
                    }
                  >
                    <option value="">Sem Fornecedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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
                    disabled={
                      !formData.name ||
                      !formData.price ||
                      isNaN(parseFloat(formData.price)) ||
                      parseFloat(formData.price) <= 0 ||
                      !formData.costPrice ||
                      isNaN(parseFloat(formData.costPrice)) ||
                      parseFloat(formData.costPrice) < 0
                    }
                    className={`flex-1 py-2 rounded font-bold transition-colors ${
                      !formData.name ||
                      !formData.price ||
                      isNaN(parseFloat(formData.price)) ||
                      parseFloat(formData.price) <= 0 ||
                      !formData.costPrice ||
                      isNaN(parseFloat(formData.costPrice)) ||
                      parseFloat(formData.costPrice) < 0
                        ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                        : "bg-[#FFD700] hover:bg-[#E5C100] text-black"
                    }`}
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Create Supplier */}
        {showSupplierForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#112240] p-8 rounded-xl border border-slate-700 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                Novo Fornecedor
              </h2>
              <form onSubmit={handleCreateSupplier} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1">Nome</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={supplierData.name}
                    onChange={(e) =>
                      setSupplierData({ ...supplierData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contato</label>
                  <input
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={supplierData.contact}
                    onChange={(e) =>
                      setSupplierData({
                        ...supplierData,
                        contact: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={supplierData.whatsapp}
                    onChange={(e) =>
                      setSupplierData({
                        ...supplierData,
                        whatsapp: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSupplierForm(false)}
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
