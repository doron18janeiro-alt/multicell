import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.log("[Auth Session] Check:", null, "/api/auth/session", false);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Auth Session] Check:", user.role, "/api/auth/session", true);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      fullName: user.fullName,
      cpf: user.cpf,
      birthDate: user.birthDate?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[auth/session] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar sessao." },
      { status: 500 },
    );
  }
}
