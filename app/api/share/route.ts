import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { contentItems, db, jobs, pageShares } from "@/lib/db"

const shareSchema = z.discriminatedUnion("target_type", [
  z.object({
    target_type: z.literal("page"),
    path: z
      .string()
      .min(1)
      .max(200)
      .startsWith("/")
      .refine((value) => !value.includes("://"), "Path invalido"),
    label: z.string().min(1).max(120),
  }),
  z.object({
    target_type: z.literal("content"),
    target_id: z.string().uuid(),
  }),
  z.object({
    target_type: z.literal("job"),
    target_id: z.string().uuid(),
  }),
])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = shareSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const data = parsed.data

    if (data.target_type === "page") {
      const [updated] = await db
        .insert(pageShares)
        .values({
          path: data.path,
          label: data.label,
          shareCount: 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pageShares.path,
          set: {
            label: data.label,
            shareCount: sql`${pageShares.shareCount} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning({ shareCount: pageShares.shareCount })

      return NextResponse.json({ share_count: updated?.shareCount ?? 0 })
    }

    if (data.target_type === "content") {
      const [updated] = await db
        .update(contentItems)
        .set({ shareCount: sql`${contentItems.shareCount} + 1` })
        .where(
          and(
            eq(contentItems.id, data.target_id),
            eq(contentItems.isPublished, true),
          ),
        )
        .returning({ shareCount: contentItems.shareCount })

      if (!updated) {
        return NextResponse.json({ error: "Conteudo nao encontrado" }, { status: 404 })
      }

      return NextResponse.json({ share_count: updated.shareCount })
    }

    const [updated] = await db
      .update(jobs)
      .set({ shareCount: sql`${jobs.shareCount} + 1` })
      .where(and(eq(jobs.id, data.target_id), eq(jobs.status, "approved")))
      .returning({ shareCount: jobs.shareCount })

    if (!updated) {
      return NextResponse.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ share_count: updated.shareCount })
  } catch (error) {
    console.error("[share] Error:", error)
    return NextResponse.json({ error: "Erro ao registrar compartilhamento" }, { status: 500 })
  }
}
