import { NextResponse } from "next/server"
import { inArray } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        role: profiles.role,
      })
      .from(profiles)
      .where(inArray(profiles.role, ["admin", "mentor"]))

    const data = rows.map((r) => ({
      id: r.id,
      name: r.fullName || r.email,
      email: r.email,
      role: r.role,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
