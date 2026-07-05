import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simSprints, simWorkspaceFiles } from "@/lib/db"
import {
  SIM_WORKSPACE_MAX_FILES,
  simWorkspaceCreateSchema,
  simWorkspaceFilePutSchema,
  simWorkspacePathSchema,
} from "@/lib/sim/validation"
import { requireMentorAccess } from "@/lib/utils/auth"

export const dynamic = "force-dynamic"

/** Carrega a sprint (id + status) garantindo acesso do mentor. */
async function loadSprint(id: string) {
  const [sprint] = await db
    .select({ id: simSprints.id, status: simSprints.status })
    .from(simSprints)
    .where(eq(simSprints.id, id))
    .limit(1)
  return sprint ?? null
}

/**
 * Workspace do mentor: revisão e edição em instrução ao mentorado.
 * GET sem ?path= retorna a árvore; com ?path= retorna o conteúdo do arquivo.
 * POST cria arquivo/pasta; PUT salva conteúdo; DELETE remove (recursivo).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const sprint = await loadSprint(id)
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

/** Criar arquivo vazio ou pasta. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simWorkspaceCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const sprint = await loadSprint(id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }
    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    const existing = await db
      .select({ path: simWorkspaceFiles.path })
      .from(simWorkspaceFiles)
      .where(eq(simWorkspaceFiles.sprintId, id))

    if (existing.length >= SIM_WORKSPACE_MAX_FILES) {
      return NextResponse.json(
        { error: `Limite de ${SIM_WORKSPACE_MAX_FILES} arquivos por sprint atingido` },
        { status: 409 },
      )
    }

    if (existing.some((entry) => entry.path === parsed.data.path)) {
      return NextResponse.json(
        { error: "Ja existe um arquivo ou pasta com esse caminho" },
        { status: 409 },
      )
    }

    const [data] = await db
      .insert(simWorkspaceFiles)
      .values({
        sprintId: id,
        path: parsed.data.path,
        isFolder: parsed.data.is_folder ?? false,
        content: "",
      })
      .returning()

    return NextResponse.json(
      { data: { path: data.path, is_folder: data.isFolder, size: 0 } },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

/** Salvar conteúdo (upsert por arquivo). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simWorkspaceFilePutSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const sprint = await loadSprint(id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }
    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    const [existing] = await db
      .select({
        id: simWorkspaceFiles.id,
        isFolder: simWorkspaceFiles.isFolder,
      })
      .from(simWorkspaceFiles)
      .where(
        and(
          eq(simWorkspaceFiles.sprintId, id),
          eq(simWorkspaceFiles.path, parsed.data.path),
        ),
      )
      .limit(1)

    if (existing?.isFolder) {
      return NextResponse.json(
        { error: "Caminho e uma pasta, nao um arquivo" },
        { status: 400 },
      )
    }

    if (!existing) {
      const count = await db.$count(
        simWorkspaceFiles,
        eq(simWorkspaceFiles.sprintId, id),
      )
      if (count >= SIM_WORKSPACE_MAX_FILES) {
        return NextResponse.json(
          { error: `Limite de ${SIM_WORKSPACE_MAX_FILES} arquivos por sprint atingido` },
          { status: 409 },
        )
      }
    }

    const [data] = await db
      .insert(simWorkspaceFiles)
      .values({
        sprintId: id,
        path: parsed.data.path,
        isFolder: false,
        content: parsed.data.content,
      })
      .onConflictDoUpdate({
        target: [simWorkspaceFiles.sprintId, simWorkspaceFiles.path],
        set: { content: parsed.data.content, updatedAt: new Date() },
      })
      .returning()

    return NextResponse.json({
      data: { path: data.path, size: data.content.length },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

/** Excluir arquivo, ou pasta recursivamente (?path=). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const url = new URL(request.url)
    const parsed = simWorkspacePathSchema.safeParse(url.searchParams.get("path"))
    if (!parsed.success) {
      return NextResponse.json({ error: "Caminho invalido" }, { status: 400 })
    }
    const path = parsed.data

    const sprint = await loadSprint(id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }
    if (sprint.status !== "active") {
      return NextResponse.json(
        { error: "Sprint nao esta mais ativa" },
        { status: 409 },
      )
    }

    // Filtra em JS (≤200 paths) para não lidar com curingas de LIKE (_ é \w)
    const entries = await db
      .select({ id: simWorkspaceFiles.id, path: simWorkspaceFiles.path })
      .from(simWorkspaceFiles)
      .where(eq(simWorkspaceFiles.sprintId, id))

    const toDelete = entries
      .filter((entry) => entry.path === path || entry.path.startsWith(`${path}/`))
      .map((entry) => entry.id)

    if (toDelete.length === 0) {
      return NextResponse.json(
        { error: "Arquivo nao encontrado" },
        { status: 404 },
      )
    }

    await db
      .delete(simWorkspaceFiles)
      .where(
        and(
          eq(simWorkspaceFiles.sprintId, id),
          inArray(simWorkspaceFiles.id, toDelete),
        ),
      )

    return NextResponse.json({ success: true, deleted: toDelete.length })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
