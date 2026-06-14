import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const AUTH_COOKIE = "auth_token"
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/mentor", "/hr", "/mentee"]
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.pagar.me https://*.mundipagg.com",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
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

async function verifyAuthCookie(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token) return null

  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    )
    if (!payload.sub) return null
    return { userId: payload.sub }
  } catch {
    return null
  }
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

  const auth = await verifyAuthCookie(request)

  if (isProtected && !auth) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return withSecurityHeaders(NextResponse.redirect(url))
  }

  if (auth && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return withSecurityHeaders(NextResponse.redirect(url))
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|placeholder).*)",
  ],
}
