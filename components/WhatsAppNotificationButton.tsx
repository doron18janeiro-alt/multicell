"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppNotificationProps {
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  problem: string;
  status?: string;
  osId?: string | number;
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

    // 1. Gerar Protocolo Profissional
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const protocolDate = `${yyyy}${mm}${dd}`;
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "0000";
    const protocolCode = osId ? `${osId}` : `MC${protocolDate}-${last4}`;

    // 2. Construir Mensagem com Tom Corporativo
    let message = "";

    // Store Info sem link e com tom de autoridade
    const storeHeader = `🏢 *MULTICELL - ASSISTÊNCIA TÉCNICA ESPECIALIZADA*`;
    const storeFooter = `📍 *Unidade:* Av. Paraná, 470 - Cândido de Abreu/PR\n📞 *Suporte:* (43) 99603-1208\n*CNPJ:* 48.002.640.0001/67`;

    if (status === "FINALIZADO") {
      message =
        `${storeHeader}\n\n` +
        `Prezado(a) *${clientName}*,\n` +
        `Informamos que os procedimentos técnicos em seu equipamento foram *CONCLUÍDOS* com sucesso. ✅\n\n` +
        `📝 *DETALHES DO PROTOCOLO:*\n` +
        `• *ID O.S.:* #${protocolCode}\n` +
        `• *Equipamento:* ${deviceBrand} ${deviceModel}\n` +
        `• *Investimento:* R$ ${Number(totalPrice || 0).toFixed(2)}\n\n` +
        `O item já se encontra disponível para retirada em nossa unidade física.\n\n` +
        `${storeFooter}\n\n` +
        `_Agradecemos a confiança em nossos serviços profissionais._`;
    } else {
      // MODELO PREMIUM DE ENTRADA (Checklist técnico)
      message =
        `${storeHeader}\n\n` +
        `Olá, *${clientName}*.\n` +
        `Registramos a entrada do seu dispositivo para análise em nosso laboratório.\n\n` +
        `🆔 *PROTOCOLO DIGITAL:* ${protocolCode}\n` +
        `📅 *DATA DE ENTRADA:* ${formattedDate}\n` +
        `📱 *EQUIPAMENTO:* ${deviceBrand} ${deviceModel}\n\n` +
        `🔍 *LAUDO DE RECEBIMENTO:*\n` +
        `• *Alimentação (Liga):* ${checklist?.liga || "N/A"}\n` +
        `• *Display/Touch:* ${checklist?.tela || "N/A"}\n` +
        `• *Integridade Física:* ${checklist?.corpo || "N/A"}\n\n` +
        `🛡️ *SEGURANÇA:* Seu patrimônio está assegurado por nossos protocolos internos de proteção de dados e hardware.\n\n` +
        `${storeFooter}`;
    }

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
      message,
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
        ? "Notificar Conclusão do Serviço"
        : "Emitir Protocolo de Entrada"}
    </button>
  );
};
