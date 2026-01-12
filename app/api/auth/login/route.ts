import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

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

    // 2. Verifica a senha
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    // 3. Define companyId baseado no email (Lógica Multi-tenant Hardcoded por enquanto)
    let companyId = "multicell-oficial"; // default
    if (email === "doron18janeiro@gmail.com") {
      companyId = "outra-empresa";
    }

    // 4. Salva sessão no cookie
    const cookieStore = await cookies();
    const sessionData = JSON.stringify({
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
    console.error(error);
    return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
