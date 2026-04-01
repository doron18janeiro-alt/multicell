import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_HOURS = 2;

const resolveAppUrl = (requestUrl: string) => {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(requestUrl).origin;

  return appUrl.replace(/\/$/, "");
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Resposta neutra para não vazar existência de conta
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Se o e-mail existir, enviaremos um link de recuperação.",
      });
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + RESET_TOKEN_HOURS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires,
      },
    });

    const appUrl = resolveAppUrl(request.url);
    const resetUrl = `${appUrl}/reset-password/${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: email,
      resetUrl,
    });

    return NextResponse.json({
      success: true,
      message: "E-mail de recuperação enviado.",
    });
  } catch (error) {
    console.error("[auth/forgot-password] Error:", error);
    return NextResponse.json(
      { error: "Erro ao processar recuperação de senha." },
      { status: 500 },
    );
  }
}
