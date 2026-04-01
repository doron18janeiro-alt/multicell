const MP_API_BASE_URL = "https://api.mercadopago.com";

const normalizeEnvValue = (value?: string) => {
  return String(value || "")
    .replace(/\\r|\\n/g, "")
    .replace(/\r|\n/g, "")
    .trim();
};

export function getMercadoPagoAccessToken() {
  const token = normalizeEnvValue(process.env.MP_ACCESS_TOKEN);
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN não configurado no ambiente.");
  }
  return token;
}

export function getMercadoPagoPublicKey() {
  return normalizeEnvValue(process.env.MP_PUBLIC_KEY);
}

export async function mercadoPagoRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const accessToken = getMercadoPagoAccessToken();

  const response = await fetch(`${MP_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[MercadoPago] ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json() as Promise<TResponse>;
}

export function resolveAppUrl(requestUrl?: string) {
  const publicAppUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  const authAppUrl = normalizeEnvValue(process.env.NEXTAUTH_URL);

  if (publicAppUrl) return publicAppUrl.replace(/\/$/, "");
  if (authAppUrl) return authAppUrl.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin.replace(/\/$/, "");
  return "http://localhost:3000";
}
