"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import { WhatsAppNotificationButton } from "@/components/WhatsAppNotificationButton";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  DollarSign,
  Wrench,
  Banknote,
  QrCode,
  CreditCard,
  X,
  User,
  Smartphone,
  Calendar,
} from "lucide-react";

export default function OrderDetails() {
  const params = useParams();
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const router = useRouter();
  const id = params?.id as string;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [finalPrice, setFinalPrice] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
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
  };

  const handleFinalizar = () => {
    setFinalPrice(os.totalPrice?.toString() || "0");
    setPartsCost(os.costPrice?.toString() || "0");
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
        fetchOrder(); // Reload data
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

  if (loading)
    return <div className="p-8 text-white">Carregando detalhes...</div>;
  if (!os) return <div className="p-8 text-white">O.S. não encontrada.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/os"
            className="p-2 rounded-full bg-[#112240] text-slate-400 hover:text-[#D4AF37]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Ordem de Serviço #{os.id}
            </h1>
            <p className="text-slate-400 text-sm">
              Criada em {new Date(os.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {os.status !== "FINALIZADO" && (
            <button
              onClick={handleFinalizar}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <DollarSign size={18} />
              Finalizar e Receber
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="btn-outline flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              os.status === "FINALIZADO"
                ? "bg-green-900/30 border border-green-800 text-green-400"
                : "bg-blue-900/30 border border-blue-800 text-blue-400"
            }`}
          >
            <Wrench className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Status Atual: {os.status}</h3>
              <p className="text-sm opacity-80">
                {os.status === "FINALIZADO"
                  ? "Serviço concluído e valores lançados no financeiro."
                  : "O aparelho está em processo de manutenção."}
              </p>
            </div>
          </div>

          {/* Device Info */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Smartphone className="text-[#D4AF37]" size={20} />
              Dados do Aparelho
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase">
                  Marca/Modelo
                </span>
                <p className="font-medium text-white">
                  {os.deviceBrand} {os.deviceModel}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">
                  Serial / IMEI
                </span>
                <p className="font-medium text-white">
                  {os.serialNumber || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Senha</span>
                <p className="font-medium text-white">
                  {os.devicePassword || "Sem senha"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Cor</span>
                <p className="font-medium text-white">
                  {os.deviceColor || "-"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#233554]">
              <span className="text-xs text-slate-400 uppercase">
                Defeito Relatado
              </span>
              <p className="text-white mt-1">{os.problem}</p>
            </div>
            {os.observations && (
              <div className="mt-4 pt-4 border-t border-[#233554]">
                <span className="text-xs text-slate-400 uppercase">
                  Observações Técnicas
                </span>
                <p className="text-white mt-1">{os.observations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="text-[#D4AF37]" size={20} />
              Cliente
            </h3>
            <p className="font-bold text-white text-lg">{os.clientName}</p>
            <p className="text-slate-400">{os.clientPhone}</p>
            {os.clientCpf && (
              <p className="text-slate-500 text-sm mt-1">CPF: {os.clientCpf}</p>
            )}

            <div className="mt-4 pt-4 border-t border-[#233554]">
              <WhatsAppNotificationButton
                clientName={os.customer?.name || os.clientName || ""}
                clientPhone={os.customer?.phone || os.clientPhone || ""}
                deviceBrand={os.deviceBrand}
                deviceModel={os.deviceModel}
                problem={os.problem}
                status={os.status}
                osId={os.id}
                totalPrice={os.totalPrice}
              />
            </div>
          </div>

          {/* Financial */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="text-[#D4AF37]" size={20} />
              Financeiro
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Cobrado</span>
                <span className="text-green-400 font-bold">
                  R$ {os.totalPrice?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Custo Peças</span>
                <span className="text-red-400">
                  R$ {os.costPrice?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="pt-3 border-t border-[#233554] flex justify-between">
                <span className="text-white font-bold">Lucro Líquido</span>
                <span className="text-[#FFD700] font-bold">
                  R${" "}
                  {(os.servicePrice || os.totalPrice - os.costPrice)?.toFixed(
                    2
                  ) || "0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#112240] rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="text-[#D4AF37]" />
                Receber Pagamento
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Values */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-700 rounded-lg p-3 text-white text-lg font-bold focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">
                    Custo de Peças (R$)
                  </label>
                  <input
                    type="number"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-700 rounded-lg p-3 text-white focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-sm text-slate-400 block mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("DINHEIRO")}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      paymentMethod === "DINHEIRO"
                        ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_10px_#D4AF37]"
                        : "bg-[#0B1120] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">DINHEIRO</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("PIX")}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      paymentMethod === "PIX"
                        ? "bg-[#22c55e] text-black border-[#22c55e] shadow-[0_0_10px_#22c55e]"
                        : "bg-[#0B1120] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200" // changed text-white to text-black for visibility on green
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
                        : "bg-[#0B1120] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
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
                        : "bg-[#0B1120] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">CRÉDITO</span>
                  </button>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={confirmPayment}
                disabled={processingPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? (
                  "Processando..."
                ) : (
                  <>
                    <CheckCircle size={24} /> Confirmar Recebimento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "none" }}>
        <ServiceOrderPrint ref={componentRef} data={os} />
      </div>
    </div>
  );
}
