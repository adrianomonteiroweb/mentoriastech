import { ilike, or, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function GET(request: Request) {
  try {
    await requireFormacaoInstrutor()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [] })
    }

    const pattern = `%${q}%`
    const results = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        whatsapp: profiles.whatsapp,
      })
      .from(profiles)
      .where(
        or(
          ilike(profiles.email, pattern),
          ilike(profiles.fullName, pattern),
        ),
      )
      .limit(8)

    return NextResponse.json({ data: results })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
