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
  commissionRate: { toString(): string } | number;
}) => ({
  id: user.id,
  fullName: user.fullName || user.name || "",
  email: user.email,
  cpf: user.cpf,
  birthDate: user.birthDate?.toISOString() ?? null,
  role: user.role,
  commissionRate: Number(user.commissionRate || 0),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const cpf = sanitizeCpf(String(body.cpf || ""));
    const birthDateRaw = String(body.birthDate || "");
    const commissionRate = Number(body.commissionRate ?? 0);
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

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF invalido." }, { status: 400 });
    }

    const birthDate = new Date(`${birthDateRaw}T12:00:00`);
    if (!birthDateRaw || Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { error: "Data de nascimento invalida." },
        { status: 400 },
      );
    }

    if (role !== "ATTENDANT") {
      return NextResponse.json(
        { error: "Somente atendentes podem ser editados aqui." },
        { status: 400 },
      );
    }

    if (
      Number.isNaN(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return NextResponse.json(
        { error: "Comissão deve estar entre 0 e 100%." },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Funcionario nao encontrado." },
        { status: 404 },
      );
    }

    if (targetUser.role !== "ATTENDANT") {
      return NextResponse.json(
        { error: "Somente atendentes podem ser editados." },
        { status: 400 },
      );
    }

    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findFirst({
        where: {
          email,
          NOT: { id: targetUser.id },
        },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: {
          cpf,
          NOT: { id: targetUser.id },
        },
        select: { id: true },
      }),
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

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        name: fullName,
        fullName,
        email,
        cpf,
        birthDate,
        commissionRate,
        ...(password.length >= 6
          ? { password: await bcrypt.hash(password, 10) }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        name: true,
        email: true,
        cpf: true,
        birthDate: true,
        role: true,
        commissionRate: true,
      },
    });

    return NextResponse.json(serializeUser(updatedUser));
  } catch (error) {
    console.error("[team][PATCH] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar funcionario." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Nao e permitido excluir o proprio usuario." },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Funcionario nao encontrado." },
        { status: 404 },
      );
    }

    if (targetUser.role !== "ATTENDANT") {
      return NextResponse.json(
        { error: "Somente atendentes podem ser excluidos." },
        { status: 400 },
      );
    }

    await prisma.user.delete({
      where: { id: targetUser.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[team][DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir funcionario." },
      { status: 500 },
    );
  }
}
