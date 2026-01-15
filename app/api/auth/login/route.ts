import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Log de Diagnóstico DB
    try {
      await prisma.$connect();
      console.log("✅ Conexão com DB estabelecida com sucesso.");
    } catch (dbError) {
      console.error("❌ Erro ao conectar no DB:", dbError);
      return NextResponse.json(
        { error: "Erro de conexão com banco de dados" },
        { status: 500 }
      );
    }

    // 1. Busca usuário no banco
    console.log(`🔍 Buscando usuário: ${email}`);
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

    // 3. Obtém companyId do banco ou usa fallback
    const companyId = user.companyId || "multicell-oficial";

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
  } catch (error: any) {
    console.error("Erro crítico no login:", error);
    // Log detalhado para depuração na Vercel
    console.error("Detalhes do erro:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Erro interno no servidor. Verifique os logs." },
      { status: 500 }
    );
  }
}
