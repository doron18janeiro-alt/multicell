export type WhatsAppChecklistSummary = {
  liga?: string;
  tela?: string;
  carcaca?: string;
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
  return [
    `Olá, *${clientName}*! 👋`,
    ``,
    `Sua *Ordem de Serviço ${formatOrderId(osId)}* foi registrada com sucesso na *Multicell System*.`,
    ``,
    `📱 *Equipamento:* ${formatDevice(deviceBrand, deviceModel)}`,
    `🛠️ *Defeito informado:* ${problem || "Aguardando detalhamento técnico"}`,
    ``,
    `🔎 *Checklist de entrada:*`,
    `• *Liga:* ${checklist?.liga || "Aguardando análise"}`,
    `• *Tela / Touch:* ${checklist?.tela || "Aguardando análise"}`,
    `• *Carcaça:* ${checklist?.carcaca || "Aguardando análise"}`,
    ``,
    `Seguiremos com a análise e novas atualizações serão enviadas por este canal.`,
    ``,
    `*Equipe Multicell System 📱✨*`,
  ].join("\n");
}

function buildReadyMessage({
  clientName,
  deviceBrand,
  deviceModel,
  osId,
  totalPrice,
}: WhatsAppMessagePayload) {
  return [
    `Olá, *${clientName}*! ✅`,
    ``,
    `Sua *Ordem de Serviço ${formatOrderId(osId)}* está *PRONTA* para retirada.`,
    ``,
    `📱 *Equipamento:* ${formatDevice(deviceBrand, deviceModel)}`,
    `💰 *Valor final:* ${formatMoney(totalPrice)}`,
    ``,
    `Se precisar, responda esta mensagem para alinhar retirada ou dúvidas finais.`,
    ``,
    `*Equipe Multicell System 📱✨*`,
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
    `Registramos sua venda com sucesso na *Multicell System*.`,
    ``,
    `🛍️ *Itens:*`,
    itemsSummary,
    ``,
    `💳 *Pagamento:* ${paymentMethod || "A confirmar"}`,
    `💰 *Total:* ${formatMoney(totalPrice)}`,
    ``,
    `Obrigado pela preferência.`,
    ``,
    `*Equipe Multicell System 📱✨*`,
  ].join("\n");
}
