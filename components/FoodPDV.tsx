"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft,
  Check,
  CreditCard,
  DollarSign,
  NotebookPen,
  Plus,
  QrCode,
  Search,
  Trash2,
  User,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SaleReceiptThermal } from "@/components/SaleReceiptThermal";
import {
  FOOD_PENDING_PAYMENT_METHOD,
  formatCurrency,
  getFoodOrderItemResolvedQuantity,
  isFoodOrderItemResolved,
  normalizeTableNumber,
  resolvePaymentMethodLabel,
} from "@/lib/food";

type Product = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category: string;
};

type CartItem = Product & {
  quantity: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  document?: string | null;
};

type CompanyConfig = {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  debitRate: number;
  creditRate: number;
};

type FoodDashboard = {
  tables: Array<{
    id: string;
    number: string;
    status: "DISPONIVEL" | "OCUPADO";
    currentOrder: null | {
      id: string;
      status: string;
      total: number;
      paidAmount: number;
      pendingTransferredAmount: number;
      balanceDue: number;
      customer: null | {
        id: string;
        name: string;
        phone: string;
        document?: string | null;
      };
      items: Array<{
        id: string;
        description: string;
        quantity: number;
        status: string;
        settledQuantity: number;
        unitPrice: number;
        createdAt: string;
      }>;
      payments: Array<{
        id: string;
        amount: number;
        paymentMethod: string;
        dueDate?: string | null;
        createdAt: string;
      }>;
    };
  }>;
};

const buildDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const FOOD_DASHBOARD_REFRESH_EVENT = "wtm-food-dashboard-refresh";
const FOOD_DASHBOARD_REFRESH_STORAGE_KEY = "wtm-food-dashboard-refresh";

const notifyFoodDashboardRefresh = () => {
  if (typeof window === "undefined") {
    return;
  }

  const stamp = String(Date.now());
  window.dispatchEvent(new Event(FOOD_DASHBOARD_REFRESH_EVENT));
  window.localStorage.setItem(FOOD_DASHBOARD_REFRESH_STORAGE_KEY, stamp);
};

const paymentMethodOptions = [
  {
    id: "DINHEIRO",
    label: "Dinheiro",
    icon: DollarSign,
    activeClass: "border-emerald-400 bg-emerald-500 text-white",
  },
  {
    id: "PIX",
    label: "Pix",
    icon: QrCode,
    activeClass: "border-cyan-400 bg-cyan-500 text-white",
  },
  {
    id: "DEBITO",
    label: "Cartao Debito",
    icon: CreditCard,
    activeClass: "border-blue-400 bg-blue-500 text-white",
  },
  {
    id: "CREDITO",
    label: "Cartao Credito",
    icon: CreditCard,
    activeClass: "border-fuchsia-400 bg-fuchsia-500 text-white",
  },
  {
    id: FOOD_PENDING_PAYMENT_METHOD,
    label: "Pendente",
    icon: NotebookPen,
    activeClass: "border-amber-300 bg-amber-400 text-[#0B1120]",
  },
] as const;

