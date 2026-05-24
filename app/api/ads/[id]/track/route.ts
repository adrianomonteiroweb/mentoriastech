import { NextResponse } from "next/server"
import { and, eq, isNull, lt, or, sql } from "drizzle-orm"
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
      // Incrementar click_count apenas se o anúncio estiver ativo
      // E abaixo do limite (ou sem limite definido)
      await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(ads)
          .set({ clickCount: sql`${ads.clickCount} + 1` })
          .where(
            and(
              eq(ads.id, id),
              eq(ads.isActive, true),
              or(isNull(ads.maxClicks), lt(ads.clickCount, ads.maxClicks)),
            ),
          )
          .returning({ clickCount: ads.clickCount, maxClicks: ads.maxClicks })

        // Se atingiu o limite, desativar automaticamente
        if (
          updated &&
          updated.maxClicks !== null &&
          updated.clickCount >= updated.maxClicks
        ) {
          await tx
            .update(ads)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(ads.id, id))
        }
      })
    } else {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }
}
