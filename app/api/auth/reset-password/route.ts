import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const findUserByResetToken = (token: string) => {
  return prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: {
        gt: new Date(),
      },
    },
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    const user = await findUserByResetToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, valid: true });
  } catch (error) {
    console.error("[auth/reset-password:validate] Error:", error);
    return NextResponse.json(
      { error: "Erro ao validar token de redefinição." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    const user = await findUserByResetToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha." },
      { status: 500 },
    );
  }
}
