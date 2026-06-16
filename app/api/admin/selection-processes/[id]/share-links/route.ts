import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, selectionProcessShareLinks } from "@/lib/db"
import { toSelectionProcessShareLink } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { z } from "zod"

const createSchema = z.object({
  permission: z.enum(["view", "edit"]),
  label: z.string().min(1).max(200).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const rows = await db
      .select()
      .from(selectionProcessShareLinks)
      .where(eq(selectionProcessShareLinks.processId, id))
      .orderBy(selectionProcessShareLinks.createdAt)

    return NextResponse.json({ data: rows.map(toSelectionProcessShareLink) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const token = randomBytes(32).toString("base64url")

    const [link] = await db
      .insert(selectionProcessShareLinks)
      .values({
        processId: id,
        token,
        permission: parsed.data.permission,
        label: parsed.data.label ?? null,
        createdBy: profile.id,
      })
      .returning()

    return NextResponse.json({ data: toSelectionProcessShareLink(link) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
