export type WhatsAppChecklistSummary = {
  assetType?: "vehicle";
  liga?: string;
  tela?: string;
  carcaca?: string;
  plate?: string;
  fuelLevel?: string;
  mileage?: string;
  color?: string;
  externalDamage?: string;
};

export type WhatsAppMessageKind = "entry" | "ready" | "sale";

type WhatsAppMessagePayload = {
  clientName: string;
  deviceBrand?: string;
  deviceModel?: string;
  problem?: string;
  osId?: string | number;
  totalPrice?: number | string | null;
  checklist?: WhatsAppChecklistSummary;
  saleItems?: Array<{
    description: string;
    quantity: number;
  }>;
  paymentMethod?: string | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function sanitizePhoneNumber(phone: string | null | undefined) {
  return String(phone || "").replace(/\D/g, "");
}

export function formatWhatsAppPhone(phone: string | null | undefined) {
  const digits = sanitizePhoneNumber(phone);

  if (!digits) {
    return "";
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function formatWhatsAppLink(
  phone: string | null | undefined,
  message: string,
) {
  const normalizedPhone = formatWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return "";
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function resolveServiceOrderMessageKind(status?: string): "entry" | "ready" {
  const normalizedStatus = String(status || "").toUpperCase();

  return ["PRONTO", "FINALIZADO", "ENTREGUE"].includes(normalizedStatus)
    ? "ready"
    : "entry";
}

export function resolveServiceOrderButtonLabel(status?: string) {
  return resolveServiceOrderMessageKind(status) === "ready"
    ? "Notificar Pronto"
    : "Notificar Entrada";
}

export function buildSupplierRestockMessage(productName: string) {
  return `Olá, preciso repor o item ${productName}. Temos em estoque?`;
}

export function buildWhatsAppMessage(
  kind: WhatsAppMessageKind,
  payload: WhatsAppMessagePayload,
) {
  switch (kind) {
    case "ready":
      return buildReadyMessage(payload);
    case "sale":
      return buildSaleMessage(payload);
    case "entry":
    default:
      return buildEntryMessage(payload);
  }
}

function formatDevice(deviceBrand?: string, deviceModel?: string) {
  return [deviceBrand, deviceModel].filter(Boolean).join(" ").trim() || "Equipamento não informado";
}

function formatTrackedAsset(
  deviceBrand?: string,
  deviceModel?: string,
  checklist?: WhatsAppChecklistSummary,
) {
  if (checklist?.assetType === "vehicle") {
    const vehicleLabel =
      [deviceBrand, deviceModel].filter(Boolean).join(" ").trim() ||
      "Veículo não informado";

    return `${vehicleLabel}${checklist.plate ? ` (${checklist.plate})` : ""}`;
  }

  return formatDevice(deviceBrand, deviceModel);
}

function formatMoney(value?: number | string | null) {
  const numericValue = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatOrderId(osId?: string | number) {
  return osId ? `#${osId}` : "em processamento";
}

function buildEntryMessage({
  clientName,
  deviceBrand,
  deviceModel,
  problem,
  osId,
  checklist,
}: WhatsAppMessagePayload) {
  if (checklist?.assetType === "vehicle") {
    return [
      `Olá, *${clientName}*! 👋`,
      ``,
      `Sua *Ordem de Serviço ${formatOrderId(osId)}* foi registrada com sucesso na *World Tech Manager*.`,
      ``,
      `🚗 *Veículo:* ${formatTrackedAsset(deviceBrand, deviceModel, checklist)}`,
      `🔧 *Serviço solicitado:* ${problem || "Aguardando detalhamento técnico"}`,
      ``,
      `📋 *Check-in de entrada:*`,
      `• *Combustível:* ${checklist.fuelLevel || "Não informado"}`,
      `• *KM Atual:* ${checklist.mileage || "Não informado"}`,
      `• *Cor:* ${checklist.color || "Não informada"}`,
      `• *Avarias:* ${checklist.externalDamage || "Sem observações"}`,
      ``,
      `Seguiremos com a análise e novas atualizações serão enviadas por este canal.`,
      ``,
      `*Equipe World Tech Manager*`,
    ].join("\n");
  }

  return [
    `Olá, *${clientName}*! 👋`,
    ``,
    `Sua *Ordem de Serviço ${formatOrderId(osId)}* foi registrada com sucesso na *World Tech Manager*.`,
    ``,
    `📱 *Equipamento:* ${formatTrackedAsset(deviceBrand, deviceModel, checklist)}`,
    `🛠️ *Defeito informado:* ${problem || "Aguardando detalhamento técnico"}`,
    ``,
    `🔎 *Checklist de entrada:*`,
    `• *Liga:* ${checklist?.liga || "Aguardando análise"}`,
    `• *Tela / Touch:* ${checklist?.tela || "Aguardando análise"}`,
    `• *Carcaça:* ${checklist?.carcaca || "Aguardando análise"}`,
    ``,
    `Seguiremos com a análise e novas atualizações serão enviadas por este canal.`,
    ``,
    `*Equipe World Tech Manager 📱✨*`,
  ].join("\n");
}

function buildReadyMessage({
  clientName,
  deviceBrand,
  deviceModel,
  osId,
  totalPrice,
  checklist,
}: WhatsAppMessagePayload) {
  if (checklist?.assetType === "vehicle") {
    return [
      `Olá, *${clientName}*! ✅`,
      ``,
      `Sua *Ordem de Serviço ${formatOrderId(osId)}* está *PRONTA* para retirada.`,
      ``,
      `🚗 *Veículo:* ${formatTrackedAsset(deviceBrand, deviceModel, checklist)}`,
      `💰 *Valor final:* ${formatMoney(totalPrice)}`,
      ``,
      `Se precisar, responda esta mensagem para alinhar retirada ou dúvidas finais.`,
      ``,
      `*Equipe World Tech Manager*`,
    ].join("\n");
  }

  return [
    `Olá, *${clientName}*! ✅`,
    ``,
    `Sua *Ordem de Serviço ${formatOrderId(osId)}* está *PRONTA* para retirada.`,
    ``,
    `📱 *Equipamento:* ${formatTrackedAsset(deviceBrand, deviceModel, checklist)}`,
    `💰 *Valor final:* ${formatMoney(totalPrice)}`,
    ``,
    `Se precisar, responda esta mensagem para alinhar retirada ou dúvidas finais.`,
    ``,
    `*Equipe World Tech Manager 📱✨*`,
  ].join("\n");
}

function buildSaleMessage({
  clientName,
  totalPrice,
  saleItems,
  paymentMethod,
}: WhatsAppMessagePayload) {
  const itemsSummary =
    saleItems && saleItems.length > 0
      ? saleItems
          .map((item) => `• ${item.quantity}x ${item.description}`)
          .join("\n")
      : "• Itens registrados no sistema";

  return [
    `Olá, *${clientName}*! 🧾`,
    ``,
    `Registramos sua venda com sucesso na *World Tech Manager*.`,
    ``,
    `🛍️ *Itens:*`,
    itemsSummary,
    ``,
    `💳 *Pagamento:* ${paymentMethod || "A confirmar"}`,
    `💰 *Total:* ${formatMoney(totalPrice)}`,
    ``,
    `Obrigado pela preferência.`,
    ``,
    `*Equipe World Tech Manager 📱✨*`,
  ].join("\n");
}
