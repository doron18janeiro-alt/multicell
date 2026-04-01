import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldBlockSubscriptionAccess } from "@/lib/billing-mode";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token");
  const { pathname } = request.nextUrl;

  // Rotas públicas
  if (
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/consulta") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Redireciona para o login se não houver token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Escudo de assinatura: bloqueia acesso ao dashboard sem assinatura ativa
  try {
    const subscriptionResponse = await fetch(
      new URL("/api/subscription/status", request.url),
      {
        method: "GET",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      },
    );

    if (subscriptionResponse.status === 401) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (subscriptionResponse.ok) {
      const subscription = await subscriptionResponse.json();

      if (subscription.subscriptionStatus === "canceled") {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("auth_token");
        return response;
      }

      const mustBlock = shouldBlockSubscriptionAccess({
        subscriptionStatus: subscription.subscriptionStatus,
        isTrialExpired: subscription.isTrialExpired === true,
      });

      if (mustBlock) {
        return NextResponse.redirect(new URL("/checkout", request.url));
      }
    }
  } catch (error) {
    console.error("[proxy] Falha ao validar assinatura:", error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};
