"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  FileCode2,
  Hash,
  Inbox,
  LoaderCircle,
  QrCode,
  ScanLine,
  Wallet,
} from "lucide-react";
import { DanfeScannerModal } from "@/components/DanfeScannerModal";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useSegment } from "@/hooks/useSegment";
import { formatCurrencyBRL } from "@/lib/currency";
import { extractNfeAccessKey } from "@/lib/nfe-access-key";
import { getProductCategoryLabel } from "@/lib/segment-specialization";
import type {
  StockEntryImportMethod,
  StockEntryPreview,
  StockEntryPreviewItem,
  StockEntryProcessAction,
  StockEntryProcessItemInput,
} from "@/lib/stock-entry-types";

type RecentStockEntry = {
  id: string;
  invoiceNumber: string | null;
  series: string | null;
  supplierName: string | null;
  entryDate: string;
  totalAmount: number;
  itemsCount: number;
  payablesCount: number;
  pendingAmount: number;
};

type EditablePreviewItem = StockEntryPreviewItem & StockEntryProcessItemInput;

const IMPORT_METHODS: Array<{
  value: StockEntryImportMethod;
  title: string;
  description: string;
}> = [
  {
    value: "XML_UPLOAD",
    title: "Importar XML",
    description: "Upload direto do arquivo .xml da NF-e.",
  },
  {
    value: "ACCESS_KEY",
    title: "Digitar Chave",
    description: "Consulta direta via Focus NFe com os 44 dígitos.",
  },
  {
    value: "DANFE_SCAN",
    title: "Escanear DANFE",
    description: "Captura por câmera com leitura de QR Code ou código de barras.",
  },
];

const createEditableItems = (preview: StockEntryPreview): EditablePreviewItem[] =>
  preview.items.map((item) => ({
    ...item,
    id: item.id,
    action: item.suggestedAction,
    existingProductId: item.existingProduct?.id || null,
    name: item.existingProduct?.name || item.description,
    barcode: item.barcode || "",
    ncm: item.ncm || "",
    category: item.existingProduct?.category || item.suggestedCategory,
    costPrice: formatCurrencyBRL(item.unitCost),
    salePrice: formatCurrencyBRL(item.existingProduct?.salePrice || item.unitCost),
  }));

const PROCESS_ACTION_LABELS: Record<StockEntryProcessAction, string> = {
  CREATE_NEW: "Criar novo",
  UPDATE_EXISTING: "Somar ao existente",
  IGNORED: "Ignorar",
};

