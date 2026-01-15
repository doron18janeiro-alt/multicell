"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  ArrowLeft,
  User,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

export default function PDV() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [rates, setRates] = useState({ debit: 0, credit: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  // Polling para sincronização automática
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchConfig();

    const interval = setInterval(() => {
      fetchProducts();
    }, 5000); // Atualiza a cada 5 segundos

    // Atualiza ao focar na janela
    const onFocus = () => fetchProducts();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data);
      }
    } catch (e) {
      console.error("Erro ao buscar clientes:", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Mapeia os dados da API para o formato esperado pelo front
        const mappedProducts = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.salePrice) || 0, // Garante que seja número
          stockQuantity: Number(p.stock) || 0,
          category: p.category,
        }));
        setProducts(mappedProducts);
      }
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data) {
        setRates({
          debit: data.debitRate ?? 1.99,
          credit: data.creditRate ?? 3.99,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      alert("Produto sem estoque!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          alert("Estoque insuficiente!");
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        paymentMethod,
        total,
        customerId: selectedCustomerId || null,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const sale = await res.json();
        setLastSale(sale);
        setCart([]);
        setPaymentMethod("DINHEIRO");
        // alert("Venda realizada com sucesso!");
        // Imprimir automaticamente ou perguntar?
        if (confirm("Venda realizada! Deseja imprimir o comprovante?")) {
          setTimeout(() => handlePrint(), 500);
        }
        fetchProducts(); // Refresh stock immediately
      } else {
        alert("Erro ao finalizar venda.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex  min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 ml-0 lg:ml-64 flex flex-col lg:flex-row gap-6">
        {/* Left: Product Selection */}
        <div className="flex-1 flex flex-col pt-12 lg:pt-0">
          <header className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <ShoppingCart className="text-[#FFD700]" />
                Frente de Caixa (PDV)
              </h1>
              <p className="text-slate-400">Nova Venda</p>
            </div>
            <a
              href="/vendas"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-[#1e293b] px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              <ArrowLeft size={18} />
              Voltar
            </a>
          </header>

          <div className="bg-[#112240] p-4 rounded-xl border border-slate-700 mb-6 flex items-center gap-4">
            <User className="text-[#FFD700]" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-transparent text-white border-none outline-none cursor-pointer text-lg"
            >
              <option value="" className="text-black">
                Cliente: Consumidor Final
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Buscar produto (Nome ou Código)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#112240] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all text-lg"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {searchTerm && filteredProducts.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(searchTerm ? filteredProducts : products.slice(0, 20)).map(
                  (product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`p-4 rounded-xl border text-left transition-all group ${
                        product.stockQuantity > 0
                          ? "bg-[#112240] border-slate-700 hover:border-[#FFD700] hover:bg-[#1e293b]"
                          : "bg-red-900/10 border-red-900/30 opacity-60 cursor-not-allowed"
                      }`}
                      disabled={product.stockQuantity <= 0}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-white line-clamp-2">
                          {product.name}
                        </span>
                        <span className="bg-[#0B1120] text-[#FFD700] text-xs font-bold px-2 py-1 rounded">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="capitalize">{product.category}</span>
                        <span
                          className={
                            product.stockQuantity < 5
                              ? "text-red-400 font-bold"
                              : "text-green-400"
                          }
                        >
                          {product.stockQuantity} est.
                        </span>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="w-full lg:w-[400px] bg-[#112240] rounded-2xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden mt-16 md:mt-0">
          <div className="p-6 bg-[#0f172a] border-b border-slate-700">
            <h2 className="text-xl font-bold text-white flex items-center justify-between">
              <span>Carrinho</span>
              <span className="bg-[#FFD700] text-[#0B1120] text-sm px-2 py-0.5 rounded-full">
                {cart.reduce((acc, item) => acc + item.quantity, 0)} itens
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <ShoppingCart size={48} className="mb-4" />
                <p>Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0B1120] p-3 rounded-lg border border-slate-700 flex justify-between items-center group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-white line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} x R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-[#FFD700]">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-[#0f172a] border-t border-slate-700 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Total</span>
              <span className="text-3xl font-bold text-white">
                R$ {total.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod("DINHEIRO")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  paymentMethod === "DINHEIRO"
                    ? "bg-[#10b981] text-white border-[#10b981] shadow-[0_0_10px_#10b981]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">DINHEIRO</span>
              </button>
              <button
                onClick={() => setPaymentMethod("PIX")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  paymentMethod === "PIX"
                    ? "bg-[#14b8a6] text-white border-[#14b8a6] shadow-[0_0_10px_#14b8a6]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">PIX</span>
              </button>
              <button
                onClick={() => setPaymentMethod("DEBITO")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  paymentMethod === "DEBITO"
                    ? "bg-[#3b82f6] text-white border-[#3b82f6] shadow-[0_0_10px_#3b82f6]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">DÉBITO</span>
              </button>
              <button
                onClick={() => setPaymentMethod("CREDITO")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  paymentMethod === "CREDITO"
                    ? "bg-[#8b5cf6] text-white border-[#8b5cf6] shadow-[0_0_10px_#8b5cf6]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">CRÉDITO</span>
              </button>
            </div>

            {(paymentMethod === "DEBITO" || paymentMethod === "CREDITO") &&
              cart.length > 0 && (
                <div className="bg-[#0B1120] p-2 rounded border border-slate-700 text-center text-xs text-slate-400">
                  <span className="block mb-1">
                    Taxa estimada:{" "}
                    {paymentMethod === "DEBITO" ? rates.debit : rates.credit}%
                  </span>
                  <span className="text-white font-bold">
                    Recebimento Líquido: R${" "}
                    {(
                      total -
                        (total *
                          (paymentMethod === "DEBITO"
                            ? rates.debit
                            : rates.credit)) /
                          100 || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

            <button
              onClick={handleFinalize}
              disabled={loading || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processando..." : "FINALIZAR VENDA"}
            </button>
          </div>
        </div>
      </main>

      {/* Hidden Receipt for Printing */}
      <div style={{ display: "none" }}>
        <div
          ref={printRef}
          className="p-4 text-black bg-white w-[80mm] font-mono text-xs"
        >
          <div className="text-center mb-4">
            <h2 className="font-bold text-lg">MULTICELL</h2>
            <p>Av Paraná, 470 - Bela Vista</p>
            <p>Cândido de Abreu - PR</p>
            <p>CNPJ: 48.002.640.0001/67</p>
            <p>Tel: (43) 99603-1208</p>
          </div>
          <div className="border-b border-black mb-2"></div>
          <div className="mb-2">
            <p className="font-bold">Cliente:</p>
            <p>{lastSale?.customer?.name || "Consumidor Final"}</p>
            {lastSale?.customer?.phone && (
              <p>Tel: {lastSale?.customer?.phone}</p>
            )}
          </div>
          <p className="font-bold text-center mb-2">CUPOM NÃO FISCAL</p>
          <p>Venda #{lastSale?.id}</p>
          <p>Data: {new Date().toLocaleString()}</p>
          <div className="border-b border-black my-2"></div>
          <div className="space-y-1">
            {lastSale?.items.map((item: any) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.quantity}x {item.product?.name}
                </span>
                <span>
                  R$ {((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-b border-black my-2"></div>
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>R$ {(lastSale?.total || 0).toFixed(2)}</span>
          </div>
          <p className="mt-2">Pagamento: {lastSale?.paymentMethod}</p>
          <div className="text-center mt-6">
            <p>Obrigado pela preferência!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
