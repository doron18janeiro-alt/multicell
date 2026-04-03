"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import { SaleReceiptThermal } from "@/components/SaleReceiptThermal";
import {
  ServiceOrderDocument,
  isWarrantyDocumentStatus,
  resolveServiceDocumentTitle,
  type DocumentCompanyConfig,
  type ServiceOrderDocumentData,
} from "@/components/ServiceOrderDocument";
import { WhatsAppNotificationButton } from "@/components/WhatsAppNotificationButton";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  DollarSign,
  Banknote,
  QrCode,
  CreditCard,
  ReceiptText,
  X,
} from "lucide-react";

const defaultCompanyConfig: DocumentCompanyConfig = {
  name: "Minha Empresa",
  cnpj: null,
  document: null,
  address: null,
  phone: null,
  logoUrl: "/logo-wtm.png",
};

export default function OrderDetails() {
  const params = useParams();
  const componentRef = useRef<HTMLDivElement>(null);
  const thermalPrintRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });
  const handleThermalPrint = useReactToPrint({
    contentRef: thermalPrintRef,
  });
  const id = params?.id as string;

  const [os, setOs] = useState<ServiceOrderDocumentData | null>(null);
  const [companyConfig, setCompanyConfig] =
    useState<DocumentCompanyConfig>(defaultCompanyConfig);
  const [currentUserName, setCurrentUserName] = useState(
    "Responsavel nao informado",
  );
  const [appBaseUrl, setAppBaseUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || "",
  );
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [finalPrice, setFinalPrice] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const termsUrl = useMemo(() => {
    const fallbackUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const normalizedBase = (appBaseUrl || fallbackUrl || "").replace(/\/$/, "");
    return normalizedBase ? `${normalizedBase}/termos` : "/termos";
  }, [appBaseUrl]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/os/${id}`);
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      setOs(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar detalhes da O.S.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      if (!data || data.error) {
        return;
      }

      setCompanyConfig((current) => ({
        ...current,
        name: data.name || current.name,
        cnpj: data.cnpj || data.document || current.cnpj || current.document,
        document: data.cnpj || data.document || current.document,
        address: data.address || current.address,
        phone: data.phone || current.phone,
        logoUrl: data.logoUrl || current.logoUrl,
      }));
    } catch (error) {
      console.error("Erro ao carregar config da empresa:", error);
    }
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setCurrentUserName(data.fullName || "Responsavel nao informado");
    } catch (error) {
      console.error("Erro ao carregar usuário da sessão:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (id) {
      void fetchOrder();
      void fetchConfig();
      void fetchSession();
    }
  }, [fetchConfig, fetchOrder, fetchSession, id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        void fetchOrder();
      }, 250);
    };

    const channel = supabase
      .channel(`service_order_${id}_updates`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "os",
          filter: `id=eq.${id}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      void channel.unsubscribe();
    };
  }, [fetchOrder, id]);

  const handleFinalizar = () => {
    setFinalPrice(os?.totalPrice?.toString() || "0");
    setPartsCost(os?.costPrice?.toString() || "0");
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    setProcessingPayment(true);

    try {
      const res = await fetch(`/api/os/${id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          totalPrice: finalPrice,
          costPrice: partsCost,
        }),
      });

      if (res.ok) {
        alert("Pagamento recebido e O.S. finalizada com sucesso!");
        setIsPaymentModalOpen(false);
        void fetchOrder();
      } else {
        alert("Erro ao finalizar pagamento.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-6 py-10 text-slate-600">
        Carregando detalhes...
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-6 py-10 text-slate-600">
        O.S. não encontrada.
      </div>
    );
  }

  const isWarrantyMode = isWarrantyDocumentStatus(os.status);
  const documentHeading = resolveServiceDocumentTitle(os);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/os"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-[#FACC15] hover:text-slate-950"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Documento profissional
              </p>
              <h1 className="text-2xl font-bold text-slate-950">
                {documentHeading}
              </h1>
              <p className="text-sm text-slate-500">
                {isWarrantyMode
                  ? "Termo de garantia pronto para A4/PDF ou cupom térmico de 80mm."
                  : "Pré-visualização pronta para impressão, PDF ou envio ao cliente."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <WhatsAppNotificationButton
              clientName={os.customer?.name || os.clientName || ""}
              clientPhone={os.customer?.phone || os.clientPhone || ""}
              deviceBrand={os.deviceBrand || ""}
              deviceModel={os.deviceModel || ""}
              problem={os.problem || ""}
              status={os.status || ""}
              osId={os.id}
              totalPrice={os.totalPrice || 0}
              checklist={{
                liga: os.checklist?.tests?.liga,
                tela: os.checklist?.tests?.touch,
                carcaca: os.checklist?.physical?.carcacaStatus,
              }}
              className="sm:w-auto px-5 shadow-none"
            />

            {!isWarrantyMode && (
              <button
                onClick={handleFinalizar}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FACC15] bg-[#FACC15] px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-[#eab308]"
              >
                <DollarSign size={18} />
                Finalizar e Receber
              </button>
            )}

            {isWarrantyMode ? (
              <>
                <button
                  onClick={() => handleThermalPrint()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FACC15] bg-[#FFFDE7] px-5 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#fef3c7]"
                >
                  <ReceiptText size={18} />
                  Cupom Garantia 80mm
                </button>

                <button
                  onClick={() => handlePrint()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 transition-colors hover:border-[#FACC15] hover:text-slate-950"
                >
                  <Printer size={18} />
                  Imprimir A4 / PDF
                </button>
              </>
            ) : (
              <button
                onClick={() => handlePrint()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 transition-colors hover:border-[#FACC15] hover:text-slate-950"
              >
                <Printer size={18} />
                Imprimir O.S.
              </button>
            )}
          </div>
        </div>

        <ServiceOrderDocument
          data={os}
          config={companyConfig}
          responsibleName={currentUserName}
        />
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#FDE68A] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Fechamento da O.S.
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Receber Pagamento
                </h2>
              </div>

              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-950 outline-none transition-colors focus:border-[#FACC15]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Custo de Peças (R$)
                  </label>
                  <input
                    type="number"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#FACC15]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Forma de Pagamento
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("DINHEIRO")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                      paymentMethod === "DINHEIRO"
                        ? "border-[#FACC15] bg-[#FACC15] text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.28)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    <Banknote className="mb-1 h-5 w-5" />
                    <span className="text-xs font-bold">DINHEIRO</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("PIX")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                      paymentMethod === "PIX"
                        ? "border-[#FACC15] bg-[#FACC15] text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.28)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    <QrCode className="mb-1 h-5 w-5" />
                    <span className="text-xs font-bold">PIX</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("DEBITO")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                      paymentMethod === "DEBITO"
                        ? "border-[#FACC15] bg-[#FACC15] text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.28)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    <CreditCard className="mb-1 h-5 w-5" />
                    <span className="text-xs font-bold">DÉBITO</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("CREDITO")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                      paymentMethod === "CREDITO"
                        ? "border-[#FACC15] bg-[#FACC15] text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.28)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    <CreditCard className="mb-1 h-5 w-5" />
                    <span className="text-xs font-bold">CRÉDITO</span>
                  </button>
                </div>
              </div>

              <button
                onClick={confirmPayment}
                disabled={processingPayment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingPayment ? (
                  "Processando..."
                ) : (
                  <>
                    <CheckCircle size={22} />
                    Confirmar Recebimento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
        <ServiceOrderPrint
          ref={componentRef}
          data={os}
          config={companyConfig}
          responsibleName={currentUserName}
        />
      </div>

      {isWarrantyMode ? (
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
          <SaleReceiptThermal
            ref={thermalPrintRef}
            mode="warranty"
            warranty={os}
            config={companyConfig}
            termsUrl={termsUrl}
            responsibleName={currentUserName}
          />
        </div>
      ) : null}
    </div>
  );
}
