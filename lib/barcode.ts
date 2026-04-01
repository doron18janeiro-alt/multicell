export const BARCODE_MIN_LENGTH = 6;

export function normalizeBarcode(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, "").trim();
}

export function isLikelyBarcode(value: string | null | undefined) {
  const normalized = normalizeBarcode(value);

  return normalized.length >= BARCODE_MIN_LENGTH;
}

export function barcodeMatches(
  productBarcode: string | null | undefined,
  input: string | null | undefined,
) {
  const normalizedProductBarcode = normalizeBarcode(productBarcode);
  const normalizedInput = normalizeBarcode(input);

  if (!normalizedProductBarcode || !normalizedInput) {
    return false;
  }

  return normalizedProductBarcode === normalizedInput;
}
