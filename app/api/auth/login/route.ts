import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  ensureCompanySubscription,
  getCompanySubscriptionState,
} from "@/lib/subscription";
import { createAuthSessionSnapshot, setAuthSession } from "@/lib/auth";

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
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        fullName: true,
        name: true,
        companyId: true,
        cpf: true,
        birthDate: true,
        company: {
          select: {
            name: true,
            segment: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    // 2. Obtém companyId do banco
    const companyId = user.companyId;

    // 2.1 Garante provisioning do SaaS para empresa nova
    await ensureCompanySubscription(companyId);
    const subscription = await getCompanySubscriptionState(companyId);

    if (subscription.subscriptionStatus === "canceled") {
      return NextResponse.json(
        {
          error:
            "Assinatura cancelada. Realize um novo pagamento para reativar seu acesso.",
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
    const sessionSnapshot = createAuthSessionSnapshot({
      id: user.id, // Add ID to session
      email: user.email,
      companyId: companyId,
      role: user.role,
      fullName: user.fullName || user.name || null,
      companyName: user.company?.name || null,
      segment: user.company?.segment || null,
      cpf: user.cpf,
      birthDate: user.birthDate?.toISOString() ?? null,
    });
    await setAuthSession(sessionSnapshot);

    return NextResponse.json({
      success: true,
      companyId,
      segment: user.company?.segment || null,
      isDeveloper: sessionSnapshot.isDeveloper,
      nextPath:
        user.company?.segment || sessionSnapshot.isDeveloper
          ? "/dashboard"
          : "/setup",
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor. Verifique os logs." },
      { status: 500 }
    );
  }
}
