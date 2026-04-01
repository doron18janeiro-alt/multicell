"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import {
  buildWhatsAppMessage,
  formatWhatsAppLink,
  resolveServiceOrderButtonLabel,
  resolveServiceOrderMessageKind,
  type WhatsAppChecklistSummary,
  type WhatsAppMessageKind,
} from "@/lib/whatsapp";

interface WhatsAppNotificationProps {
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  problem?: string;
  status?: string;
  osId?: string | number;
  totalPrice?: number | string;
  disabled?: boolean;
  checklist?: WhatsAppChecklistSummary;
  kind?: WhatsAppMessageKind;
  saleItems?: Array<{
    description: string;
    quantity: number;
  }>;
  paymentMethod?: string;
  className?: string;
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
  kind,
  saleItems,
  paymentMethod,
  className = "",
}) => {
  const handleSend = () => {
    if (!clientPhone || !clientName) return;

    const resolvedKind =
      kind || (resolveServiceOrderMessageKind(status) as WhatsAppMessageKind);

    const message = buildWhatsAppMessage(resolvedKind, {
      clientName,
      deviceBrand,
      deviceModel,
      problem,
      osId,
      totalPrice,
      checklist,
      saleItems,
      paymentMethod,
    });

    const url = formatWhatsAppLink(clientPhone, message);
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const buttonLabel =
    kind === "sale" ? "Notificar Venda" : resolveServiceOrderButtonLabel(status);

  return (
    <button
      onClick={handleSend}
      disabled={disabled || !clientPhone}
      className={`
        flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-[#081c10] transition-all
        ${
          disabled
            ? "cursor-not-allowed bg-gray-500 opacity-50 text-white"
            : "bg-[#25D366] hover:bg-[#20bd5a] shadow-lg shadow-green-500/30"
        }
        ${className}
      `}
    >
      <MessageSquare size={18} />
      {buttonLabel}
    </button>
  );
};
