import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { newPassword } = await request.json();

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: "admin@multicell.com" }, // Atualiza o seu usuário principal
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return NextResponse.json(
      { error: "Erro ao alterar a senha." },
      { status: 500 }
    );
  }
}
