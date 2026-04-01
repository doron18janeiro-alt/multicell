import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureCompanySubscription } from "@/lib/subscription";
import {
  mercadoPagoRequest,
  resolveAppUrl,
  getMercadoPagoPublicKey,
} from "@/lib/mercadopago";

export const dynamic = "force-dynamic";

type PlanType = "monthly" | "annual";

const PLAN_PRICES: Record<PlanType, number> = {
  monthly: 99.9,
  annual: 899,
};
const MONTHLY_TRIAL_DAYS = 7;

const getExternalReference = (companyId: string) => companyId;

const getMetadata = (companyId: string, plan: PlanType) => ({
  company_id: companyId,
  plan_type: plan,
});

const extractCheckoutUrl = (payload: any) =>
  payload?.init_point ||
  payload?.sandbox_init_point ||
  payload?.checkout_url ||
  payload?.checkoutUrl ||
  null;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId || "multicell-oficial";
    await ensureCompanySubscription(companyId);

    const { plan } = (await request.json()) as { plan?: PlanType };

    if (plan !== "monthly" && plan !== "annual") {
      return NextResponse.json(
        { error: "Plano inválido. Use 'monthly' ou 'annual'." },
        { status: 400 },
      );
    }

    const appUrl = resolveAppUrl(request.url);
    const externalReference = getExternalReference(companyId);
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago?source_news=webhooks`;
    const checkoutSuccessUrl = `${appUrl}/checkout?status=approved&plan=${plan}`;
    const checkoutPendingUrl = `${appUrl}/checkout?status=pending&plan=${plan}`;
    const checkoutFailureUrl = `${appUrl}/checkout?status=failed&plan=${plan}`;

    if (plan === "monthly") {
      const preapprovalPayload = {
        reason: "Multicell SaaS - Plano Mensal",
        external_reference: externalReference,
        metadata: getMetadata(companyId, plan),
        payer_email: session.user.email,
        auto_recurring: {
          free_trial: {
            frequency: MONTHLY_TRIAL_DAYS,
            frequency_type: "days",
          },
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN_PRICES.monthly,
          currency_id: "BRL",
        },
        back_url: checkoutSuccessUrl,
        status: "pending",
        notification_url: notificationUrl,
      };

      const preapproval = await mercadoPagoRequest<any>("/preapproval", {
        method: "POST",
        body: JSON.stringify(preapprovalPayload),
      });

      const checkoutUrl = extractCheckoutUrl(preapproval);
      if (!checkoutUrl) {
        throw new Error(
          "Mercado Pago não retornou URL de checkout para assinatura mensal.",
        );
      }

      return NextResponse.json({
        checkoutUrl,
        plan,
        mpReferenceId: preapproval.id || null,
        mpPublicKey: getMercadoPagoPublicKey(),
      });
    }

    const preferencePayload = {
      items: [
        {
          id: "multicell-anual",
          title: "Multicell SaaS - Plano Anual",
          quantity: 1,
          currency_id: "BRL",
          unit_price: PLAN_PRICES.annual,
        },
      ],
      metadata: {
        ...getMetadata(companyId, plan),
        payer_email: session.user.email,
      },
      payer: {
        email: session.user.email,
      },
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: {
        success: checkoutSuccessUrl,
        pending: checkoutPendingUrl,
        failure: checkoutFailureUrl,
      },
      auto_return: "approved",
      payment_methods: {
        installments: 12,
      },
      statement_descriptor: "MULTICELL",
    };

    const preference = await mercadoPagoRequest<any>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(preferencePayload),
    });

    const checkoutUrl = extractCheckoutUrl(preference);
    if (!checkoutUrl) {
      throw new Error(
        "Mercado Pago não retornou URL de checkout para o plano anual.",
      );
    }

    return NextResponse.json({
      checkoutUrl,
      plan,
      mpReferenceId: preference.id || null,
      mpPublicKey: getMercadoPagoPublicKey(),
    });
  } catch (error) {
    console.error("[mercadopago/checkout] Error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout do Mercado Pago." },
      { status: 500 },
    );
  }
}
