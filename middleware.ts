import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/analytics/api-exec')) {
    const payload = JSON.stringify({
      api_path: pathname,
      method: request.method,
    })

    fetch(`${request.nextUrl.origin}/api/analytics/api-exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})

    return NextResponse.next()
  }

  // Transmet le chemin au layout racine (via next/headers) pour forcer
  // lang="ar"/dir="rtl" sur les routes /ar/* indépendamment du cookie de
  // langue — nécessaire pour que ces pages restent indexables séparément.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
