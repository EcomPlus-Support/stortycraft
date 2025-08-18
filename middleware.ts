import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth'

// Define protected and public routes
const protectedRoutes = [
  '/',           // Main app
  '/dashboard',  // Dashboard (if exists)
  '/app',        // App routes
  '/profile',    // User profile
  '/api/user',   // User API routes
  '/api/videos', // Video generation routes
  '/api/scenes', // Scene generation routes
]

const authRoutes = [
  '/auth/login',
  '/auth/signup',
]

const publicRoutes = [
  '/landing',
  '/api/auth',
  '/terms',
  '/privacy',
  '/about',
  '/contact',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow static files and public API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if route is auth-related
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Get token from request
  const token = request.cookies.get('viralcraft_auth_token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Verify authentication
  let isAuthenticated = false
  if (token) {
    try {
      const user = await verifyJWT(token)
      isAuthenticated = !!user
    } catch (error) {
      isAuthenticated = false
    }
  }

  // Handle auth routes (login/signup)
  if (isAuthRoute) {
    if (isAuthenticated) {
      // Redirect authenticated users away from auth pages
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })

  if (isProtectedRoute && !isAuthenticated) {
    // For root path, redirect to landing page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/landing', request.url))
    }
    
    // For other protected routes, redirect to login
    const loginUrl = new URL('/auth/login', request.url)
    // Add return URL for redirect after login
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}