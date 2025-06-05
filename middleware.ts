import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 認証が不要なパス
  const publicPaths = [
    '/',
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/users/init',
    '/_next',
    '/favicon.ico'
  ]

  // 静的ファイルやAPIルートの一部は認証をスキップ
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/users/init') ||
    pathname === '/favicon.ico' ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next()
  }

  // 認証が必要なページ
  const protectedPaths = ['/map', '/store', '/ranking', '/settings']
  
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // 認証トークンがない場合はログインページにリダイレクト
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const tokenResult = verifyToken(token)
    
    if (!tokenResult.valid) {
      // 無効なトークンの場合はログインページにリダイレクト
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 