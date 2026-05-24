import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db, ads } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const event = body.event as string

    if (event === "view") {
      await db
        .update(ads)
        .set({ viewCount: sql`${ads.viewCount} + 1` })
        .where(eq(ads.id, id))
    } else if (event === "click") {
      await db
        .update(ads)
        .set({ clickCount: sql`${ads.clickCount} + 1` })
        .where(eq(ads.id, id))
    } else {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }
}
