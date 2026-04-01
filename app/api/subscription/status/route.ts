import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCompanySubscriptionState } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const subscription = await getCompanySubscriptionState(companyId);

    return NextResponse.json({
      companyId: subscription.companyId,
      createdAt: subscription.createdAt.toISOString(),
      trialEndsAt: subscription.trialEndsAt.toISOString(),
      subscriptionStatus: subscription.subscriptionStatus,
      daysRemaining: subscription.daysRemaining,
      isTrialExpired: subscription.isTrialExpired,
      isTrialActive: subscription.isTrialActive,
    });
  } catch (error) {
    console.error("[subscription/status] Error:", error);
    return NextResponse.json(
      { error: "Erro ao consultar assinatura" },
      { status: 500 },
    );
  }
}
