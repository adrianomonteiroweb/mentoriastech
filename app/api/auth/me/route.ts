import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { getSession } from "@/lib/utils/auth"

export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ user: null })
  }

  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      whatsapp: profiles.whatsapp,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (!profile) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.fullName,
      whatsapp: profile.whatsapp,
    },
  })
}
