import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token");
  const { pathname } = request.nextUrl;

  // Permite acesso livre ao login e consulta
  if (
    pathname === "/login" ||
    pathname.startsWith("/consulta") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Redireciona para o login se não houver token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};
