import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const adminEmail = process.env.ADMIN_EMAIL || "admin@multicell.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === adminEmail && password === adminPassword) {
      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("auth_token", "valid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
