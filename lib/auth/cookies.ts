import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

export const AUTH_COOKIE = "auth_token"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function authCookieOptions(
  secure = process.env.NODE_ENV === "production",
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  }
}

export function deletedCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  }
}
