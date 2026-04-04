"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  AlertTriangle,
  Plus,
  Truck,
  Download,
  Pencil,
  Trash2,
  ScanBarcode,
  MessageCircle,
  CarFront,
} from "lucide-react";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { useBarcodeListener } from "@/hooks/useBarcodeListener";
import { useSegment } from "@/hooks/useSegment";
import { barcodeMatches, normalizeBarcode } from "@/lib/barcode";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { formatWhatsAppLink } from "@/lib/whatsapp";
import { isProductLowStock, resolveProductMinStock } from "@/lib/stock-alerts";
import {
  formatVehiclePlate,
  getDefaultProductCategory,
  getProductCategoryLabel,
  getVehicleInventoryStatusLabel,
  getSegmentProductCategories,
  getVehicleFuelLabel,
  normalizeVehicleInventoryStatus,
  getVehicleSteeringLabel,
  isVehicleCategory,
  normalizeVehiclePlate,
  VEHICLE_FUEL_OPTIONS,
  VEHICLE_STATUS_OPTIONS,
  VEHICLE_STEERING_OPTIONS,
} from "@/lib/segment-specialization";

interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock?: number;
  minQuantity: number;
  category: string;
  supplierId?: string;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  vehicleChassis?: string | null;
  vehicleRenavam?: string | null;
  vehicleStatus?: string | null;
  vehicleManufactureYear?: number | null;
  vehicleModelYear?: number | null;
  vehicleEngine?: string | null;
  vehicleFuel?: string | null;
  vehicleAirConditioning?: boolean | null;
  vehicleAirbag?: boolean | null;
  vehicleSteering?: string | null;
  vehiclePowerWindows?: boolean | null;
  vehicleAlarm?: boolean | null;
  vehicleMultimedia?: boolean | null;
  vehicleAdditionalInfo?: string | null;
  supplier?: {
    id: string;
    name: string;
    whatsapp?: string | null;
    contact?: string | null;
  } | null;
}

interface Supplier {
  id: string;
  name: string;
  contact?: string | null;
  whatsapp?: string | null;
}

type RestockRequestState = {
  productId: string;
  productName: string;
  supplierId: string;
  quantity: string;
} | null;

type ProductFormState = {
  name: string;
  barcode: string;
  price: string;
  costPrice: string;
  stockQuantity: string;
  minQuantity: string;
  category: string;
  supplierId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleRenavam: string;
  vehicleStatus: string;
  vehicleManufactureYear: string;
  vehicleModelYear: string;
  vehicleEngine: string;
  vehicleFuel: string;
  vehicleAirConditioning: boolean;
  vehicleAirbag: boolean;
  vehicleSteering: string;
  vehiclePowerWindows: boolean;
  vehicleAlarm: boolean;
  vehicleMultimedia: boolean;
  vehicleAdditionalInfo: string;
};

const createEmptyProductForm = (
  defaultCategory: string,
  barcode = "",
): ProductFormState => ({
  name: "",
  barcode,
  price: "",
  costPrice: "",
  stockQuantity: "",
  minQuantity: "2",
  category: defaultCategory,
  supplierId: "",
  vehicleBrand: "",
  vehicleModel: "",
  vehiclePlate: "",
  vehicleChassis: "",
  vehicleRenavam: "",
  vehicleStatus: "DISPONIVEL",
  vehicleManufactureYear: "",
  vehicleModelYear: "",
  vehicleEngine: "",
  vehicleFuel: "",
  vehicleAirConditioning: false,
  vehicleAirbag: false,
  vehicleSteering: "",
  vehiclePowerWindows: false,
  vehicleAlarm: false,
  vehicleMultimedia: false,
  vehicleAdditionalInfo: "",
});

