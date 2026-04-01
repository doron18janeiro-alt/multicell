"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppNotificationProps {
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  problem?: string; // Incluído para evitar erros no build (page.tsx)
  status?: string; // "FINALIZADO", "PENDENTE", "ENTREGUE", etc.
  osId?: string | number;
  totalPrice?: number | string;
  disabled?: boolean;
  // Mapeado exatamente para as opções que você vê no App
  checklist?: {
    liga: string; // Ex: "SIM", "NÃO", "SEM CARGA"
    tela: string; // Ex: "OK", "FALHANDO", "QUEBRADO"
    carcaca: string; // Ex: "OK", "RISCOS LEVES", "AMASSADO"
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

    // 1. Geração de Protocolo Digital Profissional
    const today = new Date();
    const formattedDate = today.toLocaleDateString("pt-BR");
    const protocolDate = today.toISOString().split("T")[0].replace(/-/g, "");
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "0000";
    const protocolCode = osId ? `${osId}` : `MC${protocolDate}-${last4}`;

    // 2. Construção da Mensagem Corporativa da MULTICELL
    let message = "";

    // Header e Footer Corporativos (Sem links externos)
    const storeHeader = `🏢 *MULTICELL - ASSISTÊNCIA TÉCNICA ESPECIALIZADA*`;
    const storeFooter = `📍 *Unidade Física:* Av. Paraná, 470 - Cândido de Abreu/PR\n📞 *Suporte Direto:* (43) 99603-1208\n*CNPJ:* 48.002.640.0001/67`;

    // Captação Direta do que foi selecionado no App (Removendo o N/A fixo)
    // Se o campo estiver vazio no App, agora aparecerá apenas o tópico vazio, não "NÃO INFORMADO"
    const infoLiga = checklist?.liga;
    const infoTela = checklist?.tela;
    const infoCarcaca = checklist?.carcaca;

    if (status === "FINALIZADO" || status === "ENTREGUE") {
      // MODELO DE CONCLUSÃO (Rápido e Profissional)
      message =
        `${storeHeader}\n\n` +
        `Prezado(a) *${clientName}*,\n` +
        `Informamos que os procedimentos técnicos em seu equipamento foram *CONCLUÍDOS* ✅ com sucesso.\n\n` +
        `📝 *DETALHES DO PROTOCOLO:*\n` +
        `• *ID O.S.:* #${protocolCode}\n` +
        `• *Equipamento:* ${deviceBrand} ${deviceModel}\n` +
        `• *Investimento Total:* R$ ${Number(totalPrice || 0).toFixed(2)}\n\n` +
        `O item já está em nossa unidade física, pronto para retirada pelo titular.\n\n` +
        `${storeFooter}\n\n` +
        `_Agradecemos a confiança em nossos serviços profissionais._`;
    } else {
      // MODELO DE ENTRADA PREMIUM - COM LAUDO EXATO DO APP
      message =
        `${storeHeader}\n\n` +
        `Olá, *${clientName}*.\n` +
        `Confirmamos o registro e a abertura da sua Ordem de Serviço em nosso laboratório.\n\n` +
        `🆔 *PROTOCOLO DIGITAL:* ${protocolCode}\n` +
        `📅 *DATA DE ENTRADA:* ${formattedDate}\n` +
        `📱 *EQUIPAMENTO:* ${deviceBrand} ${deviceModel}\n` +
        `🔴 *PROBLEMA REPORTADO:* ${problem || "Não informado"}\n\n` +
        `🔍 *LAUDO TÉCNICO DE RECEBIMENTO:*\n` +
        `• *Alimentação (Liga):* ${infoLiga || "Aguardando Análise"}\n` +
        `• *Display / Touch:* ${infoTela || "Aguardando Análise"}\n` +
        `• *Integridade Física:* ${infoCarcaca || "Aguardando Análise"}\n\n` +
        `🛡️ *SEGURANÇA:* Seu patrimônio está segurado por nossos protocolos de laboratório. Você receberá atualizações sobre o andamento do diagnóstico.\n\n` +
        `${storeFooter}`;
    }

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
      message,
    )}`;
    window.open(url, "_blank");
  };

  const isCompleted = status === "FINALIZADO" || status === "ENTREGUE";

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
              : "bg-linear-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7a6d] shadow-lg shadow-green-500/30"
        }
      `}
    >
      <MessageCircle size={20} />
      {isCompleted
        ? "Notificar Conclusão do Serviço"
        : "Emitir Protocolo Técnico de Entrada"}
    </button>
  );
};