export default function EstoqueEntradaPage() {
  const { role, segment, isReady } = useSegment();
  const [pickerOpen, setPickerOpen] = useState(true);
  const [selectedMethod, setSelectedMethod] =
    useState<StockEntryImportMethod>("XML_UPLOAD");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [xmlFileName, setXmlFileName] = useState("");
  const [xmlContent, setXmlContent] = useState("");
  const [preview, setPreview] = useState<StockEntryPreview | null>(null);
  const [editableItems, setEditableItems] = useState<EditablePreviewItem[]>([]);
  const [recentEntries, setRecentEntries] = useState<RecentStockEntry[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchRecentEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const response = await fetch("/api/stock/entries", { cache: "no-store" });
      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar entradas recentes.");
      }

      setRecentEntries(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      console.error(fetchError);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (role === "ADMIN") {
      void fetchRecentEntries();
    }
  }, [fetchRecentEntries, role]);

  const createCount = useMemo(
    () => editableItems.filter((item) => item.action === "CREATE_NEW").length,
    [editableItems],
  );
  const updateCount = useMemo(
    () => editableItems.filter((item) => item.action === "UPDATE_EXISTING").length,
    [editableItems],
  );

  const updateEditableItem = (
    id: string,
    updater: (current: EditablePreviewItem) => EditablePreviewItem,
  ) => {
    setEditableItems((current) =>
      current.map((item) => (item.id === id ? updater(item) : item)),
    );
  };

  const handleXmlUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      setXmlFileName(file.name);
      setXmlContent(content);
      setSelectedMethod("XML_UPLOAD");
      setPickerOpen(false);
      setMessage("XML carregado. Gere a prévia para revisar os itens.");
      setError("");
    } catch (uploadError) {
      console.error(uploadError);
      setError("Nao foi possivel ler o arquivo XML selecionado.");
    } finally {
      event.target.value = "";
    }
  };

  const loadPreview = async (
    methodOverride?: StockEntryImportMethod,
    accessKeyOverride?: string,
  ) => {
    const method = methodOverride || selectedMethod;
    const effectiveAccessKey = extractNfeAccessKey(accessKeyOverride || accessKey);

    setLoadingPreview(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/stock/entries/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          accessKey: effectiveAccessKey,
          xmlContent,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao gerar a prévia da nota.");
      }

      setPreview(payload as StockEntryPreview);
      setEditableItems(createEditableItems(payload as StockEntryPreview));
      if (effectiveAccessKey) {
        setAccessKey(effectiveAccessKey);
      }
      setMessage("Prévia gerada. Revise os itens antes de processar a entrada.");
    } catch (previewError) {
      console.error(previewError);
      setPreview(null);
      setEditableItems([]);
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Erro ao montar a prévia da nota.",
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleProcess = async () => {
    if (!preview || editableItems.length === 0) {
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/stock/entries/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          items: editableItems.map((item) => ({
            id: item.id,
            action: item.action,
            existingProductId: item.existingProductId,
            name: item.name,
            barcode: item.barcode,
            ncm: item.ncm,
            category: item.category,
            costPrice: item.costPrice,
            salePrice: item.salePrice,
          })),
          xmlContent,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao processar a entrada.");
      }

      setMessage(
        `Entrada processada com sucesso. ${payload?.createdCount || 0} criados, ${payload?.updatedCount || 0} atualizados e ${payload?.payablesCount || 0} contas a pagar geradas.`,
      );
      setPreview(null);
      setEditableItems([]);
      setXmlContent("");
      setXmlFileName("");
      setAccessKey("");
      await fetchRecentEntries();
    } catch (processError) {
      console.error(processError);
      setError(
        processError instanceof Error
          ? processError.message
          : "Erro ao processar a entrada da nota.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (isReady && role === "FUNCIONARIO") {
    return (
      <div className="min-h-full bg-[#0B1120] px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-400/20 bg-[#112240]/85 p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
            Acesso restrito
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Entrada de mercadorias exige perfil ADMIN
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Este fluxo cria estoque, custo médio e contas a pagar automaticamente.
          </p>
          <a
            href="/estoque"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao estoque
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0B1120] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[30px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FACC15]">
                Central de Entrada
              </p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white">
                <Inbox className="h-8 w-8 text-[#FACC15]" />
                Nova Entrada (XML/Nota)
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Transforme a nota fiscal em estoque atualizado, custo médio
                recalculado e contas a pagar no financeiro.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
              >
                <QrCode className="h-4 w-4" />
                Trocar método
              </button>
              <a
                href="/estoque"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao estoque
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Método ativo
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    {
                      IMPORT_METHODS.find((method) => method.value === selectedMethod)
                        ?.title
                    }
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Segmento atual: <strong>{segment || "TECH"}</strong>
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  Consulta por chave depende do token da Focus e do Certificado A1.
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedMethod === "XML_UPLOAD" ? (
                  <div className="rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-400/35 bg-cyan-400/10 px-5 py-10 text-center font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15">
                      <FileCode2 className="h-5 w-5" />
                      {xmlFileName || "Selecionar XML da NF-e"}
                      <input
                        type="file"
                        accept=".xml,text/xml,application/xml"
                        onChange={handleXmlUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void loadPreview("XML_UPLOAD")}
                      disabled={!xmlContent || loadingPreview}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingPreview ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Inbox className="h-4 w-4" />
                      )}
                      Gerar prévia do XML
                    </button>
                  </div>
                ) : null}

                {selectedMethod === "ACCESS_KEY" ? (
                  <div className="rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
                    <label className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Chave de acesso da DANFE
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={accessKey}
                      onChange={(event) =>
                        setAccessKey(extractNfeAccessKey(event.target.value))
                      }
                      placeholder="Cole ou digite os 44 digitos"
                      className="mt-3 w-full rounded-2xl border border-slate-700 bg-[#06101d] px-4 py-4 text-lg font-semibold tracking-[0.18em] text-white outline-none transition-colors focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => void loadPreview("ACCESS_KEY")}
                      disabled={accessKey.length !== 44 || loadingPreview}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingPreview ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Hash className="h-4 w-4" />
                      )}
                      Buscar XML na Focus
                    </button>
                  </div>
                ) : null}

                {selectedMethod === "DANFE_SCAN" ? (
                  <div className="rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
                    <p className="text-sm leading-6 text-slate-300">
                      Capture a DANFE com a câmera. O WTM extrai a chave e usa a
                      Focus para baixar o XML completo da nota recebida.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-black text-cyan-100 transition-colors hover:bg-cyan-400/15"
                      >
                        <ScanLine className="h-4 w-4" />
                        Abrir câmera
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadPreview("DANFE_SCAN")}
                        disabled={accessKey.length !== 44 || loadingPreview}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingPreview ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Consultar chave capturada
                      </button>
                    </div>
                    {accessKey ? (
                      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Chave capturada: <strong>{accessKey}</strong>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {message ? (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>

          <aside className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Entradas recentes</h2>
            <div className="mt-5 space-y-3">
              {loadingEntries ? (
                <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4 text-sm text-slate-400">
                  Carregando entradas...
                </div>
              ) : recentEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] px-4 py-5 text-sm text-slate-400">
                  Nenhuma entrada processada ainda.
                </div>
              ) : (
                recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4"
                  >
                    <p className="font-semibold text-white">
                      NF-e {entry.invoiceNumber || "sem numero"}
                      {entry.series ? ` / ${entry.series}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.supplierName || "Fornecedor nao informado"}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {formatCurrencyBRL(entry.totalAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.itemsCount} itens | {entry.payablesCount} titulos |{" "}
                      {formatCurrencyBRL(entry.pendingAmount)} pendente
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
        {preview ? (
          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                  Prévia fiscal
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  NF-e {preview.invoiceNumber || "sem numero"}
                  {preview.series ? ` / Serie ${preview.series}` : ""}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {preview.supplierName || "Fornecedor nao identificado"}
                </p>
                {preview.accessKey ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Chave: {preview.accessKey}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Total
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    {formatCurrencyBRL(preview.totalAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Criar
                  </p>
                  <p className="mt-2 font-semibold text-white">{createCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Atualizar
                  </p>
                  <p className="mt-2 font-semibold text-white">{updateCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">
                    Financeiro
                  </p>
                  <p className="mt-2 font-semibold text-amber-100">
                    {formatCurrencyBRL(
                      preview.installments.reduce(
                        (accumulator, installment) =>
                          accumulator + Number(installment.amount || 0),
                        0,
                      ) || preview.totalAmount,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4 text-sm text-slate-300">
              {(preview.installments.length > 0
                ? preview.installments
                : [
                    {
                      id: "1",
                      number: null,
                      dueDate: preview.issueDate,
                      amount: preview.totalAmount,
                    },
                  ]
              ).map((installment) => (
                <p key={installment.id}>
                  {installment.number ? `Duplicata ${installment.number}` : "Conta principal"}:
                  <strong> {formatCurrencyBRL(installment.amount)}</strong>
                  {" • "}
                  vencimento{" "}
                  {installment.dueDate
                    ? new Date(installment.dueDate).toLocaleDateString("pt-BR")
                    : "na data da nota"}
                </p>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {editableItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-slate-700 bg-[#0B1120] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{item.description}</h3>
                        <span className="rounded-full border border-slate-700 bg-[#06101d] px-3 py-1 text-xs font-semibold text-slate-300">
                          {getProductCategoryLabel(item.category)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        Qtd. nota: <strong>{item.quantity}</strong> | Entrada:{" "}
                        <strong>{item.stockQuantity}</strong> | Custo unit.:{" "}
                        <strong>{formatCurrencyBRL(item.unitCost)}</strong>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        EAN: {item.barcode || "nao informado"} | NCM: {item.ncm || "nao informado"}
                      </p>
                      {item.existingProduct ? (
                        <p className="mt-2 text-xs text-emerald-100">
                          Cadastro encontrado: {item.existingProduct.name} | Estoque atual:{" "}
                          {item.existingProduct.stock} | Projetado: {item.projectedStock ?? item.existingProduct.stock}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#06101d] p-4">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Ação
                      </label>
                      <select
                        value={item.action}
                        onChange={(event) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            action: event.target.value as StockEntryProcessAction,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0B1120] px-3 py-3 text-sm text-white outline-none focus:border-amber-400"
                      >
                        <option value="UPDATE_EXISTING" disabled={!item.existingProduct}>
                          {PROCESS_ACTION_LABELS.UPDATE_EXISTING}
                        </option>
                        <option value="CREATE_NEW">{PROCESS_ACTION_LABELS.CREATE_NEW}</option>
                        <option value="IGNORED">{PROCESS_ACTION_LABELS.IGNORED}</option>
                      </select>
                    </div>
                  </div>

                  {item.action !== "IGNORED" ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400 xl:col-span-2"
                        placeholder="Nome do produto"
                      />
                      <input
                        type="text"
                        value={item.category}
                        onChange={(event) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            category: event.target.value.toUpperCase(),
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400"
                        placeholder="Categoria"
                      />
                      <input
                        type="text"
                        value={item.ncm}
                        onChange={(event) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            ncm: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400"
                        placeholder="NCM"
                      />
                      <input
                        type="text"
                        value={item.barcode}
                        onChange={(event) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            barcode: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400"
                        placeholder="EAN"
                      />
                      <CurrencyInput
                        value={item.costPrice}
                        onChange={(value) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            costPrice: value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400"
                      />
                      <CurrencyInput
                        value={item.salePrice}
                        onChange={(value) =>
                          updateEditableItem(item.id, (current) => ({
                            ...current,
                            salePrice: value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#06101d] px-4 py-3 text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-slate-700 bg-[#06101d] px-4 py-3 text-sm text-slate-400">
                      Este item sera ignorado no processamento final.
                    </div>
                  )}
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleProcess()}
              disabled={processing || editableItems.length === 0}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-4 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
              {processing
                ? "Processando estoque e financeiro..."
                : "Processar entrada + contas a pagar"}
            </button>
          </section>
        ) : null}
      </main>

      {pickerOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[32px] border border-slate-700 bg-[#07111e]/95 p-6 shadow-[0_0_70px_rgba(15,23,42,0.85)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FACC15]">
              Escolha o ponto de entrada
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              Como deseja importar a nota?
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {IMPORT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method.value);
                    setPickerOpen(false);
                  }}
                  className="rounded-[28px] border border-slate-700 bg-[#0B1120] p-6 text-left transition-colors hover:border-[#FACC15]/40 hover:bg-[#101b2d]"
                >
                  <p className="text-lg font-bold text-white">{method.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{method.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <DanfeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(capturedAccessKey) => {
          setAccessKey(capturedAccessKey);
          setSelectedMethod("DANFE_SCAN");
          void loadPreview("DANFE_SCAN", capturedAccessKey);
        }}
      />
    </div>
  );
}