export function FoodPDV() {
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get("mesa");
  const clienteIdParam = searchParams.get("clienteId");
  const checkoutMode = String(searchParams.get("checkout") || "").toLowerCase();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dashboard, setDashboard] = useState<FoodDashboard | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    name: "Minha Empresa",
    cnpj: "",
    document: "",
    address: "",
    phone: "",
    logoUrl: "/wtm-float.png",
    debitRate: 1.99,
    creditRate: 3.99,
  });
  const [tableNumber, setTableNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [receiptDocument, setReceiptDocument] = useState("");
  const [dueDate, setDueDate] = useState(buildDefaultDueDate());
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedPaymentItemIds, setSelectedPaymentItemIds] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [closingOrder, setClosingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSale, setLastSale] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const paymentModalOpen = false;
  const paymentAmount = "";
  const setPaymentAmount = (_value: string) => {};
  const setPaymentModalOpen = (_value: boolean) => {};

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const loadProducts = async () => {
    const response = await fetch("/api/products");
    const payload = await response.json();

    if (!Array.isArray(payload)) {
      return;
    }

    setProducts(
      payload.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: Number(product.salePrice || 0),
        stockQuantity: Number(product.stock || 0),
        category: product.category,
      })),
    );
  };

  const loadCustomers = async () => {
    const response = await fetch("/api/customers");
    const payload = await response.json();

    if (!Array.isArray(payload)) {
      return;
    }

    setCustomers(
      payload.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        document: customer.document,
      })),
    );
  };

  const loadDashboard = async () => {
    const response = await fetch("/api/food/dashboard", {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "Falha ao carregar mesas.");
    }

    setDashboard(payload);
  };

  const loadConfig = async () => {
    const response = await fetch("/api/config");
    const payload = await response.json();

    if (!payload || payload.error) {
      return;
    }

    setCompanyConfig({
      name: payload.name || "Minha Empresa",
      cnpj: payload.cnpj || payload.document || "",
      document: payload.cnpj || payload.document || "",
      address: payload.address || "",
      phone: payload.phone || "",
      logoUrl: payload.logoUrl || "/wtm-float.png",
      debitRate: Number(payload.debitRate ?? 1.99),
      creditRate: Number(payload.creditRate ?? 3.99),
    });
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProducts(),
        loadCustomers(),
        loadDashboard(),
        loadConfig(),
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (mesaParam) {
      setTableNumber(normalizeTableNumber(mesaParam));
    }
  }, [mesaParam]);

  useEffect(() => {
    if (clienteIdParam) {
      setSelectedCustomerId(clienteIdParam);
    }
  }, [clienteIdParam]);

  const currentTable = useMemo(
    () =>
      dashboard?.tables.find(
        (table) => table.number === normalizeTableNumber(tableNumber),
      ) || null,
    [dashboard, tableNumber],
  );

  const currentOrder = currentTable?.currentOrder || null;
  const currentBalanceDue = Number(currentOrder?.balanceDue || 0);
  const paymentAmountValue = 0;
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null;
  const orderItems = currentOrder?.items || [];
  const openOrderItems = useMemo(
    () => orderItems.filter((item) => !isFoodOrderItemResolved(item)),
    [orderItems],
  );
  const paidOrderItems = useMemo(
    () => orderItems.filter((item) => isFoodOrderItemResolved(item)),
    [orderItems],
  );
  const paymentHistory = currentOrder?.payments || [];

  useEffect(() => {
    if (currentOrder?.customer?.id) {
      setSelectedCustomerId((previous) => previous || currentOrder.customer?.id || "");
      setReceiptDocument((previous) => previous || currentOrder.customer?.document || "");
    }
  }, [currentOrder]);

  useEffect(() => {
    if (!selectedCustomer) {
      return;
    }

    setReceiptDocument((previous) => previous || selectedCustomer.document || "");
  }, [selectedCustomer]);

  useEffect(() => {
    setSelectedPaymentItemIds((previous) => {
      const nextSelectedIds = previous.filter((itemId) =>
        openOrderItems.some((item) => item.id === itemId),
      );

      if (
        nextSelectedIds.length === previous.length &&
        nextSelectedIds.every((itemId, index) => itemId === previous[index])
      ) {
        return previous;
      }

      return nextSelectedIds;
    });
  }, [openOrderItems]);

  useEffect(() => {
    if (!currentOrder) {
      return;
    }

    const shouldSelectAll = checkoutMode === "total";
    const nextSelectedIds = shouldSelectAll ? openOrderItems.map((item) => item.id) : [];

    setSelectedPaymentItemIds(nextSelectedIds);

    if (checkoutMode === "total" || checkoutMode === "partial") {
      window.setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    }
  }, [checkoutMode, currentOrder?.id, openOrderItems]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return products.slice(0, 30);
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch),
    );
  }, [products, searchTerm]);

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cart],
  );
  const selectedPaymentItems = useMemo(
    () =>
      openOrderItems.filter((item) =>
        selectedPaymentItemIds.includes(item.id),
      ),
    [openOrderItems, selectedPaymentItemIds],
  );
  const selectedSubtotal = useMemo(
    () =>
      selectedPaymentItems.reduce(
        (total, item) =>
          total +
          Math.max(
            Number(item.quantity || 0) - getFoodOrderItemResolvedQuantity(item),
            0,
          ) *
            Number(item.unitPrice || 0),
        0,
      ),
    [selectedPaymentItems],
  );
  const projectedRemainingBalance = currentBalanceDue;

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      alert("Produto sem estoque.");
      return;
    }

    setCart((previous) => {
      const current = previous.find((item) => item.id === product.id);

      if (current) {
        if (current.quantity >= product.stockQuantity) {
          alert("Estoque insuficiente.");
          return previous;
        }

        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((previous) => previous.filter((item) => item.id !== productId));
  };

  const handleTogglePaymentItem = (itemId: string) => {
    setSelectedPaymentItemIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((currentItemId) => currentItemId !== itemId)
        : [...previous, itemId],
    );
  };

  const handleSelectAllPaymentItems = () => {
    setSelectedPaymentItemIds(openOrderItems.map((item) => item.id));
  };

  const handleClearPaymentSelection = () => {
    setSelectedPaymentItemIds([]);
  };

  const focusPaymentSection = () => {
    paymentSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openPaymentModal = () => {
    handleSelectAllPaymentItems();
    focusPaymentSection();
  };

  const handleRegisterConsumption = async () => {
    const normalized = normalizeTableNumber(tableNumber);

    if (!normalized) {
      alert("Informe o numero da mesa antes de lancar consumo.");
      return;
    }

    if (cart.length === 0) {
      alert("Adicione ao menos um item ao carrinho.");
      return;
    }

    setSavingOrder(true);

    try {
      const response = await fetch("/api/food/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: currentOrder?.id || null,
          customerId: selectedCustomerId || null,
          tableNumber: normalized,
          notes: orderNotes,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao registrar consumo.");
      }

      setCart([]);
      setSearchTerm("");
      setOrderNotes("");
      await Promise.all([loadProducts(), loadDashboard()]);
      notifyFoodDashboardRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao registrar consumo.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleProcessTablePayment = async ({
    settleAllOpenItems = false,
    paymentMethodOverride,
  }: {
    settleAllOpenItems?: boolean;
    paymentMethodOverride?: string;
  } = {}) => {
    if (!currentOrder) {
      alert("Nenhuma comanda carregada para esta mesa.");
      return;
    }

    const resolvedPaymentMethod = String(
      paymentMethodOverride || paymentMethod || "DINHEIRO",
    ).toUpperCase();

    if (
      resolvedPaymentMethod === FOOD_PENDING_PAYMENT_METHOD &&
      !selectedCustomerId
    ) {
      alert("Selecione um cliente antes de transferir saldo para pendente.");
      return;
    }

    const itemIdsToProcess = settleAllOpenItems
      ? openOrderItems.map((item) => item.id)
      : selectedPaymentItemIds;

    if (itemIdsToProcess.length === 0) {
      alert("Selecione ao menos um item da mesa para receber.");
      return;
    }

    setClosingOrder(true);
    setPaymentMethod(resolvedPaymentMethod);

    try {
      const response = await fetch(`/api/food/orders/${currentOrder.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          paymentMethod: resolvedPaymentMethod,
          receiptDocument,
          dueDate:
            resolvedPaymentMethod === FOOD_PENDING_PAYMENT_METHOD ? dueDate : null,
          notes: paymentNotes,
          selectedItemIds: itemIdsToProcess,
          settleAllOpenItems,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao processar pagamento da mesa.");
      }

      setPaymentNotes("");
      setSelectedPaymentItemIds([]);

      if (payload?.sale) {
        setLastSale(payload.sale);
        const printMessage =
          Number(payload?.order?.balanceDue || 0) > 0
            ? "Pagamento registrado. Deseja imprimir o recibo desta parcela?"
            : "Conta encerrada. Deseja imprimir o recibo?";

        if (window.confirm(printMessage)) {
          window.setTimeout(() => handlePrint(), 350);
        }
      } else {
        alert("Itens transferidos para pendente com sucesso.");
      }

      await Promise.all([loadDashboard(), loadProducts(), loadCustomers()]);
      notifyFoodDashboardRefresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao concluir pagamento da mesa.",
      );
    } finally {
      setClosingOrder(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0B1120] font-sans text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black text-white">
                <UtensilsCrossed className="text-[#FFD700]" />
                PDV de Mesas
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Abra a comanda, lance consumo e encerre a mesa com pagamento total
                ou parcial.
              </p>
            </div>
            <Link
              href="/vendas"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#112240] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao painel
            </Link>
          </header>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-[#112240] p-5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[#FFD700]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Mesa e Cliente</h2>
                  <p className="text-sm text-slate-400">
                    Mesa obrigatoria para manter o consumo rastreavel.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Numero da Mesa
                  </span>
                  <input
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    placeholder="Ex.: 12"
                    className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Cliente
                  </span>
                  <select
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                  >
                    <option value="">Mesa avulsa / consumidor final</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Observacoes da Comanda
                </span>
                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Ex.: sobremesa fica para o final"
                  className="min-h-[88px] w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                />
              </label>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-[#112240] p-5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[#FFD700]">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Comanda Atual</h2>
                  <p className="text-sm text-slate-400">
                    {currentOrder
                      ? `Total ${formatCurrency(currentOrder.total)} • Restante ${formatCurrency(
                          currentOrder.balanceDue,
                        )}`
                      : "Abra ou carregue uma mesa para acompanhar o consumo."}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Status da Mesa
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {currentTable
                        ? `Mesa ${currentTable.number} ${
                            currentTable.status === "OCUPADO"
                              ? "ocupada"
                              : "disponivel"
                          }`
                        : "Mesa ainda nao registrada"}
                    </p>
                    {currentOrder ? (
                      <p className="mt-2 text-sm text-slate-400">
                        Cliente vinculado:{" "}
                        <span className="font-semibold text-white">
                          {currentOrder.customer?.name || "Mesa avulsa"}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {currentTable ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                        currentTable.status === "OCUPADO"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-emerald-500/20 text-emerald-200"
                      }`}
                    >
                      {currentTable.status === "OCUPADO" ? "OCUPADA" : "DISPONIVEL"}
                    </span>
                  ) : null}
                </div>

                {currentOrder ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Total
                      </p>
                      <p className="mt-2 text-xl font-black text-white">
                        {formatCurrency(currentOrder.total)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Pago
                      </p>
                      <p className="mt-2 text-xl font-black text-emerald-300">
                        {formatCurrency(currentOrder.paidAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Restante
                      </p>
                      <p className="mt-2 text-xl font-black text-[#FFD700]">
                        {formatCurrency(currentOrder.balanceDue)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {currentOrder ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectAllPaymentItems();
                        focusPaymentSection();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-bold text-[#0B1120] transition-colors hover:bg-yellow-300"
                    >
                      <Wallet className="h-4 w-4" />
                      Encerrar Total
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleClearPaymentSelection();
                        focusPaymentSection();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pagamento Parcial
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar item do cardápio..."
                className="w-full rounded-2xl border border-slate-700 bg-[#112240] py-3 pl-10 pr-4 text-white outline-none transition-colors focus:border-[#FFD700]"
              />
            </div>
            <button
              type="button"
              onClick={handleRegisterConsumption}
              disabled={savingOrder || cart.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-bold text-[#0B1120] transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {savingOrder ? "Lançando..." : "Lançar Consumo"}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-800 bg-[#112240] p-5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                  Array.from({ length: 9 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-32 animate-pulse rounded-3xl border border-slate-700 bg-[#0B1120]"
                    />
                  ))
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={product.stockQuantity <= 0}
                      className={`rounded-3xl border p-4 text-left transition-colors ${
                        product.stockQuantity > 0
                          ? "border-slate-700 bg-[#0B1120] hover:border-[#FFD700]"
                          : "border-red-500/20 bg-red-500/10 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {product.category}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#112240] px-2.5 py-1 text-xs font-bold text-[#FFD700]">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-slate-400">
                        Estoque:{" "}
                        <span
                          className={
                            product.stockQuantity <= 5
                              ? "font-semibold text-red-300"
                              : "font-semibold text-emerald-300"
                          }
                        >
                          {product.stockQuantity}
                        </span>
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <div className="flex flex-col gap-6">
              <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#112240] shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
                <div className="border-b border-slate-800 bg-[#0F172A] p-5">
                  <h2 className="text-lg font-bold text-white">Carrinho de Lançamento</h2>
                </div>
                <div className="space-y-3 p-5">
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                      Sem itens para lançar na mesa.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-[#0B1120] p-4"
                      >
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.quantity} x {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-[#FFD700]">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-800 bg-[#0F172A] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total a lançar</span>
                    <span className="text-2xl font-black text-white">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                </div>
              </section>

              <section
                ref={paymentSectionRef}
                className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-linear-to-br from-emerald-500/12 via-[#112240] to-[#0B1120] shadow-[0_24px_50px_rgba(15,23,42,0.18)]"
              >
                <div className="border-b border-emerald-400/15 bg-[#0B1728] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Checkout por Item
                      </h2>
                      <p className="text-sm text-slate-300">
                        Marque os itens da comanda, confira o subtotal e receba apenas
                        o que o cliente escolheu pagar agora.
                      </p>
                    </div>
                    {currentOrder ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllPaymentItems}
                          className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/20"
                        >
                          Selecionar Tudo
                        </button>
                        <button
                          type="button"
                          onClick={handleClearPaymentSelection}
                          className="rounded-2xl border border-slate-600 bg-slate-950/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-slate-400"
                        >
                          Desmarcar Tudo
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {!currentOrder ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                      Carregue uma mesa para acompanhar consumo e pagamentos.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Total da Mesa
                          </p>
                          <p className="mt-2 text-xl font-black text-white">
                            {formatCurrency(currentOrder.total)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Subtotal Selecionado
                          </p>
                          <p className="mt-2 text-xl font-black text-[#FFD700]">
                            {formatCurrency(selectedSubtotal)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Saldo em Aberto
                          </p>
                          <p className="mt-2 text-xl font-black text-emerald-300">
                            {formatCurrency(currentBalanceDue)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Checklist de Pagamento
                          </p>
                          <span className="text-xs text-slate-500">
                            {openOrderItems.length} item(ns) em aberto
                          </span>
                        </div>
                        {openOrderItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-emerald-400/15 bg-emerald-500/5 p-4 text-center text-sm text-slate-300">
                            Nenhum item em aberto nesta mesa.
                          </div>
                        ) : (
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {openOrderItems.map((item) => {
                              const isSelected = selectedPaymentItemIds.includes(item.id);
                              const remainingQuantity = Math.max(
                                Number(item.quantity || 0) -
                                  getFoodOrderItemResolvedQuantity(item),
                                0,
                              );

                              return (
                                <label
                                  key={item.id}
                                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                                    isSelected
                                      ? "border-emerald-300/30 bg-emerald-500/12"
                                      : "border-white/10 bg-white/5 hover:border-emerald-400/20"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
                                        isSelected
                                          ? "border-emerald-300 bg-emerald-400 text-[#0B1120]"
                                          : "border-slate-500 bg-transparent text-transparent"
                                      }`}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleTogglePaymentItem(item.id)}
                                        className="sr-only"
                                      />
                                      <p className="font-medium text-white">
                                        {remainingQuantity}x {item.description}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-400">
                                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-[#FFD700]">
                                    {formatCurrency(remainingQuantity * item.unitPrice)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            CPF/CNPJ no Recibo
                          </span>
                          <input
                            value={receiptDocument}
                            onChange={(event) => setReceiptDocument(event.target.value)}
                            placeholder="Opcional"
                            className="w-full rounded-2xl border border-emerald-400/15 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                          />
                        </label>
                        {paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? (
                          <label className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Vencimento
                            </span>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(event) => setDueDate(event.target.value)}
                              className="w-full rounded-2xl border border-emerald-400/15 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                            />
                          </label>
                        ) : (
                          <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] px-4 py-3 text-sm text-slate-400">
                            O recibo parcial saira apenas com os itens selecionados.
                          </div>
                        )}
                      </div>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Observacoes do Recebimento
                        </span>
                        <textarea
                          value={paymentNotes}
                          onChange={(event) => setPaymentNotes(event.target.value)}
                          placeholder="Ex.: cliente pagou apenas bebidas"
                          className="min-h-[88px] w-full rounded-2xl border border-emerald-400/15 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethodOptions.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => {
                              if (selectedSubtotal > 0) {
                                void handleProcessTablePayment({
                                  paymentMethodOverride: method.id,
                                });
                                return;
                              }

                              setPaymentMethod(method.id);
                            }}
                            className={`rounded-2xl border p-3 text-sm font-bold transition-colors ${
                              paymentMethod === method.id
                                ? method.activeClass
                                : "border-emerald-400/15 bg-[#0B1120] text-slate-300"
                            }`}
                          >
                            <method.icon className="mx-auto mb-1 h-4 w-4" />
                            {method.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleProcessTablePayment()}
                        disabled={closingOrder || selectedSubtotal <= 0}
                        className="w-full rounded-2xl bg-emerald-500 px-4 py-4 font-bold text-[#08111F] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {closingOrder
                          ? "Processando..."
                          : `Receber Itens Selecionados (${formatCurrency(selectedSubtotal)})`}
                      </button>

                      <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Itens Ja Pagos Nesta Mesa
                          </p>
                          <span className="text-xs text-slate-500">
                            {paidOrderItems.length} item(ns)
                          </span>
                        </div>

                        {paidOrderItems.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-emerald-400/15 bg-emerald-500/5 p-4 text-center text-sm text-slate-300">
                            Ainda nao ha itens quitados nesta mesa.
                          </div>
                        ) : (
                          <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                            {paidOrderItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/8 px-3 py-2"
                              >
                                <div>
                                  <p className="font-medium text-white">
                                    {item.quantity}x {item.description}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Item quitado
                                  </p>
                                </div>
                                <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                                  PAGO
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-emerald-400/15 bg-[#0B1120] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Pagamentos Ja Feitos
                          </p>
                          <span className="text-xs text-slate-500">
                            {paymentHistory.length} registro(s)
                          </span>
                        </div>

                        {paymentHistory.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#112240] p-4 text-center text-sm text-slate-400">
                            Nenhum pagamento registrado ainda.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {paymentHistory.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <div>
                                  <p className="font-medium text-white">
                                    {resolvePaymentMethodLabel(payment.paymentMethod)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {new Date(payment.createdAt).toLocaleString("pt-BR")}
                                  </p>
                                  {payment.dueDate ? (
                                    <p className="mt-1 text-[11px] text-amber-200">
                                      Vencimento{" "}
                                      {new Date(payment.dueDate).toLocaleDateString(
                                        "pt-BR",
                                      )}
                                    </p>
                                  ) : null}
                                </div>
                                <span className="font-semibold text-[#FFD700]">
                                  {formatCurrency(payment.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {paymentModalOpen && currentOrder ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-amber-400/20 bg-[#08111F] shadow-[0_30px_90px_rgba(2,6,23,0.65)]">
            <div className="border-b border-white/10 bg-linear-to-r from-[#112240] via-[#0B1120] to-[#08111F] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                    Encerramento de Mesa
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-white">
                    Mesa {currentTable?.number || tableNumber || "--"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Total {formatCurrency(currentOrder.total)} • Pago{" "}
                    {formatCurrency(currentOrder.paidAmount)} • Restante{" "}
                    {formatCurrency(currentOrder.balanceDue)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5 border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl border border-amber-300/15 bg-amber-400/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/80">
                      Total da Conta
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {formatCurrency(currentOrder.total)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/80">
                      Ja Pago
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {formatCurrency(currentOrder.paidAmount)}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">
                      Restante
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {formatCurrency(currentOrder.balanceDue)}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0B1120] p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Valor a Receber
                      </span>
                      <CurrencyInput
                        value={paymentAmount}
                        onChange={setPaymentAmount}
                        className="w-full rounded-2xl border border-slate-700 bg-[#08111F] px-4 py-3 text-lg font-bold text-white outline-none transition-colors focus:border-[#FFD700]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        CPF/CNPJ no Recibo
                      </span>
                      <input
                        value={receiptDocument}
                        onChange={(event) => setReceiptDocument(event.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-2xl border border-slate-700 bg-[#08111F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
                    {paymentMethodOptions.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`rounded-2xl border p-3 text-sm font-bold transition-colors ${
                          paymentMethod === method.id
                            ? method.activeClass
                            : "border-slate-700 bg-[#08111F] text-slate-300"
                        }`}
                      >
                        <method.icon className="mx-auto mb-1 h-4 w-4" />
                        {method.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? (
                    <label className="mt-4 block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Vencimento do Pendente
                      </span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-[#08111F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                      />
                    </label>
                  ) : null}

                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Observacoes do Pagamento
                    </span>
                    <textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      placeholder="Ex.: cliente dividiu com outro cartao"
                      className="min-h-[96px] w-full rounded-2xl border border-slate-700 bg-[#08111F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                    />
                  </label>

                  <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Forma selecionada</span>
                      <span className="font-semibold text-white">
                        {resolvePaymentMethodLabel(paymentMethod)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-slate-400">
                      <span>Valor informado</span>
                      <span className="text-lg font-black text-white">
                        {paymentAmountValue > 0
                          ? formatCurrency(paymentAmountValue)
                          : "R$ 0,00"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-slate-400">
                      <span>Saldo projetado</span>
                      <span className="font-bold text-[#FFD700]">
                        {formatCurrency(projectedRemainingBalance)}
                      </span>
                    </div>
                    {paymentAmountValue - currentBalanceDue > 0.009 ? (
                      <p className="mt-3 text-xs font-semibold text-red-300">
                        O valor digitado ultrapassa o saldo atual da mesa.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col bg-[#09111E]">
                <div className="border-b border-white/10 px-6 py-5">
                  <h3 className="text-lg font-bold text-white">
                    Historico de Pagamentos
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Cada lancamento fica registrado com metodo, valor e horario.
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                  {paymentHistory.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                      Nenhum pagamento registrado ate agora.
                    </div>
                  ) : (
                    paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">
                              {resolvePaymentMethodLabel(payment.paymentMethod)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(payment.createdAt).toLocaleString("pt-BR")}
                            </p>
                            {payment.dueDate ? (
                              <p className="mt-2 text-xs text-amber-200">
                                Vencimento{" "}
                                {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-lg font-black text-[#FFD700]">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-white/10 px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(false)}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleProcessTablePayment();
                      }}
                      disabled={
                        closingOrder ||
                        paymentAmountValue <= 0 ||
                        paymentAmountValue - currentBalanceDue > 0.009
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-4 py-3 font-bold text-[#0B1120] transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Wallet className="h-4 w-4" />
                      {closingOrder
                        ? "Processando..."
                        : paymentMethod === FOOD_PENDING_PAYMENT_METHOD
                          ? "Transferir Saldo"
                          : "Adicionar Pagamento"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden">
        <SaleReceiptThermal
          ref={printRef}
          sale={lastSale}
          config={companyConfig}
          termsUrl="/termos"
        />
      </div>
    </div>
  );
}
