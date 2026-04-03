import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  mercadoPagoRequest,
  resolveAppUrl,
  getMercadoPagoPublicKey,
} from "@/lib/mercadopago";
import { DEFAULT_NFE_RECHARGE_AMOUNT } from "@/lib/nfe-wallet";

export const dynamic = "force-dynamic";

const extractCheckoutUrl = (payload: any) =>
  payload?.init_point ||
  payload?.sandbox_init_point ||
  payload?.checkout_url ||
  payload?.checkoutUrl ||
  null;

const normalizeRechargeAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Number(amount.toFixed(2))
    : DEFAULT_NFE_RECHARGE_AMOUNT;
};

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = normalizeRechargeAmount(body?.amount);
    const companyId = currentUser.companyId;
    const appUrl = resolveAppUrl(request.url);
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago?source_news=webhooks`;
    const resultUrl = `${appUrl}/configuracoes/empresa`;
    const externalReference = `company:${companyId}:nfe-wallet:${Date.now()}`;

    const preferencePayload = {
      items: [
        {
          id: `wtm-nfe-wallet-${Math.round(amount * 100)}`,
          title: "World Tech Manager - Recarga de saldo para notas fiscais",
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      metadata: {
        company_id: companyId,
        checkout_type: "nfe_wallet",
        recharge_amount: amount,
        payer_email: currentUser.email,
      },
      payer: {
        email: currentUser.email,
      },
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: {
        success: `${resultUrl}?wallet=approved`,
        pending: `${resultUrl}?wallet=pending`,
        failure: `${resultUrl}?wallet=failed`,
      },
      auto_return: "approved",
      statement_descriptor: "WORLDTECH",
    };

    const preference = await mercadoPagoRequest<any>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(preferencePayload),
    });

    const checkoutUrl = extractCheckoutUrl(preference);

    if (!checkoutUrl) {
      throw new Error(
        "Mercado Pago não retornou URL de checkout para a recarga.",
      );
    }

    return NextResponse.json({
      checkoutUrl,
      amount,
      mpReferenceId: preference.id || null,
      mpPublicKey: getMercadoPagoPublicKey(),
    });
  } catch (error) {
    console.error("[mercadopago/nfe-wallet/checkout] Error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout da carteira de notas." },
      { status: 500 },
    );
  }
}
