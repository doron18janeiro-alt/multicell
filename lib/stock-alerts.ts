import { isVehicleCategory } from "@/lib/segment-specialization";

type StockThresholdShape = {
  stock?: number | string | null;
  minStock?: number | string | null;
  minQuantity?: number | string | null;
  min_stock?: number | string | null;
  min_quantity?: number | string | null;
  category?: string | null;
};

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function resolveProductMinStock(product: StockThresholdShape) {
  const minQuantity = toPositiveNumber(
    product.minQuantity ?? product.min_quantity,
  );
  const minStock = toPositiveNumber(product.minStock ?? product.min_stock);

  return minQuantity || minStock || 0;
}

export function isProductLowStock(product: StockThresholdShape) {
  if (isVehicleCategory(product.category)) {
    return false;
  }

  const stock = Number(product.stock ?? 0);
  return stock <= resolveProductMinStock(product);
}
