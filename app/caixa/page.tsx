"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Wallet,
  Banknote,
  QrCode,
  CreditCard,
  Lock,
  CheckCircle,
  Share2,
} from "lucide-react";

export default function CashFlow() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCash: 0,
    totalPix: 0,
    totalDebit: 0,
    totalCredit: 0,
    totalNet: 0,
    isClosed: false,
    companyPhone: "",
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const res = await fetch("/api/cash-flow/today");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!confirm("Tem certeza que deseja encerrar o caixa de hoje?")) return;

    try {
      const res = await fetch("/api/cash-flow/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });

      if (res.ok) {
        setStats((prev) => ({ ...prev, isClosed: true }));
        setShowModal(true);
      } else {
        alert("Erro ao fechar caixa.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhatsAppShare = () => {
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const message = `
*--- FECHAMENTO MULTICELL [${dateStr}] ---*
💰 *Dinheiro:* R$ ${(stats.totalCash || 0).toFixed(2)}
📱 *Pix:* R$ ${(stats.totalPix || 0).toFixed(2)}
💳 *Débito:* R$ ${(stats.totalDebit || 0).toFixed(2)}
💳 *Crédito:* R$ ${(stats.totalCredit || 0).toFixed(2)}
----------------------------
📈 *Lucro Líquido Total:* R$ ${(stats.totalNet || 0).toFixed(2)}
    `.trim();

    // Clean phone number (remove non-digits)
    const phone = stats.companyPhone.replace(/\D/g, "");
    // If no phone configured, maybe ask user or just warn
    const target = phone ? `55${phone}` : "";

    // Note: To send TO yourself, you assume the user is logged into WA Web.
    // Usually businesses send TO the owner. If the phone in config is the owner's phone, this works.
    const url = `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="text-[#FFD700]" />
            Fechamento de Caixa
          </h1>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Data de Hoje</p>
            <p className="text-xl font-bold text-white">
              {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">
            Carregando dados financeiros...
          </div>
        ) : (
          <>
            {/* Status Banner */}
            {stats.isClosed && (
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl mb-8 flex items-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold text-lg">
                  Caixa encerrado com sucesso!
                </span>
                <button
                  onClick={() => setShowModal(true)}
                  className="ml-auto text-sm underline hover:text-green-300"
                >
                  Ver Resumo
                </button>
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card Dinheiro */}
              <div className="bg-[#112240] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
                <div className="absolute top-0 right-0 p-4 text-[#FFD700]/10 group-hover:text-[#FFD700]/20 transition-colors">
                  <Banknote size={64} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] mb-4">
                    <Banknote size={24} />
                  </div>
                  <h3 className="text-slate-400 font-medium mb-1">
                    Dinheiro em Gaveta
                  </h3>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(stats.totalCash)}
                  </p>
                </div>
              </div>

              {/* Card Pix */}
              <div className="bg-[#112240] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-[#10B981]/30 transition-all">
                <div className="absolute top-0 right-0 p-4 text-[#10B981]/10 group-hover:text-[#10B981]/20 transition-colors">
                  <QrCode size={64} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-4">
                    <QrCode size={24} />
                  </div>
                  <h3 className="text-slate-400 font-medium mb-1">
                    Recebido via Pix
                  </h3>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(stats.totalPix)}
                  </p>
                </div>
              </div>

              {/* Card Cartão */}
              <div className="bg-[#112240] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-[#3B82F6]/30 transition-all">
                <div className="absolute top-0 right-0 p-4 text-[#3B82F6]/10 group-hover:text-[#3B82F6]/20 transition-colors">
                  <CreditCard size={64} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] mb-4">
                    <CreditCard size={24} />
                  </div>
                  <h3 className="text-slate-400 font-medium mb-1">
                    Cartão (Líquido)
                  </h3>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(stats.totalDebit + stats.totalCredit)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Débito: {formatCurrency(stats.totalDebit)} | Crédito:{" "}
                    {formatCurrency(stats.totalCredit)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Net Logic */}
            <div className="bg-gradient-to-r from-[#112240] to-[#0F172A] p-8 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Total Líquido Estimado
                </h2>
                <p className="text-slate-400">
                  Somatória de todas as entradas já descontando taxas da
                  maquininha.
                </p>
              </div>
              <div className="text-4xl font-bold text-[#FFD700]">
                {formatCurrency(stats.totalNet)}
              </div>
            </div>

            {/* Action Button */}
            {!stats.isClosed && (
              <button
                onClick={handleCloseRegister}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-transform active:scale-[0.99] shadow-lg shadow-red-900/20"
              >
                <Lock className="w-6 h-6" />
                ENCERRAR EXPEDIENTE
              </button>
            )}
          </>
        )}

        {/* Modal Summary */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#112240] p-8 rounded-2xl border border-slate-700 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white">Resumo do Dia</h2>
                <p className="text-slate-400">
                  {new Date().toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="space-y-4 mb-8 bg-[#0B1120] p-6 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Dinheiro</span>
                  <span className="font-bold text-white">
                    {formatCurrency(stats.totalCash)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Pix</span>
                  <span className="font-bold text-white">
                    {formatCurrency(stats.totalPix)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Cartão</span>
                  <span className="font-bold text-white">
                    {formatCurrency(stats.totalDebit + stats.totalCredit)}
                  </span>
                </div>
                <div className="h-px bg-slate-700 my-2" />
                <div className="flex justify-between text-[#FFD700] font-bold text-lg">
                  <span>Lucro Real</span>
                  <span>{formatCurrency(stats.totalNet)}</span>
                </div>
              </div>

              <button
                onClick={handleWhatsAppShare}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                disabled={!stats.companyPhone}
              >
                <Share2 className="w-5 h-5" />
                {stats.companyPhone
                  ? "Enviar no WhatsApp"
                  : "Configurar WhatsApp da Loja"}
              </button>
              {!stats.companyPhone && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Você precisa cadastrar um telefone nas Configurações.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
