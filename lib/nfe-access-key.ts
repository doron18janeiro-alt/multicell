export const NFE_ACCESS_KEY_LENGTH = 44;

const DIGITS_ONLY_REGEX = /\D+/g;
const ACCESS_KEY_REGEX = /(\d{44})/;

export const normalizeNfeAccessKey = (value: string | null | undefined) => {
  const digits = String(value || "").replace(DIGITS_ONLY_REGEX, "").trim();
  return digits.length === NFE_ACCESS_KEY_LENGTH ? digits : "";
};

export const extractNfeAccessKey = (value: string | null | undefined) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const direct = normalizeNfeAccessKey(raw);

  if (direct) {
    return direct;
  }

  try {
    const parsedUrl = new URL(raw);
    const fromQuery =
      parsedUrl.searchParams.get("chNFe") ||
      parsedUrl.searchParams.get("chave") ||
      parsedUrl.searchParams.get("p");

    const queryDirect = normalizeNfeAccessKey(fromQuery);

    if (queryDirect) {
      return queryDirect;
    }

    const compactMatch = String(fromQuery || "").match(ACCESS_KEY_REGEX);
    if (compactMatch?.[1]) {
      return compactMatch[1];
    }
  } catch {}

  const rawMatch = raw.match(ACCESS_KEY_REGEX);
  return rawMatch?.[1] || "";
};

