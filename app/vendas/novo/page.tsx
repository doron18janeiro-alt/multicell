"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { useReactToPrint } from "react-to-print";
import {
  Search,
  Trash2,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Banknote,
  FileText,
  LoaderCircle,
  QrCode,
  Plus,
  ArrowLeft,
  User,
  ScanBarcode,
  X,
} from "lucide-react";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { NfeWalletAlertBanner } from "@/components/NfeWalletAlertBanner";
import { SaleReceiptThermal } from "@/components/SaleReceiptThermal";
import { useBarcodeListener } from "@/hooks/useBarcodeListener";
import { barcodeMatches, normalizeBarcode } from "@/lib/barcode";
import {
  DEFAULT_NFE_RECHARGE_AMOUNT,
  LOW_BALANCE_THRESHOLD,
  NFE_EMISSION_COST,
  canIssueNfe,
} from "@/lib/nfe-wallet";

interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category: string;
  barcode?: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface CompanyConfig {
  name: string;
  cnpj?: string;
  document: string;
  address: string;
  phone: string;
  logoUrl: string;
  debitRate: number;
  creditRate: number;
  nfeBalance: number;
}

function PDVContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [rates, setRates] = useState({ debit: 0, credit: 0 });
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    name: "Minha Empresa",
    cnpj: "",
    document: "",
    address: "",
    phone: "",
    logoUrl: "/wtm-badge.png",
    debitRate: 0,
    creditRate: 0,
    nfeBalance: 0,
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [appBaseUrl, setAppBaseUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || "",
  );
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const clienteIdUrl = searchParams.get("clienteId");

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const termsUrl = useMemo(() => {
    const fallbackUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const normalizedBase = (appBaseUrl || fallbackUrl || "").replace(/\/$/, "");
    return normalizedBase ? `${normalizedBase}/termos` : "/termos";
  }, [appBaseUrl]);

  // Polling para sincronização automática
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

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

  // Novo Effect: Seleção via URL
  useEffect(() => {
    if (clienteIdUrl && customers.length > 0) {
      // Tenta encontrar o cliente na lista carregada
      const found = customers.find(
        (c) => String(c.id) === String(clienteIdUrl),
      );
      if (found) {
        setSelectedCustomerId(found.id);
      } else {
        // Se não estiver na lista (ex: lista paginada ou delay), busca individualmente
        fetch(`/api/customers/${clienteIdUrl}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.id) {
              // Adiciona nas opções se não existir e seleciona
              setCustomers((prev) => [
                ...prev.filter((c) => c.id !== data.id),
                { id: String(data.id), name: data.name },
              ]);
              setSelectedCustomerId(String(data.id));
            }
          })
          .catch((err) => console.error("Erro ao buscar cliente URL:", err));
      }
    }
  }, [clienteIdUrl, customers]); // Depende de 'customers' para rodar logo que carregarem

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
          barcode: p.barcode,
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
        setCompanyConfig({
          name: data.name || "Minha Empresa",
          cnpj: data.cnpj || data.document || "",
          document: data.cnpj || data.document || "",
          address: data.address || "",
          phone: data.phone || "",
          logoUrl: data.logoUrl || "/wtm-badge.png",
          debitRate: data.debitRate ?? 1.99,
          creditRate: data.creditRate ?? 3.99,
          nfeBalance: Number(data.nfeBalance || 0),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = useCallback((product: Product) => {
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
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const findProductByBarcode = useCallback(
    (barcode: string) =>
      products.find((product) => barcodeMatches(product.barcode, barcode)),
    [products],
  );

  const handleUnknownBarcode = useCallback(
    (barcode: string) => {
      const shouldCreate = window.confirm(
        "Produto não cadastrado. Deseja cadastrar agora?",
      );

      if (shouldCreate) {
        router.push(`/estoque?novo=1&barcode=${encodeURIComponent(barcode)}`);
      }
    },
    [router],
  );

  const handleBarcodeDetected = useCallback(
    (barcode: string) => {
      const matchedProduct = findProductByBarcode(barcode);

      if (!matchedProduct) {
        setBarcodeMessage("");
        handleUnknownBarcode(barcode);
        return;
      }

      addToCart(matchedProduct);
      setBarcodeMessage(
        `Código ${barcode} lido. ${matchedProduct.name} adicionado ao carrinho.`,
      );
    },
    [addToCart, findProductByBarcode, handleUnknownBarcode],
  );

  useBarcodeListener({
    enabled: !scannerOpen,
    onScan: handleBarcodeDetected,
  });

  useEffect(() => {
    if (!barcodeMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setBarcodeMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [barcodeMessage]);

  const filteredProducts = products.filter((p) => {
    const normalizedSearch = normalizeBarcode(searchTerm);
    const lowercaseSearch = searchTerm.toLowerCase();

    return (
      p.name.toLowerCase().includes(lowercaseSearch) ||
      p.category.toLowerCase().includes(lowercaseSearch) ||
      String(p.barcode || "").toLowerCase().includes(lowercaseSearch) ||
      barcodeMatches(p.barcode, normalizedSearch)
    );
  });

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const normalized = normalizeBarcode(searchTerm);

    if (!normalized) {
      return;
    }

    const matchedProduct = findProductByBarcode(normalized);

    if (!matchedProduct) {
      return;
    }

    event.preventDefault();
    handleBarcodeDetected(normalized);
  };

  const handleRecharge = async () => {
    setWalletLoading(true);
    setWalletMessage("");

    const checkoutWindow =
      typeof window !== "undefined"
        ? window.open("about:blank", "_blank", "noopener,noreferrer")
        : null;

    try {
      const response = await fetch("/api/mercadopago/nfe-wallet/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: DEFAULT_NFE_RECHARGE_AMOUNT,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(
          payload?.error || "Nao foi possivel abrir a recarga agora.",
        );
      }

      if (checkoutWindow) {
        checkoutWindow.location.href = payload.checkoutUrl;
      } else {
        window.location.href = payload.checkoutUrl;
      }

      setWalletMessage("Checkout aberto em nova aba para recarga de saldo.");
    } catch (error) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }

      console.error(error);
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar a recarga.",
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const handleFinalize = async (issueNfe = false) => {
    if (issueNfe && !canIssueNfe(companyConfig.nfeBalance)) {
      setRechargeModalOpen(true);
      return;
    }

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
        issueNfe,
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
        if (issueNfe) {
          setCompanyConfig((current) => ({
            ...current,
            nfeBalance: Number(
              sale?.remainingNfeBalance ?? current.nfeBalance ?? 0,
            ),
          }));
        }
        // alert("Venda realizada com sucesso!");
        // Imprimir automaticamente ou perguntar?
        if (confirm("Venda realizada! Deseja imprimir o comprovante?")) {
          setTimeout(() => handlePrint(), 500);
        }
        fetchProducts(); // Refresh stock immediately
      } else {
        const errorPayload = await res.json().catch(() => null);
        if (errorPayload?.code === "NFE_BALANCE_LOW") {
          setCompanyConfig((current) => ({
            ...current,
            nfeBalance: Number(errorPayload?.nfeBalance || 0),
          }));
          setWalletMessage(
            errorPayload?.error || "Saldo insuficiente para emitir nota.",
          );
          setRechargeModalOpen(true);
          return;
        }

        alert(errorPayload?.error || "Erro ao finalizar venda.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar venda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0B1120] font-sans text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        {/* Left: Product Selection */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-6">
            <NfeWalletAlertBanner />
          </div>

          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                placeholder="Buscar produto por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-[#112240] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all text-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 sm:w-12 sm:px-0"
              title="Ler código de barras"
            >
              <ScanBarcode className="h-5 w-5" />
              <span className="sm:hidden">Ler código</span>
            </button>
          </div>

          {barcodeMessage && (
            <div className="mb-6 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-100">
              {barcodeMessage}
            </div>
          )}

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
                        <span className="capitalize">
                          {product.category}
                          {product.barcode ? ` • ${product.barcode}` : ""}
                        </span>
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
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="mt-0 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#112240] shadow-2xl lg:w-[400px]">
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

            <div className="rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Saldo para Emissão
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      companyConfig.nfeBalance < LOW_BALANCE_THRESHOLD
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    R$ {companyConfig.nfeBalance.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Custo por nota</p>
                  <p className="mt-1 font-semibold text-white">
                    R$ {NFE_EMISSION_COST.toFixed(2)}
                  </p>
                </div>
              </div>

              {!canIssueNfe(companyConfig.nfeBalance) ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    Saldo insuficiente para emitir nota. Recarregue agora.
                  </span>
                </div>
              ) : null}
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
              onClick={() => handleFinalize(false)}
              disabled={loading || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processando..." : "FINALIZAR VENDA"}
            </button>

            <button
              onClick={() => handleFinalize(true)}
              disabled={loading || cart.length === 0}
              className={`w-full rounded-lg border py-4 font-bold transition-colors ${
                canIssueNfe(companyConfig.nfeBalance)
                  ? "border-[#FACC15] bg-[#FACC15] text-[#0B1120] hover:bg-yellow-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loading ? "Processando..." : "FINALIZAR VENDA + NOTA"}
            </button>
          </div>
        </div>
      </main>

      <BarcodeScannerModal
        open={scannerOpen}
        title="Ler código de barras"
        description="Aponte a câmera para o código do produto para adicionar ao carrinho."
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
        <SaleReceiptThermal
          ref={printRef}
          sale={lastSale}
          config={companyConfig}
          termsUrl={termsUrl}
        />
      </div>

      {rechargeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#112240] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                  Carteira WTM
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Saldo insuficiente para emitir nota
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRechargeModalOpen(false)}
                className="rounded-xl border border-slate-700 p-2 text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
              <p>
                Saldo atual: <strong>R$ {companyConfig.nfeBalance.toFixed(2)}</strong>
              </p>
              <p className="mt-2">
                Cada emissao custa <strong>R$ {NFE_EMISSION_COST.toFixed(2)}</strong>.
                Recarregue agora para liberar o fluxo "Finalizar Venda + Nota".
              </p>
            </div>

            {walletMessage ? (
              <div className="mt-4 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-slate-200">
                {walletMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setRechargeModalOpen(false)}
                className="w-full rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                Voltar ao PDV
              </button>
              <button
                type="button"
                onClick={handleRecharge}
                disabled={walletLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-4 py-3 font-bold text-[#0B1120] transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {walletLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {walletLoading ? "Abrindo checkout..." : "Recarregar Agora"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PDV() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#0B1120] text-white">
          Carregando PDV...
        </div>
      }
    >
      <PDVContent />
    </Suspense>
  );
}
