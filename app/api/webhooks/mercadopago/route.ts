import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  activateCompanySubscription,
  expireCompanySubscription,
} from "@/lib/subscription";
import { mercadoPagoRequest } from "@/lib/mercadopago";
import { DEFAULT_NFE_RECHARGE_AMOUNT } from "@/lib/nfe-wallet";

export const dynamic = "force-dynamic";

const parseCompanyIdFromExternalReference = (
  externalReference?: string | number | null,
) => {
  if (!externalReference) return null;

  const normalizedReference = String(externalReference).trim();
  if (!normalizedReference) return null;

  const match = normalizedReference.match(/company:([^:]+)/);
  if (match?.[1]) return match[1];

  return normalizedReference;
};

const normalizeNotificationType = (rawType: string) => {
  if (rawType === "payment") return "payment";

  if (
    rawType === "preapproval" ||
    rawType === "subscription_preapproval" ||
    rawType === "plan"
  ) {
    return "preapproval";
  }

  if (rawType.startsWith("payment.")) return "payment";

  if (
    rawType.startsWith("preapproval.") ||
    rawType.startsWith("subscription_preapproval.") ||
    rawType.startsWith("plan.")
  ) {
    return "preapproval";
  }

  return "";
};

const acknowledgeWebhook = (payload: Record<string, unknown>) => {
  return NextResponse.json(payload, { status: 200 });
};

const resolveActionType = (body: any) => {
  if (!body?.action || typeof body.action !== "string") return "";

  const [actionType] = body.action.split(".");
  return actionType || "";
};

const resolveNotificationType = (
  searchParams: URLSearchParams,
  body: any,
): string => {
  const rawType =
    searchParams.get("type") ||
    searchParams.get("topic") ||
    body?.type ||
    body?.topic ||
    resolveActionType(body) ||
    "";

  return normalizeNotificationType(rawType);
};

const resolveDataId = (searchParams: URLSearchParams, body: any) => {
  const resource = String(body?.resource || "").trim();
  const resourceIdFromPath = resource.split("/").filter(Boolean).pop();

  return (
    body?.data?.id ||
    body?.id ||
    searchParams.get("data.id") ||
    searchParams.get("preapproval_id") ||
    searchParams.get("payment_id") ||
    resourceIdFromPath ||
    searchParams.get("id") ||
    null
  );
};

const resolveCompanyId = (
  metadata: { company_id?: string } | null | undefined,
  externalReference?: string | number | null,
) => {
  return metadata?.company_id || parseCompanyIdFromExternalReference(externalReference);
};

const isApprovedStatus = (status?: string | null) => {
  return (
    status === "approved" ||
    status === "authorized" ||
    status === "active"
  );
};

const isRejectedStatus = (status?: string | null) => {
  return (
    status === "cancelled" ||
    status === "rejected" ||
    status === "refunded" ||
    status === "charged_back" ||
    status === "paused"
  );
};

const getResourcePath = (notificationType: string, resourceId: string) => {
  if (notificationType === "payment") {
    return `/v1/payments/${resourceId}`;
  }

  return `/preapproval/${resourceId}`;
};

const getResourceId = (resource: any, fallbackId: string) => {
  return String(resource?.id || fallbackId);
};

const getResourceStatus = (resource: any) => {
  return String(resource?.status || "");
};

const parseRequestBody = async (request: Request) => {
  const rawBody = await request.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
};

const isWalletRechargeResource = (resource: any) =>
  String(resource?.metadata?.checkout_type || "").trim() === "nfe_wallet";

const resolveRechargeAmount = (resource: any) => {
  const metadataAmount = Number(resource?.metadata?.recharge_amount);
  if (Number.isFinite(metadataAmount) && metadataAmount > 0) {
    return Number(metadataAmount.toFixed(2));
  }

  const transactionAmount = Number(resource?.transaction_amount);
  if (Number.isFinite(transactionAmount) && transactionAmount > 0) {
    return Number(transactionAmount.toFixed(2));
  }

  return DEFAULT_NFE_RECHARGE_AMOUNT;
};

