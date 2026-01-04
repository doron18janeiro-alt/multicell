import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const isPublicPath =
    path === "/login" ||
    path === "/consulta" ||
    path.startsWith("/api/os/status") ||
    path.startsWith("/api/auth/login");

  const token = request.cookies.get("auth_token")?.value || "";

  if (isPublicPath && token) {
    // If user is already logged in and tries to access login, redirect to dashboard
    if (path === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (!isPublicPath && !token) {
    // If user is not logged in and tries to access protected route, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/",
    "/vendas/:path*",
    "/estoque/:path*",
    "/os/:path*",
    "/clientes/:path*",
    "/relatorios/:path*",
    "/api/:path*",
    "/login",
    "/consulta",
  ],
};
