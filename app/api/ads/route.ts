import { NextResponse } from "next/server"
import { asc, eq, and } from "drizzle-orm"
import { db, ads } from "@/lib/db"
import { toAd } from "@/lib/db/mappers"

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(ads)
      .where(and(eq(ads.isActive, true)))
      .orderBy(asc(ads.sortOrder), asc(ads.createdAt))

    return NextResponse.json({ data: rows.map(toAd) })
  } catch {
    return NextResponse.json({ error: "Erro ao carregar anúncios" }, { status: 500 })
  }
}
