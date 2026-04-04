import type { CompanyConfig, FoodOrderItem } from "@prisma/client";
import {
  FOOD_PENDING_PAYMENT_METHOD,
  getFoodOrderItemResolvedQuantity,
  roundCurrency,
  type PendingItemsSnapshot,
} from "@/lib/food";

export type FoodCheckoutSelection = {
  itemId: string;
};

export const normalizeCheckoutSelections = (
  selections: Array<FoodCheckoutSelection | null | undefined>,
) =>
  selections
    .map((selection) => ({
      itemId: String(selection?.itemId || "").trim(),
    }))
    .filter((selection) => selection.itemId);

export const buildPendingItemsSnapshot = ({
  orderItems,
  selections,
}: {
  orderItems: FoodOrderItem[];
  selections: FoodCheckoutSelection[];
}): PendingItemsSnapshot => {
  const itemsMap = new Map(orderItems.map((item) => [item.id, item]));

  return selections.flatMap((selection) => {
    const item = itemsMap.get(selection.itemId);

    if (!item) {
      return [];
    }

    return [
      {
        itemId: item.id,
        productId: item.productId,
        description: item.description,
        quantity: Math.max(
          Number(item.quantity || 0) - getFoodOrderItemResolvedQuantity(item),
          0,
        ),
        unitPrice: Number(item.unitPrice || 0),
        consumedAt: item.createdAt?.toISOString?.() || null,
      },
    ];
  });
};

export const calculateSelectedItemsAmount = ({
  orderItems,
  selections,
}: {
  orderItems: FoodOrderItem[];
  selections: FoodCheckoutSelection[];
}) => {
  const itemsMap = new Map(orderItems.map((item) => [item.id, item]));

  return roundCurrency(
    selections.reduce((total, selection) => {
      const item = itemsMap.get(selection.itemId);

      if (!item) {
        return total;
      }

      const remainingQuantity = Math.max(
        Number(item.quantity || 0) - getFoodOrderItemResolvedQuantity(item),
        0,
      );

      return total + Number(item.unitPrice || 0) * remainingQuantity;
    }, 0),
  );
};

export const resolveSalePaymentData = ({
  paymentMethod,
  total,
  config,
}: {
  paymentMethod: string;
  total: number;
  config: Pick<CompanyConfig, "debitRate" | "creditRate"> | null;
}) => {
  const normalizedMethod = String(paymentMethod || "").toUpperCase();

  if (
    normalizedMethod === FOOD_PENDING_PAYMENT_METHOD ||
    (normalizedMethod !== "DEBITO" && normalizedMethod !== "CREDITO")
  ) {
    return {
      paymentMethod: normalizedMethod || "DINHEIRO",
      cardType: null as string | null,
      feeAmount: 0,
      netAmount: roundCurrency(total),
    };
  }

  const cardType = normalizedMethod;
  const rate =
    normalizedMethod === "DEBITO"
      ? Number(config?.debitRate ?? 1.99)
      : Number(config?.creditRate ?? 3.99);
  const feeAmount = roundCurrency((total * rate) / 100);

  return {
    paymentMethod: "CARTAO",
    cardType,
    feeAmount,
    netAmount: roundCurrency(total - feeAmount),
  };
};
