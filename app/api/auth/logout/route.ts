import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { LEGACY_SESSION_COOKIE } from "@/lib/utils/auth-cookies"

export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("[auth/logout] Error:", error)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(LEGACY_SESSION_COOKIE)

  return response
}
