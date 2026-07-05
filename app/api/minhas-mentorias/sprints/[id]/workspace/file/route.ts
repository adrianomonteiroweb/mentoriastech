import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simWorkspaceFiles } from "@/lib/db"
import { getSprintOwnedByProfile } from "@/lib/db/sim"
import {
  SIM_WORKSPACE_MAX_FILES,
  simWorkspaceFilePutSchema,
  simWorkspacePathSchema,
} from "@/lib/sim/validation"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

/** Conteúdo de um arquivo (?path=) — carregado sob demanda pelo editor. */
export async function GET(
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

    const sprint = await getSprintOwnedByProfile(id, profile.id)
    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint nao encontrada" },
        { status: 404 },
      )
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
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

/** Salvar conteúdo (upsert por arquivo — payloads pequenos, longe do limite da Vercel). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params
    const body = await request.json()

    const parsed = simWorkspaceFilePutSchema.safeParse(body)
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
