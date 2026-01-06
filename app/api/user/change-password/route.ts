import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { newPassword } = await request.json();

    await prisma.user.update({
      where: { email: "admin@multicell.com" }, // Atualiza o seu usuário principal
      data: { password: newPassword },
    });

    return NextResponse.json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao alterar a senha." },
      { status: 500 }
    );
  }
}
