import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // Check for language query parameter first
  const langParam = url.searchParams.get('lang')
  
  // Check for language preference in cookies
  const langCookie = request.cookies.get('preferred-language')?.value
  
  // Determine locale: query param > cookie > default (en)
  let locale = 'en'
  if (langParam === 'ar' || langParam === 'en') {
    locale = langParam
  } else if (langCookie === 'ar' || langCookie === 'en') {
    locale = langCookie
  }
  
  const isArabic = locale === 'ar'
  
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
  
  // If language was set via query parameter, store it in a cookie
  if (langParam && (langParam === 'ar' || langParam === 'en')) {
    response.cookies.set('preferred-language', langParam, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      secure: true,
      sameSite: 'lax'
    })
  }
  
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