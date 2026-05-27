import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/hr", "/mentee"]
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

function hasTrustedMutationOrigin(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method)) return true

  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "cross-site") return false

  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    return new URL(origin).host === request.nextUrl.host
  } catch {
    return false
  }
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY)
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  )

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    )
  }

  return response
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  return target
}

async function getVerifiedSupabaseUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        response = NextResponse.next({
          request: {
            headers: new Headers(request.headers),
          },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()

  return { response, user: error ? null : data.user }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  )
  const isAuthPage = pathname === "/login" || pathname === "/register"

  if (pathname.startsWith("/api/") && !hasTrustedMutationOrigin(request)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Origem nao autorizada" }, { status: 403 }),
    )
  }

  if (!isProtected && !isAuthPage) {
    return withSecurityHeaders(NextResponse.next())
  }

  const { response, user } = await getVerifiedSupabaseUser(request)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return withSecurityHeaders(copyCookies(response, NextResponse.redirect(url)))
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return withSecurityHeaders(copyCookies(response, NextResponse.redirect(url)))
  }

  return withSecurityHeaders(response)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|placeholder).*)",
  ],
}
