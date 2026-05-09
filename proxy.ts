import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isApiRoute = pathname.startsWith('/api/')

  if (!isLoggedIn && !isAuthPage) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  // Protect everything except Next.js internals, static files, and auth API
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