async function syncWalletRecharge(resource: any, fallbackId?: string) {
  const companyId = resolveCompanyId(
    resource?.metadata,
    resource?.external_reference,
  );

  if (!companyId) return;

  const mpPaymentId = String(resource?.id || fallbackId || "").trim();
  if (!mpPaymentId) return;

  const status = getResourceStatus(resource);
  const amount = resolveRechargeAmount(resource);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.nfeWalletRecharge.findUnique({
      where: { mpPaymentId },
    });

    await tx.nfeWalletRecharge.upsert({
      where: { mpPaymentId },
      update: {
        status,
        amount,
      },
      create: {
        companyId,
        mpPaymentId,
        amount,
        status,
      },
    });

    if (isApprovedStatus(status) && existing?.status !== "approved") {
      await tx.company.update({
        where: { id: companyId },
        data: {
          nfeBalance: {
            increment: amount,
          },
        },
      });
    }
  });
}

const isSimulationAllowed = () => process.env.NODE_ENV !== "production";

const isSimulationPayload = (body: any) => {
  const notificationType = normalizeNotificationType(
    String(body?.type || body?.topic || resolveActionType(body) || ""),
  );

  return (
    isSimulationAllowed() &&
    !!notificationType &&
    typeof body?.status === "string" &&
    !!resolveCompanyId(body?.metadata, body?.external_reference)
  );
};

async function processSimulationPayload(body: any) {
  if (isWalletRechargeResource(body)) {
    await syncWalletRecharge(body);
    return;
  }

  const companyId = resolveCompanyId(body?.metadata, body?.external_reference);
  const status = getResourceStatus(body);
  const referenceId = String(body?.id || body?.external_reference || companyId);

  if (!companyId) return;

  if (isApprovedStatus(status)) {
    await activateCompanySubscription(companyId, referenceId);
    return;
  }

  if (isRejectedStatus(status)) {
    await expireCompanySubscription(companyId);
  }
}

async function processNotification(notificationType: string, resourceId: string) {
  const resource = await mercadoPagoRequest<any>(
    getResourcePath(notificationType, resourceId),
    {
      method: "GET",
    },
  );

  if (notificationType === "payment" && isWalletRechargeResource(resource)) {
    await syncWalletRecharge(resource, resourceId);
    return;
  }

  const companyId = resolveCompanyId(
    resource?.metadata,
    resource?.external_reference,
  );

  if (!companyId) return;

  const status = getResourceStatus(resource);
  const referenceId = getResourceId(resource, resourceId);

  if (isApprovedStatus(status)) {
    await activateCompanySubscription(companyId, referenceId);
    return;
  }

  if (isRejectedStatus(status)) {
    await expireCompanySubscription(companyId);
  }
}

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  try {
    const body = await parseRequestBody(request);
    const notificationType = resolveNotificationType(searchParams, body);
    const dataId = resolveDataId(searchParams, body);

    if (isSimulationPayload(body)) {
      await processSimulationPayload(body);

      return acknowledgeWebhook({
        received: true,
        simulated: true,
        type: normalizeNotificationType(String(body?.type || body?.topic || "")),
      });
    }

    if (!notificationType || !dataId) {
      return acknowledgeWebhook({ received: true, ignored: true });
    }

    await processNotification(notificationType, String(dataId));

    return acknowledgeWebhook({
      received: true,
      type: notificationType,
      resourceId: String(dataId),
    });
  } catch (error) {
    console.error("[webhooks/mercadopago] Error:", error);

    // O Mercado Pago deve sempre receber 200 para evitar retentativas desnecessarias.
    return acknowledgeWebhook({
      received: true,
      errorLogged: true,
    });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "mercadopago" });
}