export default function Estoque() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [activeTab, setActiveTab] = useState<"ALL" | "BUY">("ALL");
  const [loading, setLoading] = useState(true);
  const { role: userRole, segment } = useSegment();
  const categoryOptions = getSegmentProductCategories(segment);
  const defaultCategory = getDefaultProductCategory(segment);
  const [scannerOpen, setScannerOpen] = useState(false);
  const productsRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [formData, setFormData] = useState<ProductFormState>(() =>
    createEmptyProductForm(defaultCategory),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierData, setSupplierData] = useState({
    name: "",
    contact: "",
    whatsapp: "",
    catalogUrl: "",
  });

  // Batch state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchData, setBatchData] = useState({
    productId: "",
    productName: "",
    currentStock: 0,
    currentCost: 0,
    addedQuantity: "",
    newCostPrice: "",
    newSalePrice: "",
  });
  const handledQueryBarcodeRef = useRef("");
  const [restockRequest, setRestockRequest] =
    useState<RestockRequestState>(null);
  const isVehicleForm = isVehicleCategory(formData.category);
  const availableCategoryFilters = Array.from(
    new Map(
      [
        ...categoryOptions,
        ...products.map((product) => ({
          value: product.category,
          label: getProductCategoryLabel(product.category),
        })),
      ].map((option) => [option.value, option]),
    ).values(),
  );

  const resetForm = useCallback(
    (barcode = "") => createEmptyProductForm(defaultCategory, barcode),
    [defaultCategory],
  );

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (!restockRequest || restockRequest.supplierId || suppliers.length === 0) {
      return;
    }

    setRestockRequest((current) =>
      current
        ? {
            ...current,
            supplierId: suppliers[0].id,
          }
        : current,
    );
  }, [restockRequest, suppliers]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const scheduleRefresh = () => {
      if (productsRefreshTimeoutRef.current) {
        clearTimeout(productsRefreshTimeoutRef.current);
      }

      productsRefreshTimeoutRef.current = setTimeout(() => {
        void fetchProducts();
      }, 250);
    };

    const channel = supabase
      .channel("products_stock_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (productsRefreshTimeoutRef.current) {
        clearTimeout(productsRefreshTimeoutRef.current);
        productsRefreshTimeoutRef.current = null;
      }

      void channel.unsubscribe();
    };
  }, []);

  const handleOpenNewProductForm = useCallback((barcode = "") => {
    setEditingId(null);
    setFormData(resetForm(barcode));
    setShowForm(true);
  }, [resetForm]);

  const handleBarcodePrefill = useCallback(
    (barcode: string) => {
      const normalized = normalizeBarcode(barcode);

      if (!normalized) {
        return;
      }

      if (showForm) {
        setFormData((current) => ({
          ...current,
          barcode: normalized,
        }));
        return;
      }

      handleOpenNewProductForm(normalized);
    },
    [handleOpenNewProductForm, showForm],
  );

  useBarcodeListener({
    enabled: Boolean(userRole) && !scannerOpen,
    onScan: handleBarcodePrefill,
  });

  useEffect(() => {
    if (!userRole) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const barcodeFromQuery = normalizeBarcode(params.get("barcode"));
    const shouldOpen = params.get("novo") === "1";
    const signature = `${shouldOpen ? "1" : "0"}:${barcodeFromQuery}`;

    if (!barcodeFromQuery || handledQueryBarcodeRef.current === signature) {
      return;
    }

    handledQueryBarcodeRef.current = signature;
    handleBarcodePrefill(barcodeFromQuery);

    if (shouldOpen) {
      setShowForm(true);
    }

    router.replace("/estoque");
  }, [handleBarcodePrefill, router, userRole]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      setSuppliers([]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
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
      barcode: product.barcode || "",
      price: product.salePrice.toString(),
      costPrice: product.costPrice.toString(),
      stockQuantity: product.stock.toString(),
      minQuantity: product.minQuantity.toString(),
      category: product.category,
      supplierId: product.supplierId || "",
      vehicleBrand: product.vehicleBrand || "",
      vehicleModel: product.vehicleModel || "",
      vehiclePlate: product.vehiclePlate || "",
      vehicleChassis: product.vehicleChassis || "",
      vehicleRenavam: product.vehicleRenavam || "",
      vehicleStatus: product.vehicleStatus || "DISPONIVEL",
      vehicleManufactureYear: product.vehicleManufactureYear?.toString() || "",
      vehicleModelYear: product.vehicleModelYear?.toString() || "",
      vehicleEngine: product.vehicleEngine || "",
      vehicleFuel: product.vehicleFuel || "",
      vehicleAirConditioning: Boolean(product.vehicleAirConditioning),
      vehicleAirbag: Boolean(product.vehicleAirbag),
      vehicleSteering: product.vehicleSteering || "",
      vehiclePowerWindows: Boolean(product.vehiclePowerWindows),
      vehicleAlarm: Boolean(product.vehicleAlarm),
      vehicleMultimedia: Boolean(product.vehicleMultimedia),
      vehicleAdditionalInfo: product.vehicleAdditionalInfo || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Produto excluído com sucesso!");
        fetchProducts();
      } else {
        alert("Erro ao excluir produto.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir produto.");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...formData,
        barcode: normalizeBarcode(formData.barcode),
        vehiclePlate: normalizeVehiclePlate(formData.vehiclePlate),
        price: formData.price.replace(",", "."),
        costPrice: formData.costPrice.replace(",", "."),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(
          editingId ? "Produto atualizado!" : "Produto cadastrado com sucesso!",
        );
        setEditingId(null);
        setFormData(resetForm());
        setShowForm(false);
        fetchProducts();
      } else {
        const payload = await res.json().catch(() => null);
        alert(payload?.error || "Erro ao salvar produto.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setFormData((current) => {
      if (isVehicleCategory(category)) {
        return {
          ...current,
          category,
          vehicleStatus:
            normalizeVehicleInventoryStatus(current.vehicleStatus) ||
            "DISPONIVEL",
        };
      }

      return {
        ...current,
        category,
        vehicleBrand: "",
        vehicleModel: "",
        vehiclePlate: "",
        vehicleChassis: "",
        vehicleRenavam: "",
        vehicleStatus: "DISPONIVEL",
        vehicleManufactureYear: "",
        vehicleModelYear: "",
        vehicleEngine: "",
        vehicleFuel: "",
        vehicleAirConditioning: false,
        vehicleAirbag: false,
        vehicleSteering: "",
        vehiclePowerWindows: false,
        vehicleAlarm: false,
        vehicleMultimedia: false,
        vehicleAdditionalInfo: "",
      };
    });
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
      "Código de Barras",
      "Categoria",
      "Placa",
      "Status Veículo",
      "Preço Venda",
      "Preço Custo",
      "Estoque",
      "Fornecedor",
    ];

    const rows = (Array.isArray(products) ? products : []).map((p) => {
      const supplier =
        suppliers.find((s) => s.id === p.supplierId)?.name || "N/A";
      return [
        `"${p.name}"`,
        `"${p.barcode || ""}"`,
        getProductCategoryLabel(p.category),
        `"${formatVehiclePlate(p.vehiclePlate) || ""}"`,
        `"${isVehicleCategory(p.category) ? getVehicleInventoryStatusLabel(p.vehicleStatus) : ""}"`,
        p.salePrice,
        p.costPrice,
        p.stock,
        `"${supplier}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "estoque_wtm.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenBatchModal = (product: Product) => {
    setBatchData({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      currentCost: product.costPrice,
      addedQuantity: "",
      newCostPrice: "",
      newSalePrice: "",
    });
    setShowBatchModal(true);
  };

  const getDefaultRestockQuantity = (product: Product) => {
    const minimumStock = resolveProductMinStock(product);
    const quantityToOrder = Math.max(minimumStock - Number(product.stock || 0), 1);
    return String(quantityToOrder);
  };

  const handleOpenRestockModal = (product: Product) => {
    setRestockRequest({
      productId: product.id,
      productName: product.name,
      supplierId: product.supplierId || suppliers[0]?.id || "",
      quantity: getDefaultRestockQuantity(product),
    });
  };

  const buildRestockWhatsAppMessage = (
    supplierName: string,
    productName: string,
    quantity: number,
  ) =>
    [
      `Boa tarde, ${supplierName}! 👋 Aqui é da World Tech Manager, tudo bem? 🛠️📱`,
      ``,
      `Gostaríamos de consultar a disponibilidade e o valor do seguinte item para reposição em nossa loja:`,
      ``,
      `📦 Produto: ${productName}`,
      `🔢 Quantidade desejada: ${quantity} unidades`,
      ``,
      `Poderia nos informar se tem em estoque e qual o preço atual para essa quantidade? Ficamos no aguardo! ✨`,
    ].join("\n");

  const getRestockButtonClass = (product: Product, compact = false) => {
    const lowStock = isProductLowStock(product);

    return `inline-flex items-center justify-center rounded-xl bg-[#25D366] font-bold text-[#081c10] transition-all hover:bg-[#20bd5a] ${
      compact ? "h-10 w-10" : "min-h-11 gap-2 px-4 py-2 text-sm"
    } ${
      lowStock
        ? "shadow-[0_0_24px_rgba(37,211,102,0.55)] animate-[pulse_2.2s_ease-in-out_infinite]"
        : "shadow-[0_10px_24px_rgba(37,211,102,0.18)]"
    }`;
  };

  const isVehicleInventoryItem = (product: Product) =>
    isVehicleCategory(product.category);

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchData.productId) return;

    try {
      const res = await fetch(`/api/products/${batchData.productId}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addedQuantity: Number(batchData.addedQuantity),
          newCostPrice: parseFloat(batchData.newCostPrice.replace(",", ".")),
          newSalePrice: parseFloat(batchData.newSalePrice.replace(",", ".")),
        }),
      });

      if (res.ok) {
        alert("Remessa adicionada com sucesso!");
        setShowBatchModal(false);
        fetchProducts();
      } else {
        const errorData = await res.json();
        alert(
          `Erro ao adicionar remessa: ${errorData.error || "Erro desconhecido"}`,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar remessa.");
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(
    (p) => {
      const normalizedSearch = normalizeBarcode(searchTerm);
      const normalizedPlate = normalizeVehiclePlate(searchTerm);
      const lowercaseSearch = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(lowercaseSearch) ||
        String(p.barcode || "").toLowerCase().includes(lowercaseSearch) ||
        String(p.vehicleBrand || "").toLowerCase().includes(lowercaseSearch) ||
        String(p.vehicleModel || "").toLowerCase().includes(lowercaseSearch) ||
        String(p.vehicleChassis || "").toLowerCase().includes(lowercaseSearch) ||
        String(p.vehicleRenavam || "").toLowerCase().includes(lowercaseSearch) ||
        String(p.vehiclePlate || "").toLowerCase().includes(lowercaseSearch) ||
        barcodeMatches(p.barcode, normalizedSearch) ||
        (normalizedPlate
          ? normalizeVehiclePlate(p.vehiclePlate).includes(normalizedPlate)
          : false);
      const matchesCategory =
        categoryFilter === "TODOS" || p.category === categoryFilter;
      const matchesTab =
        activeTab === "ALL" ? true : isProductLowStock(p);
      return matchesSearch && matchesCategory && matchesTab;
    },
  );

  const lowStockProducts = (Array.isArray(products) ? products : []).filter((product) =>
    isProductLowStock(product),
  );

  const getSupplierForProduct = (product: Product): Supplier | Product["supplier"] =>
    product.supplier ||
    suppliers.find((supplier) => supplier.id === product.supplierId) ||
    null;

  const getSupplierPhone = (supplier: Supplier | Product["supplier"]) =>
    supplier?.whatsapp || supplier?.contact || "";

  const getProductDisplayName = (product: Product) => {
    if (!isVehicleCategory(product.category)) {
      return product.name;
    }

    const identity = [product.vehicleBrand, product.vehicleModel]
      .filter(Boolean)
      .join(" ");

    return identity || product.name;
  };

  const getProductSubtitle = (product: Product) => {
    if (!isVehicleCategory(product.category)) {
      return product.barcode || "";
    }

    return [
      formatVehiclePlate(product.vehiclePlate),
      product.vehicleEngine,
      product.vehicleManufactureYear && product.vehicleModelYear
        ? `${product.vehicleManufactureYear}/${product.vehicleModelYear}`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");
  };

  const getVehicleStatusBadgeClass = (status: string | null | undefined) => {
    const normalizedStatus =
      normalizeVehicleInventoryStatus(status) || "DISPONIVEL";

    if (normalizedStatus === "VENDIDO") {
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    }

    if (normalizedStatus === "MANUTENCAO") {
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    }

    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  };

  const renderInventoryStatus = (product: Product) => {
    if (isVehicleInventoryItem(product)) {
      return (
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getVehicleStatusBadgeClass(product.vehicleStatus)}`}
        >
          {getVehicleInventoryStatusLabel(product.vehicleStatus)}
        </span>
      );
    }

    if (isProductLowStock(product)) {
      return (
        <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
          <AlertTriangle className="w-4 h-4" />
          BAIXO ESTOQUE
        </div>
      );
    }

    return (
      <span className="text-xs font-semibold text-emerald-400">
        EM DIA
      </span>
    );
  };

  const selectedRestockSupplier = restockRequest
    ? suppliers.find((supplier) => supplier.id === restockRequest.supplierId) || null
    : null;

  const handleSendRestockMessage = (event: React.FormEvent) => {
    event.preventDefault();

    if (!restockRequest) {
      return;
    }

    if (!selectedRestockSupplier) {
      alert("Selecione um fornecedor para solicitar a reposição.");
      return;
    }

    const quantity = Number.parseInt(restockRequest.quantity, 10);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Informe uma quantidade válida para o pedido.");
      return;
    }

    const supplierPhone = getSupplierPhone(selectedRestockSupplier);
    const message = buildRestockWhatsAppMessage(
      selectedRestockSupplier.name,
      restockRequest.productName,
      quantity,
    );
    const whatsappUrl = formatWhatsAppLink(supplierPhone, message);

    if (!whatsappUrl) {
      alert("O fornecedor selecionado não possui um WhatsApp válido cadastrado.");
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setRestockRequest(null);
  };

  const hasInvalidBasePricing =
    !formData.name ||
    !formData.price ||
    isNaN(parseFloat(formData.price.replace(",", "."))) ||
    parseFloat(formData.price.replace(",", ".")) <= 0 ||
    !formData.costPrice ||
    isNaN(parseFloat(formData.costPrice.replace(",", "."))) ||
    parseFloat(formData.costPrice.replace(",", ".")) < 0;

  const hasInvalidVehicleProfile =
    isVehicleForm &&
    (
      !formData.vehicleBrand ||
      !formData.vehicleModel ||
      !formData.vehiclePlate ||
      !formData.vehicleChassis ||
      !formData.vehicleRenavam
    );

  return (
    <div className="min-h-full w-full bg-[#0B1120] text-slate-100">
      <main className="mx-auto w-full max-w-7xl">
        {userRole === "ATTENDANT" && (
          <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100">
            Cadastro liberado. Atendentes podem adicionar produtos, mas edição,
            exclusão e remessas continuam restritas ao administrador.
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
            <Package className="text-[#FFD700]" />
            Gestão de Estoque
          </h1>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-[#112240] text-white border border-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-[#1e293b] transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>
            {userRole !== "ATTENDANT" && (
              <>
                <button
                  onClick={() => setShowSupplierForm(true)}
                  className="bg-[#112240] text-white border border-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-[#1e293b] transition-colors flex items-center gap-2"
                >
                  <Truck className="w-5 h-5" />
                  Fornecedores
                </button>
              </>
            )}
            <button
              onClick={() => setScannerOpen(true)}
              className="bg-sky-500/10 text-sky-200 border border-sky-400/40 px-4 py-2 rounded-lg font-bold hover:bg-sky-500/20 transition-colors flex items-center gap-2"
            >
              <ScanBarcode className="w-5 h-5" />
              Ler Código
            </button>
            <button
              onClick={() => {
                handleOpenNewProductForm();
              }}
              className="bg-[#FFD700] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#E5C100] transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Produto
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "ALL"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                : "border-slate-700 bg-[#112240] text-slate-300 hover:border-slate-500"
            }`}
          >
            Todos os Produtos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BUY")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "BUY"
                ? "border-red-500/30 bg-red-500/10 text-red-100"
                : "border-slate-700 bg-[#112240] text-slate-300 hover:border-slate-500"
            }`}
          >
            Para Comprar ({lowStockProducts.length})
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#112240] p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={
                segment === "AUTO"
                  ? "Buscar por nome, placa, chassi ou renavam..."
                  : "Buscar produto..."
              }
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
            {availableCategoryFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {activeTab === "BUY" && (
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-[#112240]/70 px-6 py-8 text-sm text-slate-400 xl:col-span-2">
                Nenhum item abaixo do mínimo com os filtros atuais.
              </div>
            ) : (
              filteredProducts.map((product) => {
                const supplier = getSupplierForProduct(product);
                const effectiveMinStock = resolveProductMinStock(product);
                const isVehicleItem = isVehicleInventoryItem(product);

                return (
                  <div
                    key={`buy-${product.id}`}
                    className="rounded-2xl border border-red-500/25 bg-[#112240]/90 p-5 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {getProductDisplayName(product)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {getProductCategoryLabel(product.category)}
                          {getProductSubtitle(product)
                            ? ` • ${getProductSubtitle(product)}`
                            : product.barcode
                              ? ` • ${product.barcode}`
                              : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          {isVehicleItem ? (
                            <span
                              className={`rounded-full border px-3 py-1 ${getVehicleStatusBadgeClass(product.vehicleStatus)}`}
                            >
                              {getVehicleInventoryStatusLabel(product.vehicleStatus)}
                            </span>
                          ) : (
                            <>
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-100">
                                Estoque atual: {product.stock}
                              </span>
                              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                                Mínimo: {effectiveMinStock}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {!isVehicleItem ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRestockModal(product)}
                          className={getRestockButtonClass(product)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Solicitar Reposição
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 border-t border-slate-800 pt-4 text-sm text-slate-400">
                      <p>
                        Fornecedor:{" "}
                        <span className="text-white">
                          {supplier?.name || "Não vinculado"}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Product List */}
        {activeTab === "ALL" && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#112240]">
            <table className="min-w-[760px] w-full text-left">
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
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const lowStock = isProductLowStock(product);
                    const isVehicleItem = isVehicleInventoryItem(product);

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-[#1e293b] transition-colors"
                      >
                        <td className="p-4 font-medium text-white">
                          <div className="space-y-1">
                            <p>{getProductDisplayName(product)}</p>
                            {getProductSubtitle(product) ? (
                              <p className="text-xs text-slate-500">
                                {getProductSubtitle(product)}
                              </p>
                            ) : product.barcode ? (
                              <p className="text-xs text-slate-500">
                                {product.barcode}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">
                          <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                            {getProductCategoryLabel(product.category)}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          R$ {(product.costPrice || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-[#FFD700] font-bold">
                          R$ {(product.salePrice || 0).toFixed(2)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-bold ${
                              !isVehicleItem && lowStock ? "text-red-500" : "text-white"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4">{renderInventoryStatus(product)}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {!isVehicleItem ? (
                              <button
                                type="button"
                                onClick={() => handleOpenRestockModal(product)}
                                className={getRestockButtonClass(product, true)}
                                title={`Solicitar reposição de ${product.name}`}
                              >
                                <MessageCircle className="h-5 w-5" />
                              </button>
                            ) : null}

                            {userRole !== "ATTENDANT" ? (
                              <>
                                {!isVehicleItem ? (
                                  <button
                                    onClick={() => handleOpenBatchModal(product)}
                                    className="p-2 rounded hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 transition-colors"
                                    title="Nova Remessa"
                                  >
                                    <Plus className="w-5 h-5" />
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="p-2 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                Reposição liberada
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {restockRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#112240] p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#25D366]">
                    Reposição Inteligente
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Solicitar Reposição - {restockRequest.productName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockRequest(null)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={handleSendRestockMessage} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1 block text-slate-400">Fornecedor</label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white focus:border-[#25D366] focus:outline-none"
                    value={restockRequest.supplierId}
                    onChange={(e) =>
                      setRestockRequest((current) =>
                        current
                          ? {
                              ...current,
                              supplierId: e.target.value,
                            }
                          : current,
                      )
                    }
                  >
                    <option value="">Selecione um fornecedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <p className="mt-2 text-xs text-amber-300">
                      Nenhum fornecedor cadastrado. Cadastre um fornecedor para
                      enviar o pedido via WhatsApp.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-slate-400">Quantidade</label>
                  <input
                    required
                    min="1"
                    type="number"
                    className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white focus:border-[#25D366] focus:outline-none"
                    value={restockRequest.quantity}
                    onChange={(e) =>
                      setRestockRequest((current) =>
                        current
                          ? {
                              ...current,
                              quantity: e.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </div>

                <div className="rounded-2xl border border-slate-700 bg-[#0B1120] p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">
                    {selectedRestockSupplier?.name || "Fornecedor não selecionado"}
                  </p>
                  <p className="mt-1 text-slate-400">
                    WhatsApp:{" "}
                    {selectedRestockSupplier
                      ? getSupplierPhone(selectedRestockSupplier) || "Não cadastrado"
                      : "Selecione um fornecedor"}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockRequest(null)}
                    className="flex-1 rounded-xl bg-slate-700 py-3 font-bold text-white transition-colors hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !restockRequest.supplierId ||
                      !restockRequest.quantity ||
                      Number(restockRequest.quantity) <= 0
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold transition-colors ${
                      !restockRequest.supplierId ||
                      !restockRequest.quantity ||
                      Number(restockRequest.quantity) <= 0
                        ? "cursor-not-allowed bg-slate-700 text-slate-500"
                        : "bg-[#25D366] text-[#081c10] hover:bg-[#20bd5a]"
                    }`}
                  >
                    <MessageCircle className="h-5 w-5" />
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Create Product */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div
              className={`bg-[#112240] p-8 rounded-xl border border-slate-700 w-full ${
                isVehicleForm ? "max-w-5xl" : "max-w-md"
              }`}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId
                  ? isVehicleForm
                    ? "Editar Veículo"
                    : "Editar Produto"
                  : isVehicleForm
                    ? "Novo Veículo"
                    : "Novo Produto"}
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-5">
                <div className={isVehicleForm ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
                  <div className={isVehicleForm ? "lg:col-span-2" : ""}>
                    <label className="block text-slate-400 mb-1">
                      {isVehicleForm ? "Nome do anúncio / título" : "Nome"}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={
                        isVehicleForm
                          ? "Ex: Volkswagen Gol 1.6 Highline"
                          : ""
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            barcode: e.target.value,
                          })
                        }
                        placeholder="Bipe o leitor ou use a câmera"
                      />
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="inline-flex items-center justify-center rounded border border-sky-400/40 bg-sky-500/10 px-3 text-sky-200 transition-colors hover:bg-sky-500/20"
                        title="Escanear código de barras"
                      >
                        <ScanBarcode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Categoria
                    </label>
                    <select
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Preço Custo
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">
                        R$
                      </span>
                      <input
                        required
                        type="text"
                        className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 pl-10 text-white"
                        value={formData.costPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            costPrice: e.target.value,
                          })
                        }
                      />
                    </div>
                    {formData.costPrice &&
                      (isNaN(
                        parseFloat(formData.costPrice.replace(",", ".")),
                      ) ||
                        parseFloat(formData.costPrice.replace(",", ".")) <
                          0) && (
                        <p className="text-red-500 text-xs mt-1">
                          Valor inválido
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Preço Venda
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">
                        R$
                      </span>
                      <input
                        required
                        type="text"
                        className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 pl-10 text-white"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                      />
                    </div>
                    {(!formData.price ||
                      isNaN(parseFloat(formData.price.replace(",", "."))) ||
                      parseFloat(formData.price.replace(",", ".")) <= 0) && (
                      <p className="text-red-500 text-xs mt-1">
                        Obrigatório (&gt; 0)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      {isVehicleForm ? "Unidades" : "Estoque"}
                    </label>
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

                  <div className={isVehicleForm ? "lg:col-span-2" : ""}>
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
                </div>

                {isVehicleForm && (
                  <div className="rounded-2xl border border-amber-400/20 bg-[#0B1120] p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-full bg-amber-400/10 p-2 text-amber-300">
                        <CarFront className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                          Ficha Técnica Veicular
                        </p>
                        <p className="text-sm text-slate-400">
                          Cadastro completo para estoque e O.S. automotiva.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 mb-1">Marca</label>
                        <input
                          required={isVehicleForm}
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleBrand}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleBrand: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Modelo</label>
                        <input
                          required={isVehicleForm}
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleModel}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleModel: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Placa</label>
                        <input
                          required={isVehicleForm}
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white uppercase"
                          value={formData.vehiclePlate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehiclePlate: normalizeVehiclePlate(e.target.value),
                            })
                          }
                          placeholder="ABC1D23"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Chassi</label>
                        <input
                          required={isVehicleForm}
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white uppercase"
                          value={formData.vehicleChassis}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleChassis: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Renavam</label>
                        <input
                          required={isVehicleForm}
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleRenavam}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleRenavam: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Status da Unidade
                        </label>
                        <select
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleStatus}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleStatus: e.target.value,
                            })
                          }
                        >
                          {VEHICLE_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Motorização
                        </label>
                        <input
                          type="text"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleEngine}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleEngine: e.target.value,
                            })
                          }
                          placeholder="1.0, 1.6, 2.0 Turbo..."
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Ano Fabricação
                        </label>
                        <input
                          type="number"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleManufactureYear}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleManufactureYear: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Ano Modelo
                        </label>
                        <input
                          type="number"
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleModelYear}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleModelYear: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Combustível
                        </label>
                        <select
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleFuel}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleFuel: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione</option>
                          {VEHICLE_FUEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Direção
                        </label>
                        <select
                          className="w-full bg-[#112240] border border-slate-700 rounded p-2 text-white"
                          value={formData.vehicleSteering}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleSteering: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione</option>
                          {VEHICLE_STEERING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="mb-3 text-sm font-semibold text-white">
                        Acessórios e itens embarcados
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          {
                            key: "vehicleAirConditioning",
                            label: "Ar Condicionado",
                          },
                          { key: "vehicleAirbag", label: "Airbag" },
                          {
                            key: "vehiclePowerWindows",
                            label: "Vidro Elétrico",
                          },
                          { key: "vehicleAlarm", label: "Alarme" },
                          {
                            key: "vehicleMultimedia",
                            label: "Som / Multimídia",
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#112240] px-4 py-3 text-sm text-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(
                                formData[item.key as keyof ProductFormState],
                              )}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [item.key]: e.target.checked,
                                })
                              }
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="block text-slate-400 mb-1">
                        Informações adicionais / histórico
                      </label>
                      <textarea
                        className="w-full min-h-28 bg-[#112240] border border-slate-700 rounded p-3 text-white resize-none"
                        value={formData.vehicleAdditionalInfo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleAdditionalInfo: e.target.value,
                          })
                        }
                        placeholder="Observações sobre procedência, histórico de manutenção, acessórios, laudos e detalhes comerciais."
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-300">
                      <div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3">
                        Combustível:{" "}
                        <span className="font-semibold text-white">
                          {getVehicleFuelLabel(formData.vehicleFuel)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3">
                        Direção:{" "}
                        <span className="font-semibold text-white">
                          {getVehicleSteeringLabel(formData.vehicleSteering)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3 col-span-2 md:col-span-1">
                        Placa formatada:{" "}
                        <span className="font-semibold text-white">
                          {formatVehiclePlate(formData.vehiclePlate) || "—"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3 col-span-2 md:col-span-1">
                        Status:{" "}
                        <span className="font-semibold text-white">
                          {getVehicleInventoryStatusLabel(formData.vehicleStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData(resetForm());
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={hasInvalidBasePricing || hasInvalidVehicleProfile}
                    className={`flex-1 py-2 rounded font-bold transition-colors ${
                      hasInvalidBasePricing || hasInvalidVehicleProfile
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
        {/* Modal Nova Remessa */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#112240] p-8 rounded-xl border border-slate-700 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                Nova Remessa - {batchData.productName}
              </h2>
              <form onSubmit={handleSaveBatch} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Quantidade Adicional
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 text-white"
                    value={batchData.addedQuantity}
                    onChange={(e) =>
                      setBatchData({
                        ...batchData,
                        addedQuantity: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Custo da Nova Remessa (Unitário)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">
                      R$
                    </span>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 pl-10 text-white"
                      value={batchData.newCostPrice}
                      onChange={(e) =>
                        setBatchData({
                          ...batchData,
                          newCostPrice: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Novo Preço de Venda
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">
                      R$
                    </span>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded p-2 pl-10 text-white"
                      value={batchData.newSalePrice}
                      onChange={(e) =>
                        setBatchData({
                          ...batchData,
                          newSalePrice: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-slate-800 p-4 rounded text-sm text-slate-300">
                  <p>Estoque atual: {batchData.currentStock}</p>
                  <p>
                    Custo atual: R$ {Number(batchData.currentCost).toFixed(2)}
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded font-bold"
                  >
                    Confirmar Remessa
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

      <BarcodeScannerModal
        open={scannerOpen}
        title="Ler código de barras"
        description="Aponte a câmera para o código do produto. O campo será preenchido automaticamente."
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodePrefill}
      />
    </div>
  );
}
