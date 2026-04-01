import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { cancelCompanySubscription } from "@/lib/subscription";
import { sendSubscriptionCancelledEmail } from "@/lib/email";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const email = currentUser.email;

    await cancelCompanySubscription(companyId);
    await sendSubscriptionCancelledEmail({ to: email }).catch((mailError) => {
      console.error("[subscription/cancel:mail] Error:", mailError);
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Assinatura cancelada com sucesso.",
    });
  } catch (error) {
    console.error("[subscription/cancel] Error:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar assinatura." },
      { status: 500 },
    );
  }
}
