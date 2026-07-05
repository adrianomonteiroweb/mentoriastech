import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simWorkspaceFiles } from "@/lib/db"
import { getSprintOwnedByProfile } from "@/lib/db/sim"
import {
  SIM_WORKSPACE_MAX_FILES,
  simWorkspaceCreateSchema,
  simWorkspacePathSchema,
} from "@/lib/sim/validation"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Árvore do workspace: paths e tamanhos, sem conteúdos (payload leve). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const sprint = await getSprintOwnedByProfile(id, profile.id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
    }

    const entries = await db
      .select({
        path: simWorkspaceFiles.path,
        isFolder: simWorkspaceFiles.isFolder,
        size: sql<number>`length(${simWorkspaceFiles.content})`.mapWith(Number),
        updatedAt: simWorkspaceFiles.updatedAt,
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
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params
    const body = await request.json()

    const parsed = simWorkspaceCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const sprint = await getSprintOwnedByProfile(id, profile.id)
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

/** Excluir arquivo, ou pasta recursivamente (?path=). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const url = new URL(request.url)
    const parsed = simWorkspacePathSchema.safeParse(url.searchParams.get("path"))
    if (!parsed.success) {
      return NextResponse.json({ error: "Caminho invalido" }, { status: 400 })
    }
    const path = parsed.data

    const sprint = await getSprintOwnedByProfile(id, profile.id)
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
      .filter(
        (entry) => entry.path === path || entry.path.startsWith(`${path}/`),
      )
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
