"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  NotebookPen,
  Plus,
  QrCode,
  Search,
  Trash2,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { SaleReceiptThermal } from "@/components/SaleReceiptThermal";
import {
  FOOD_PENDING_PAYMENT_METHOD,
  formatCurrency,
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

export function FoodPDV() {
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get("mesa");
  const clienteIdParam = searchParams.get("clienteId");
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
  const [notes, setNotes] = useState("");
  const [checkoutSelections, setCheckoutSelections] = useState<Record<string, number>>(
    {},
  );
  const [savingOrder, setSavingOrder] = useState(false);
  const [closingOrder, setClosingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSale, setLastSale] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || null;

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

  const openItems = useMemo(
    () =>
      (currentOrder?.items || [])
        .map((item) => ({
          ...item,
          remainingQuantity:
            Number(item.quantity || 0) - Number(item.settledQuantity || 0),
        }))
        .filter((item) => item.remainingQuantity > 0),
    [currentOrder],
  );

  const selectedCheckoutItems = useMemo(
    () =>
      openItems.filter((item) => Number(checkoutSelections[item.id] || 0) > 0),
    [checkoutSelections, openItems],
  );

  const selectedCheckoutTotal = useMemo(
    () =>
      selectedCheckoutItems.reduce(
        (total, item) =>
          total + Number(checkoutSelections[item.id] || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [checkoutSelections, selectedCheckoutItems],
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cart],
  );

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

  const handleSelectAllOpenItems = () => {
    const allSelections = openItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.remainingQuantity;
      return acc;
    }, {});

    setCheckoutSelections(allSelections);
  };

  const handleRegisterConsumption = async () => {
    const normalized = normalizeTableNumber(tableNumber);

    if (!normalized) {
      alert("Informe o número da mesa antes de lançar consumo.");
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
          notes,
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
      setNotes("");
      setCheckoutSelections({});
      await Promise.all([loadProducts(), loadDashboard()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao registrar consumo.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentOrder) {
      alert("Nenhuma comanda carregada para esta mesa.");
      return;
    }

    if (selectedCheckoutItems.length === 0) {
      alert("Selecione ao menos um item da mesa para fechar.");
      return;
    }

    if (paymentMethod === FOOD_PENDING_PAYMENT_METHOD && !selectedCustomerId) {
      alert("Selecione um cliente antes de deixar pendente.");
      return;
    }

    setClosingOrder(true);

    try {
      const response = await fetch(`/api/food/orders/${currentOrder.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          paymentMethod,
          receiptDocument,
          dueDate: paymentMethod === FOOD_PENDING_PAYMENT_METHOD ? dueDate : null,
          notes,
          selections: selectedCheckoutItems.map((item) => ({
            itemId: item.id,
            quantity: Number(checkoutSelections[item.id] || 0),
          })),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao fechar itens da mesa.");
      }

      setCheckoutSelections({});
      setNotes("");

      if (payload?.sale) {
        setLastSale(payload.sale);
        if (window.confirm("Parcela registrada. Deseja imprimir o recibo?")) {
          window.setTimeout(() => handlePrint(), 350);
        }
      } else {
        alert("Parcela transferida para pendente com sucesso.");
      }

      await Promise.all([loadDashboard(), loadProducts(), loadCustomers()]);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao concluir fechamento parcial.",
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
                Abra a comanda, lance consumo e feche somente a parte escolhida.
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
                    Mesa obrigatória para manter a comanda rastreável.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Número da Mesa
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
                  Observações
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: mesa pediu para separar a sobremesa no final"
                  className="min-h-[88px] w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                />
              </label>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-[#112240] p-5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[#FFD700]">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Comanda Atual</h2>
                  <p className="text-sm text-slate-400">
                    {currentOrder
                      ? `Total ${formatCurrency(currentOrder.total)} • Saldo ${formatCurrency(
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
                              : "disponível"
                          }`
                        : "Mesa ainda não registrada"}
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
                      {currentTable.status}
                    </span>
                  ) : null}
                </div>
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

              <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#112240] shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
                <div className="border-b border-slate-800 bg-[#0F172A] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Fechamento Parcial
                      </h2>
                      <p className="text-sm text-slate-400">
                        Selecione itens específicos da comanda para gerar a parcela.
                      </p>
                    </div>
                    {openItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleSelectAllOpenItems}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700] hover:text-yellow-300"
                      >
                        Selecionar tudo
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {openItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                      Nenhum item aberto nesta comanda.
                    </div>
                  ) : (
                    openItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {item.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Em aberto: {item.remainingQuantity} x{" "}
                              {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={item.remainingQuantity}
                            value={checkoutSelections[item.id] || 0}
                            onChange={(event) =>
                              setCheckoutSelections((previous) => ({
                                ...previous,
                                [item.id]: Math.min(
                                  item.remainingQuantity,
                                  Math.max(0, Number(event.target.value || 0)),
                                ),
                              }))
                            }
                            className="w-20 rounded-xl border border-slate-700 bg-[#112240] px-3 py-2 text-center text-white outline-none transition-colors focus:border-[#FFD700]"
                          />
                        </div>
                      </div>
                    ))
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        CPF/CNPJ no recibo
                      </span>
                      <input
                        value={receiptDocument}
                        onChange={(event) => setReceiptDocument(event.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
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
                          className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FFD700]"
                        />
                      </label>
                    ) : (
                      <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-slate-400">
                        Recibo parcial simples com campo de CPF/CNPJ incluso.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
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
                        label: "Débito",
                        icon: CreditCard,
                        activeClass: "border-blue-400 bg-blue-500 text-white",
                      },
                      {
                        id: "CREDITO",
                        label: "Crédito",
                        icon: CreditCard,
                        activeClass: "border-fuchsia-400 bg-fuchsia-500 text-white",
                      },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`rounded-2xl border p-3 text-sm font-bold transition-colors ${
                          paymentMethod === method.id
                            ? method.activeClass
                            : "border-slate-700 bg-[#0B1120] text-slate-300"
                        }`}
                      >
                        <method.icon className="mx-auto mb-1 h-4 w-4" />
                        {method.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod(FOOD_PENDING_PAYMENT_METHOD)}
                    className={`w-full rounded-2xl border p-3 text-sm font-bold transition-colors ${
                      paymentMethod === FOOD_PENDING_PAYMENT_METHOD
                        ? "border-amber-300 bg-amber-400 text-[#0B1120]"
                        : "border-slate-700 bg-[#0B1120] text-amber-200"
                    }`}
                  >
                    <NotebookPen className="mx-auto mb-1 h-4 w-4" />
                    Pendente (Conta do Cliente)
                  </button>

                  <div className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4 text-sm">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Forma atual</span>
                      <span className="font-semibold text-white">
                        {resolvePaymentMethodLabel(paymentMethod)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-slate-400">
                      <span>Valor selecionado</span>
                      <span className="text-lg font-black text-white">
                        {formatCurrency(selectedCheckoutTotal)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-slate-400">
                      <span>Saldo restante na mesa</span>
                      <span className="font-bold text-[#FFD700]">
                        {formatCurrency(
                          Math.max(
                            Number(currentOrder?.balanceDue || 0) - selectedCheckoutTotal,
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={closingOrder || selectedCheckoutTotal <= 0}
                    className="w-full rounded-2xl bg-green-600 px-4 py-4 font-bold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {closingOrder ? "Processando..." : "Fechar Itens Selecionados"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

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
