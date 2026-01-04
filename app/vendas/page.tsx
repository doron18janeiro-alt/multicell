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

export default function Vendas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
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

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > 0 && newQty <= item.stockQuantity) {
            return { ...item, quantity: newQty };
          }
        }
        return item;
      })
    );
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleFinalize = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          paymentMethod,
          total,
        }),
      });

      if (res.ok) {
        const sale = await res.json();
        setLastSale(sale);
        alert(`Venda #${sale.id} realizada com sucesso!`);
        setTimeout(() => {
          handlePrint();
        }, 500);
        setCart([]);
        fetchProducts(); // Refresh stock
      } else {
        alert("Erro ao finalizar venda.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100">
      <Sidebar />
      <main className="flex-1 flex p-6 gap-6">
        {/* Left: Product Selection */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800 shadow-lg">
            <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="text-[#FFD700]" />
              PDV - Frente de Caixa
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar produto (Nome ou Código)..."
                className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#FFD700]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stockQuantity <= 0}
                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between h-32 ${
                  product.stockQuantity <= 0
                    ? "bg-red-900/20 border-red-900/50 opacity-50 cursor-not-allowed"
                    : "bg-[#112240] border-slate-800 hover:border-[#FFD700] hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-white truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400">{product.category}</p>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[#FFD700] font-bold">
                    R$ {product.price.toFixed(2)}
                  </span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                    Est: {product.stockQuantity}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="w-96 bg-[#112240] rounded-xl border border-slate-800 shadow-lg flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-bold text-white">Carrinho de Compras</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                Carrinho vazio
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-[#0B1120] p-3 rounded-lg border border-slate-800"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#FFD700]">
                      R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800 rounded px-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-slate-400 hover:text-white px-1"
                      >
                        -
                      </button>
                      <span className="text-sm w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-slate-400 hover:text-white px-1"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-[#0B1120] border-t border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-xl font-bold text-white">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod("DINHEIRO")}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  paymentMethod === "DINHEIRO"
                    ? "bg-[#FFD700] text-black border-[#FFD700]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">Dinheiro</span>
              </button>
              <button
                onClick={() => setPaymentMethod("PIX")}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  paymentMethod === "PIX"
                    ? "bg-[#FFD700] text-black border-[#FFD700]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">Pix</span>
              </button>
              <button
                onClick={() => setPaymentMethod("CARTAO")}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  paymentMethod === "CARTAO"
                    ? "bg-[#FFD700] text-black border-[#FFD700]"
                    : "bg-[#112240] border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">Cartão</span>
              </button>
            </div>

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
          <p className="font-bold text-center mb-2">CUPOM NÃO FISCAL</p>
          <p>Venda #{lastSale?.id}</p>
          <p>Data: {new Date().toLocaleString()}</p>
          <div className="border-b border-black my-2"></div>
          <div className="space-y-1">
            {lastSale?.items.map((item: any) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.quantity}x {item.product.name}
                </span>
                <span>R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-b border-black my-2"></div>
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>R$ {lastSale?.total.toFixed(2)}</span>
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
