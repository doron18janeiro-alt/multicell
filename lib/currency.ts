const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const extractDigits = (value: string | number | null | undefined) =>
  String(value ?? "").replace(/\D/g, "");

export const formatCurrencyBRL = (value: number) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0);

export const formatBRLCurrencyInput = (
  value: string | number | null | undefined,
) => {
  const digits = extractDigits(value);

  if (!digits) {
    return "";
  }

  return currencyFormatter.format(Number(digits) / 100);
};

export const parseBRLCurrencyInput = (
  value: string | number | null | undefined,
) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return 0;
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const digits = extractDigits(normalized);

  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
};

export const parseBRLCurrencyInputToFixed = (
  value: string | number | null | undefined,
) => parseBRLCurrencyInput(value).toFixed(2);
