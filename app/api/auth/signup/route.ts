import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf";
import {
  calculateInitialTrialEndsAt,
  getInitialSubscriptionStatus,
} from "@/lib/billing-mode";
import { setAuthSession } from "@/lib/auth";

const generateCompanyId = () => {
  return `company_${crypto.randomUUID().replace(/-/g, "")}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const cpfRaw = String(body.cpf || "");
    const cpf = sanitizeCpf(cpfRaw);
    const birthDateRaw = String(body.birthDate || "");

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Nome completo inválido." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    const birthDate = new Date(`${birthDateRaw}T12:00:00`);
    if (!birthDateRaw || Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { error: "Data de nascimento inválida." },
        { status: 400 },
      );
    }

    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findFirst({ where: { cpf } }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    if (existingCpf) {
      return NextResponse.json(
        { error: "Este CPF já está cadastrado." },
        { status: 409 },
      );
    }

    const companyId = generateCompanyId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndsAt = calculateInitialTrialEndsAt();
    const initialSubscriptionStatus = getInitialSubscriptionStatus();

    const user = await prisma.$transaction(async (tx) => {
      await tx.company.create({
        data: {
          id: companyId,
          name: "Minha Empresa",
          logoUrl: "/logo.png",
          subscriptionStatus: initialSubscriptionStatus,
          trialEndsAt,
        },
      });

      await tx.companyConfig.create({
        data: {
          companyId,
        },
      });

      return tx.user.create({
        data: {
          name,
          fullName: name,
          email,
          cpf,
          birthDate,
          role: "ADMIN",
          password: hashedPassword,
          companyId,
        },
      });
    });

    await setAuthSession({
      id: user.id,
      email: user.email,
      companyId,
      role: user.role,
      fullName: user.fullName || user.name || null,
      companyName: "Minha Empresa",
      segment: null,
      cpf,
      birthDate: birthDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      companyId,
      segment: null,
      nextPath: "/setup",
      trialEndsAt: trialEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("[auth/signup] Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta." },
      { status: 500 },
    );
  }
}
