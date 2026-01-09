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
}) => {
  const handleSend = () => {
    if (!clientPhone || !clientName) return;

    // 1. Gerar Protocolo (Lógica MC + Data + FinalFone)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${dd}/${mm}/${yyyy}`; // Para exibição na mensagem
    const protocolDate = `${yyyy}${mm}${dd}`; // Para o código do protocolo

    // Extrair apenas números do telefone para pegar os últimos 4
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "0000";

    // Se já tiver ID, usa o ID, senão usa o protocolo gerado
    const protocolCode = osId ? `${osId}` : `MC${protocolDate}-${last4}`;

    // 2. Construir Mensagem
    let message = "";

    const storeInfo = `📍 Endereço: Av Paraná, 470 - Bela Vista - Cândido de Abreu (PR).\n📞 Dúvidas? Fale conosco: (43) 99603-1208.`;
    const headerCompany = `*MULTICELL* - Tecnologia e Excelência Técnica`;

    if (status === "FINALIZADO") {
      // MODELO: Serviço Concluído
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
      // MODELO: Confirmação de Entrada (Padrão para outros status)
      message =
        `Olá, *${clientName}*! 👋\n\n` +
        `Sua Ordem de Serviço foi aberta com sucesso na *MULTICELL*.\n\n` +
        `🆔 *Protocolo:* ${protocolCode}\n\n` +
        `📱 *Equipamento:* ${deviceBrand} ${deviceModel}\n\n` +
        `🛠️ *Serviço:* ${problem}\n\n` +
        `📅 *Data de Entrada:* ${formattedDate}\n\n` +
        `Você receberá uma notificação por aqui assim que o orçamento for aprovado ou o serviço concluído.\n\n` +
        `${storeInfo}`;
    }

    // 3. Abrir WhatsApp
    // Usa encodeURIComponent para garantir que caracteres especiais funcionem
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
        flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
        ${
          disabled
            ? "bg-gray-500 cursor-not-allowed opacity-50"
            : isCompleted
            ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30" // Destaque para finalizado
            : "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30" // Padrão WhatsApp
        }
      `}
      title={
        disabled
          ? "Preencha telefone e nome"
          : "Enviar notificação via WhatsApp"
      }
    >
      <MessageCircle size={18} />
      {isCompleted ? "Avisar Retirada" : "Enviar Notificação"}
    </button>
  );
};
