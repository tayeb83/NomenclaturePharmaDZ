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
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
