import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf";

const serializeUser = (user: {
  id: string;
  fullName: string | null;
  name: string | null;
  email: string;
  cpf: string | null;
  birthDate: Date | null;
  role: "ADMIN" | "ATTENDANT";
}) => ({
  id: user.id,
  fullName: user.fullName || user.name || "",
  email: user.email,
  cpf: user.cpf,
  birthDate: user.birthDate?.toISOString() ?? null,
  role: user.role,
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        companyId: currentUser.companyId,
        role: "ATTENDANT",
      },
      orderBy: {
        fullName: "asc",
      },
      select: {
        id: true,
        fullName: true,
        name: true,
        email: true,
        cpf: true,
        birthDate: true,
        role: true,
      },
    });

    return NextResponse.json(users.map(serializeUser));
  } catch (error) {
    console.error("[team][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar equipe." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const cpf = sanitizeCpf(String(body.cpf || ""));
    const birthDateRaw = String(body.birthDate || "");
    const role = String(body.role || "ATTENDANT")
      .trim()
      .toUpperCase();

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { error: "Nome completo invalido." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF invalido." }, { status: 400 });
    }

    if (role !== "ATTENDANT") {
      return NextResponse.json(
        { error: "Somente atendentes podem ser cadastrados aqui." },
        { status: 400 },
      );
    }

    const birthDate = new Date(`${birthDateRaw}T12:00:00`);
    if (!birthDateRaw || Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { error: "Data de nascimento invalida." },
        { status: 400 },
      );
    }

    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findFirst({ where: { cpf } }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este e-mail ja esta cadastrado." },
        { status: 409 },
      );
    }

    if (existingCpf) {
      return NextResponse.json(
        { error: "Este CPF ja esta cadastrado." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        fullName,
        email,
        cpf,
        birthDate,
        role: "ATTENDANT",
        password: hashedPassword,
        companyId: currentUser.companyId,
      },
      select: {
        id: true,
        fullName: true,
        name: true,
        email: true,
        cpf: true,
        birthDate: true,
        role: true,
      },
    });

    return NextResponse.json(serializeUser(user), { status: 201 });
  } catch (error) {
    console.error("[team][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar funcionario." },
      { status: 500 },
    );
  }
}
