import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { eq, sql } from "drizzle-orm"
import { db, contentItems, contentViews } from "@/lib/db"
import { getSession } from "@/lib/utils/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const [item] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1)

    if (!item) {
      return NextResponse.json({ error: "Conteudo nao encontrado" }, { status: 404 })
    }

    let visitorHash: string

    const session = await getSession().catch(() => null)
    if (session) {
      visitorHash = `user:${session.id}`
    } else {
      const forwarded = request.headers.get("x-forwarded-for")
      const ip = forwarded?.split(",")[0]?.trim() || "unknown"
      visitorHash = `ip:${createHash("sha256").update(ip).digest("hex").substring(0, 16)}`
    }

    const inserted = await db
      .insert(contentViews)
      .values({ contentId: id, visitorHash })
      .onConflictDoNothing()
      .returning({ id: contentViews.id })

    if (inserted.length > 0) {
      await db
        .update(contentItems)
        .set({ viewCount: sql`${contentItems.viewCount} + 1` })
        .where(eq(contentItems.id, id))
    }

    const [updated] = await db
      .select({ viewCount: contentItems.viewCount })
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1)

    return NextResponse.json({ view_count: updated?.viewCount ?? 0 })
  } catch (error) {
    console.error("[content/view] Error:", error)
    return NextResponse.json({ error: "Erro ao registrar visualizacao" }, { status: 500 })
  }
}
