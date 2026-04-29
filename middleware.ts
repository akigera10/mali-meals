import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Don't protect the login page itself
  if (pathname === '/admin/login') return NextResponse.next()

  // Start with a passthrough response — may be replaced if session needs refreshing
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // createServerClient from @supabase/ssr reads and writes cookies so the
  // session stays refreshed across requests without a full page reload.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the session against Supabase — never trusts the local JWT alone
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  } catch {
    // Network error reaching Supabase — redirect to login rather than crashing
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
