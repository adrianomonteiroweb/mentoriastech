import { and, asc, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprints, simWorkspaceFiles } from "@/lib/db"
import { simWorkspacePathSchema } from "@/lib/sim/validation"
import { requireMentorAccess } from "@/lib/utils/auth"

/**
 * Workspace read-only para revisão do mentor:
 * sem ?path= retorna a árvore; com ?path= retorna o conteúdo do arquivo.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const [sprint] = await db
      .select({ id: simSprints.id })
      .from(simSprints)
      .where(eq(simSprints.id, id))
      .limit(1)

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const url = new URL(request.url)
    const pathParam = url.searchParams.get("path")

    if (pathParam) {
      const parsed = simWorkspacePathSchema.safeParse(pathParam)
      if (!parsed.success) {
        return NextResponse.json({ error: "Caminho invalido" }, { status: 400 })
      }

      const [file] = await db
        .select()
        .from(simWorkspaceFiles)
        .where(
          and(
            eq(simWorkspaceFiles.sprintId, id),
            eq(simWorkspaceFiles.path, parsed.data),
          ),
        )
        .limit(1)

      if (!file || file.isFolder) {
        return NextResponse.json(
          { error: "Arquivo nao encontrado" },
          { status: 404 },
        )
      }

      return NextResponse.json({
        data: { path: file.path, content: file.content },
      })
    }

    const entries = await db
      .select({
        path: simWorkspaceFiles.path,
        isFolder: simWorkspaceFiles.isFolder,
        size: sql<number>`length(${simWorkspaceFiles.content})`.mapWith(Number),
      })
      .from(simWorkspaceFiles)
      .where(eq(simWorkspaceFiles.sprintId, id))
      .orderBy(asc(simWorkspaceFiles.path))

    return NextResponse.json({
      data: entries.map((entry) => ({
        path: entry.path,
        is_folder: entry.isFolder,
        size: entry.size,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
