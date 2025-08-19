import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Check if the subdomain is Arabic
  const isArabic = hostname.startsWith('ar.')
  
  // Set locale based on subdomain
  const locale = isArabic ? 'ar' : 'en'
  
  // Clone the request headers and add locale information
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)
  requestHeaders.set('x-is-arabic', isArabic.toString())
  
  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Set locale in response headers for client-side access
  response.headers.set('x-locale', locale)
  response.headers.set('x-is-arabic', isArabic.toString())
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}