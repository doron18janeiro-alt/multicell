import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Tenta ler os dois nomes de cookie comuns para garantir
  const token = request.cookies.get('auth_token') || request.cookies.get('auth-token');
  
  const { pathname } = request.nextUrl;

  // 1. Permitir arquivos estáticos e pastas públicas (EVITA ERRO 404 de favicon)
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // 2. Se for a página de login ou consulta, permite o acesso
  if (pathname === '/login' || pathname.startsWith('/consulta')) {
    return NextResponse.next();
  }

  // 3. Se não tiver token, manda para o login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Monitora tudo exceto arquivos estáticos
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
