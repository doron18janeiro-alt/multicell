import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  ensureCompanySubscription,
  getCompanySubscriptionState,
} from "@/lib/subscription";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    // 1. Busca usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    // 2. Obtém companyId do banco ou usa fallback
    const companyId = user.companyId || "multicell-oficial";

    // 2.1 Garante provisioning do SaaS para empresa nova
    await ensureCompanySubscription(companyId);
    const subscription = await getCompanySubscriptionState(companyId);

    if (subscription.subscriptionStatus === "canceled") {
      return NextResponse.json(
        {
          error:
            "Assinatura cancelada. Para voltar ao ecossistema, realize um novo pagamento.",
        },
        { status: 403 },
      );
    }

    // 3. Verifica a senha
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    // 4. Salva sessão no cookie
    const cookieStore = await cookies();
    const sessionData = JSON.stringify({
      id: user.id, // Add ID to session
      email: user.email,
      companyId: companyId,
    });

    cookieStore.set("auth_token", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ success: true, companyId });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor. Verifique os logs." },
      { status: 500 }
    );
  }
}
