"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppNotificationProps {
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  problem?: string; // ADICIONADO DE VOLTA PARA NÃO DAR ERRO NO BUILD
  status?: string; 
  osId?: string | number;
  totalPrice?: number | string;
  disabled?: boolean;
  checklist?: {
    liga: string;    // SIM, NÃO, SEM CARGA
    tela: string;    // OK, FALHANDO, QUEBRADO
    carcaca: string; // OK, RISCOS LEVES, AMASSADO
  };
}

export const WhatsAppNotificationButton: React.FC<
  WhatsAppNotificationProps
> = ({
  clientName,
  clientPhone,
  deviceModel,
  deviceBrand,
  problem, // Recebendo o problema
  status = "PENDENTE",
  osId,
  totalPrice,
  disabled = false,
  checklist,
}) => {
  const handleSend = () => {
    if (!clientPhone || !clientName) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR');
    const protocolDate = today.toISOString().split('T')[0].replace(/-/g, "");
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const last4 = cleanPhone.slice(-4);
    const protocolCode = osId ? `${osId}` : `MC${protocolDate}-${last4}`;

    const storeHeader = `🏢 *MULTICELL - ASSISTÊNCIA TÉCNICA ESPECIALIZADA*`;
    const storeFooter = `📍 *Unidade:* Av. Paraná, 470 - Cândido de Abreu/PR\n📞 *Suporte:* (43) 99603-1208\n*CNPJ:* 48.002.640.0001/67`;

    // Captura exata do que foi selecionado no App
    const infoLiga = checklist?.liga || "NÃO INFORMADO";
    const infoTela = checklist?.tela || "NÃO INFORMADO";
    const infoCarcaca = checklist?.carcaca || "NÃO INFORMADO";

    let message = "";

    if (status === "FINALIZADO" || status === "ENTREGUE") {
      message =
        `${storeHeader}\n\n` +
        `Prezado(a) *${clientName}*,\n` +
        `Informamos que o seu equipamento teve os procedimentos técnicos concluídos com sucesso. ✅\n\n` +
        `• *ID O.S.:* #${protocolCode}\n` +
        `• *Aparelho:* ${deviceBrand} ${deviceModel}\n` +
        `• *Investimento:* R$ ${Number(totalPrice || 0).toFixed(2)}\n\n` +
        `O item já está disponível para retirada em nossa unidade física.\n\n` +
        `${storeFooter}`;
    } else {
      message =
        `${storeHeader}\n\n` +
        `Olá, *${clientName}*.\n` +
        `Confirmamos a abertura da sua Ordem de Serviço.\n\n` +
        `🆔 *PROTOCOLO:* ${protocolCode}\n` +
        `📅 *ENTRADA:* ${formattedDate}\n` +
        `📱 *EQUIPAMENTO:* ${deviceBrand} ${deviceModel}\n\n` +
        `🔍 *LAUDO TÉCNICO DE RECEBIMENTO:*\n` +
        `• *Alimentação (Liga):* ${infoLiga}\n` +
        `• *Display/Touch:* ${infoTela}\n` +
        `• *Estado da Carcaça:* ${infoCarcaca}\n\n` +
        `🛡️ *SEGURANÇA:* Seu patrimônio está assegurado. Você receberá atualizações sobre o diagnóstico.\n\n` +
        `${storeFooter}`;
    }

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleSend}
      disabled={disabled || !clientPhone}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all w-full justify-center ${
        disabled ? "bg-gray-500 opacity-50" : "bg-gradient-to-r from-[#25D366] to-[#128C7E] shadow-lg shadow-green-500/30"
      }`}
    >
      <MessageCircle size={20} />
      {status === "FINALIZADO" ? "Aviso de Retirada" : "Emitir Protocolo via WhatsApp"}
    </button>
  );
};
