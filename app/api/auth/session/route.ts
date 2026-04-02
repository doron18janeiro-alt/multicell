import { NextResponse } from "next/server";
import { getCurrentUser, getSession, setAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      console.log("[Auth Session] Check:", null, "/api/auth/session", false);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const needsHydration =
      session.user.segment === undefined || session.user.companyName === undefined;

    if (needsHydration) {
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const hydratedSession = {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
        fullName: user.fullName,
        companyName: user.companyName,
        segment: user.segment,
        cpf: user.cpf,
        birthDate: user.birthDate?.toISOString() ?? null,
      };

      await setAuthSession(hydratedSession);

      console.log(
        "[Auth Session] Check:",
        user.role,
        "/api/auth/session",
        true,
      );

      return NextResponse.json(hydratedSession);
    }

    console.log(
      "[Auth Session] Check:",
      session.user.role,
      "/api/auth/session",
      true,
    );

    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      companyId: session.user.companyId,
      role: session.user.role,
      fullName: session.user.fullName,
      companyName: session.user.companyName ?? null,
      segment: session.user.segment ?? null,
      cpf: session.user.cpf ?? null,
      birthDate: session.user.birthDate ?? null,
    });
  } catch (error) {
    console.error("[auth/session] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar sessao." },
      { status: 500 },
    );
  }
}
