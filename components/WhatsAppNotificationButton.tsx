"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppNotificationProps {
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  problem: string;
  status?: string; // "FINALIZADO", "EM_ANDAMENTO", etc.
  osId?: string | number; // Se não tiver, usa o gerado
  totalPrice?: number | string;
  disabled?: boolean;
  checklist?: {
    liga: string;
    tela: string;
    corpo: string;
  };
}

export const WhatsAppNotificationButton: React.FC<
  WhatsAppNotificationProps
> = ({
  clientName,
  clientPhone,
  deviceModel,
  deviceBrand,
  problem,
  status = "PENDENTE",
  osId,
  totalPrice,
  disabled = false,
  checklist,
}) => {
  const handleSend = () => {
    if (!clientPhone || !clientName) return;

    // 1. Gerar Protocolo (Lógica MC + Data + FinalFone)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const protocolDate = `${yyyy}${mm}${dd}`;
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "0000";
    const protocolCode = osId ? `${osId}` : `MC${protocolDate}-${last4}`;

    // 2. Construir Mensagem
    let message = "";

    const storeInfo = `🛡️ *Segurança:* Você receberá atualizações automáticas por aqui. Nosso compromisso é com a excelência técnica e a proteção do seu patrimônio.\n\n� *Consulte o Status:* https://multicellsystem.com.br/consulta\n\n�📍 *Unidade Cândido de Abreu:* Av Paraná, 470 - Bela Vista (PR).\n📞 *Suporte:* (43) 99603-1208.\n*MULTICELL* | CNPJ: 48.002.640.0001/67.`;

    if (status === "FINALIZADO") {
      message =
        `Ótimas notícias, *${clientName}*! 🎉\n\n` +
        `O reparo do seu equipamento foi concluído e ele já está pronto para retirada na *MULTICELL*.\n\n` +
        `🆔 *Protocolo:* ${protocolCode}\n` +
        `📱 *Aparelho:* ${deviceBrand} ${deviceModel}\n` +
        `💰 *Valor do Serviço:* R$ ${Number(totalPrice || 0).toFixed(2)}\n\n` +
        `Você pode retirar seu equipamento de segunda a sexta, em horário comercial.\n\n` +
        `📍 *Endereço para Retirada:* Av Paraná, 470 - Bela Vista - Cândido de Abreu (PR).\n` +
        `📞 Dúvidas? (43) 99603-1208.\n\n` +
        `Estamos à disposição! 🚀`;
    } else {
      // MODELO PREMIUM DE ENTRADA
      message =
        `Olá, *${clientName}*! 👋 Bem-vindo(a) à *MULTICELL*.\n\n` +
        `Confirmamos a abertura da sua Ordem de Serviço para o equipamento *${deviceBrand} ${deviceModel}*.\n\n` +
        `🆔 *Protocolo:* ${protocolCode} 📅 *Entrada:* ${formattedDate}\n\n` +
        `📝 *Checklist de Recebimento:*\n` +
        `⚡ *Liga:* [${checklist?.liga || "N/A"}]\n` +
        `📲 *Tela/Touch:* [${checklist?.tela || "N/A"}]\n` +
        `🎨 *Estado Físico:* [${checklist?.corpo || "N/A"}]\n\n` +
        `${storeInfo}`;
    }

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, "_blank");
  };

  const isCompleted = status === "FINALIZADO";

  return (
    <button
      onClick={handleSend}
      disabled={disabled || !clientPhone}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all w-full justify-center
        ${
          disabled
            ? "bg-gray-500 cursor-not-allowed opacity-50"
            : isCompleted
            ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
            : "bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6d] shadow-lg shadow-green-500/30"
        }
      `}
    >
      <MessageCircle size={20} />
      {isCompleted
        ? "Enviar Aviso de Conclusão"
        : "Enviar Protocolo de Entrada"}
    </button>
  );
};
