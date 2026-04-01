import { prisma } from "@/lib/prisma";
import {
  calculateInitialTrialEndsAt,
  getInitialSubscriptionStatus,
  REQUIRE_ACTIVE_SUBSCRIPTION,
  TRIAL_DAYS,
} from "@/lib/billing-mode";

export type CompanySubscriptionStatus =
  | "trialing"
  | "active"
  | "expired"
  | "unpaid"
  | "canceled";

export interface CompanySubscriptionState {
  companyId: string;
  createdAt: Date;
  trialEndsAt: Date;
  subscriptionStatus: CompanySubscriptionStatus;
  daysRemaining: number;
  isTrialExpired: boolean;
  isTrialActive: boolean;
}

const computeDaysRemaining = (trialEndsAt: Date) => {
  const diffMs = trialEndsAt.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const resolveTrialEndsAtFromCreatedAt = (createdAt: Date) => {
  const trialEndsAt = new Date(createdAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  return trialEndsAt;
};

const normalizeSubscriptionStatus = (
  status: string,
): CompanySubscriptionStatus => {
  if (status === "active") return "active";
  if (status === "expired") return "expired";
  if (status === "unpaid") return "unpaid";
  if (status === "canceled") return "canceled";
  return "trialing";
};

export async function ensureCompanySubscription(companyId: string) {
  return prisma.company.upsert({
    where: { id: companyId },
    update: {},
    create: {
      id: companyId,
      name: companyId,
      trialEndsAt: calculateInitialTrialEndsAt(),
      subscriptionStatus: getInitialSubscriptionStatus(),
    },
  });
}

export async function getCompanySubscriptionState(
  companyId: string,
): Promise<CompanySubscriptionState> {
  const company = await ensureCompanySubscription(companyId);
  const createdAt = new Date(company.createdAt);
  const trialEndsAt =
    company.subscriptionStatus === "active"
      ? new Date(company.trialEndsAt)
      : resolveTrialEndsAtFromCreatedAt(createdAt);
  const isTrialExpired = Date.now() > trialEndsAt.getTime();
  const daysRemaining = computeDaysRemaining(trialEndsAt);

  let subscriptionStatus = normalizeSubscriptionStatus(company.subscriptionStatus);

  if (
    !REQUIRE_ACTIVE_SUBSCRIPTION &&
    subscriptionStatus !== "active" &&
    subscriptionStatus !== "canceled"
  ) {
    const nextTrialStatus: CompanySubscriptionStatus = isTrialExpired
      ? "expired"
      : "trialing";

    if (nextTrialStatus !== company.subscriptionStatus) {
      await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: nextTrialStatus },
      });
    }

    subscriptionStatus = nextTrialStatus;
  }

  return {
    companyId,
    createdAt,
    trialEndsAt,
    subscriptionStatus,
    daysRemaining,
    isTrialExpired,
    isTrialActive:
      subscriptionStatus !== "active" &&
      subscriptionStatus !== "canceled" &&
      !isTrialExpired,
  };
}

export async function activateCompanySubscription(
  companyId: string,
  mpSubscriptionId?: string | null,
) {
  await ensureCompanySubscription(companyId);

  return prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: "active",
      mpSubscriptionId: mpSubscriptionId || null,
    },
  });
}

export async function expireCompanySubscription(companyId: string) {
  const nextStatus: CompanySubscriptionStatus = REQUIRE_ACTIVE_SUBSCRIPTION
    ? "unpaid"
    : (await getCompanySubscriptionState(companyId)).isTrialExpired
      ? "expired"
      : "trialing";

  return prisma.company.update({
    where: { id: companyId },
    data: { subscriptionStatus: nextStatus },
  });
}

export async function cancelCompanySubscription(companyId: string) {
  await ensureCompanySubscription(companyId);

  return prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: "canceled",
      mpSubscriptionId: null,
    },
  });
}
