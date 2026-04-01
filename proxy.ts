import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldBlockSubscriptionAccess } from "@/lib/billing-mode";

const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/recuperar",
  "/checkout",
  "/consulta",
] as const;

const OPERATIONAL_PATHS = [
  "/dashboard",
  "/os",
  "/vendas",
  "/financeiro",
  "/relatorios",
  "/configuracoes",
  "/estoque",
  "/clientes",
] as const;

const ATTENDANT_ALLOWED_PATHS = [
  "/dashboard",
  "/os",
  "/vendas",
  "/estoque",
  "/clientes",
] as const;

const matchesPath = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token");
  const { pathname } = request.nextUrl;

  // Rotas públicas
  if (
    PUBLIC_PATHS.some((route) => matchesPath(pathname, route)) ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Redireciona para o login se não houver token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let role: string | null = null;
  let sessionAuthorized = false;
  const isOperationalPath = OPERATIONAL_PATHS.some((route) =>
    matchesPath(pathname, route),
  );

  try {
    const sessionResponse = await fetch(
      new URL("/api/auth/session", request.url),
      {
        method: "GET",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      },
    );

    if (sessionResponse.status === 401) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (sessionResponse.ok) {
      const session = await sessionResponse.json();
      role = session.role || null;
      sessionAuthorized =
        !isOperationalPath ||
        role === "ADMIN" ||
        (role === "ATTENDANT" &&
          ATTENDANT_ALLOWED_PATHS.some((route) => matchesPath(pathname, route)));

      console.log("[Auth Proxy] Check:", role, pathname, sessionAuthorized);

      if (!sessionAuthorized) {
        return NextResponse.redirect(
          new URL("/dashboard?access=denied", request.url),
        );
      }
    } else {
      console.log("[Auth Proxy] Check:", role, pathname, true);
    }
  } catch (error) {
    console.error("[proxy] Falha ao validar sessao:", error);
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
      console.log("[Auth Proxy] Subscription:", role, pathname, "session-mismatch");
      return NextResponse.next();
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

      console.log("[Auth Proxy] Subscription:", role, pathname, {
        status: subscription.subscriptionStatus,
        isTrialExpired: subscription.isTrialExpired === true,
        mustBlock,
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
