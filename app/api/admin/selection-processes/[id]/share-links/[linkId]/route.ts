import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, selectionProcessShareLinks } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    await requireRole("admin")
    const { id, linkId } = await params

    const [deleted] = await db
      .delete(selectionProcessShareLinks)
      .where(
        and(
          eq(selectionProcessShareLinks.id, linkId),
          eq(selectionProcessShareLinks.processId, id),
        ),
      )
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Link nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
