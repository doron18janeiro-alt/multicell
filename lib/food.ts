import type {
  FoodOrderStatus,
  PendingAccountStatus,
} from "@prisma/client";

export const FOOD_PENDING_PAYMENT_METHOD = "PENDENTE" as const;

export const FOOD_PAYMENT_METHODS = [
  "DINHEIRO",
  "PIX",
  "DEBITO",
  "CREDITO",
  FOOD_PENDING_PAYMENT_METHOD,
] as const;

export type FoodPaymentMethod = (typeof FOOD_PAYMENT_METHODS)[number];

export type FoodOrderFinancialItem = {
  quantity: number;
  unitPrice: number;
};

export type PendingItemsSnapshot = Array<{
  itemId?: string | null;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  consumedAt?: string | null;
}>;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const roundCurrency = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const formatCurrency = (value: number) =>
  currencyFormatter.format(roundCurrency(value));

export const normalizeTableNumber = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const normalizeOptionalText = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const normalizeOptionalDate = (value: unknown) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T12:00:00.000-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isFoodPaymentMethod = (value: unknown): value is FoodPaymentMethod =>
  FOOD_PAYMENT_METHODS.includes(String(value || "").toUpperCase() as FoodPaymentMethod);

export const resolvePaymentMethodLabel = (paymentMethod: string | null | undefined) => {
  const normalized = String(paymentMethod || "").toUpperCase();

  if (normalized === "DINHEIRO") return "Dinheiro";
  if (normalized === "PIX") return "Pix";
  if (normalized === "DEBITO") return "Cartão Débito";
  if (normalized === "CREDITO") return "Cartão Crédito";
  if (normalized === FOOD_PENDING_PAYMENT_METHOD) return "Pendente";

  return paymentMethod || "Não informado";
};

export const calculateFoodOrderFinancials = ({
  items,
  paidAmount = 0,
  pendingTransferredAmount = 0,
}: {
  items: FoodOrderFinancialItem[];
  paidAmount?: number;
  pendingTransferredAmount?: number;
}) => {
  const total = roundCurrency(
    items.reduce((acc, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      return acc + quantity * unitPrice;
    }, 0),
  );
  const resolved = roundCurrency(
    Number(paidAmount || 0) + Number(pendingTransferredAmount || 0),
  );
  const balanceDue = roundCurrency(Math.max(total - resolved, 0));

  let status: FoodOrderStatus = "ABERTA";

  if (balanceDue <= 0) {
    status = "FECHADA";
  } else if (resolved > 0) {
    status = "PARCIAL";
  }

  return {
    total,
    resolved,
    balanceDue,
    status,
  };
};

export const resolvePendingStatus = (
  status: PendingAccountStatus | string | null | undefined,
  dueDate: Date | string | null | undefined,
) => {
  const normalized = String(status || "ABERTO").toUpperCase() as PendingAccountStatus;

  if (normalized === "PAGO") {
    return "PAGO" as const;
  }

  if (!dueDate) {
    return normalized === "VENCIDO" ? "VENCIDO" : "ABERTO";
  }

  const today = new Date();
  const todayKey = new Date(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00.000-03:00`,
  );
  const dueKey =
    dueDate instanceof Date
      ? new Date(
          `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}T00:00:00.000-03:00`,
        )
      : new Date(`${String(dueDate).slice(0, 10)}T00:00:00.000-03:00`);

  if (Number.isNaN(dueKey.getTime())) {
    return normalized === "VENCIDO" ? "VENCIDO" : "ABERTO";
  }

  return dueKey.getTime() < todayKey.getTime() ? "VENCIDO" : "ABERTO";
};

export const buildPendingItemsSummary = (items: PendingItemsSnapshot) => {
  const summary = items
    .slice(0, 6)
    .map((item) => `${item.quantity}x ${item.description}`)
    .join(", ");

  return summary || "Consumos registrados no sistema";
};

export const buildFoodPendingWhatsAppMessage = ({
  clientName,
  companyName,
  amount,
  items,
}: {
  clientName: string;
  companyName: string;
  amount: number;
  items: PendingItemsSnapshot;
}) => {
  return [
    `Olá ${clientName}, aqui é do ${companyName}.`,
    `Passando para informar que seu extrato de consumo atualizado está em ${formatCurrency(amount)}.`,
    `Detalhes: ${buildPendingItemsSummary(items)}.`,
    "Até breve!",
  ].join(" ");
};
