import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, formacaoMembros } from "@/lib/db"
import {
  contarMembrosAtivos,
  getTurmaById,
  MAX_MEMBROS_POR_TURMA,
} from "@/lib/db/formacao"
import { getProfileByEmail } from "@/lib/utils/mentee-resume"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"
import { convidarMembroSchema } from "@/lib/formacao/validation"

function iniciaisDe(nome: string | null, email: string): string {
  const base = (nome || email.split("@")[0] || "").trim()
  const partes = base.split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireFormacaoInstrutor()
    const { id: turmaId } = await params

    const turma = await getTurmaById(turmaId)
    if (!turma) {
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = convidarMembroSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const nome = parsed.data.nome?.trim() || null

    // Já é membro desta turma?
    const [existente] = await db
      .select({ id: formacaoMembros.id })
      .from(formacaoMembros)
      .where(
        and(eq(formacaoMembros.turmaId, turmaId), eq(formacaoMembros.email, email)),
      )
      .limit(1)
    if (existente) {
      return NextResponse.json(
        { error: "Este e-mail já faz parte da turma" },
        { status: 409 },
      )
    }

    // Limite de 5 alunos por squad.
    const total = await contarMembrosAtivos(turmaId)
    if (total >= MAX_MEMBROS_POR_TURMA) {
      return NextResponse.json(
        { error: "A turma já atingiu o limite de 5 alunos" },
        { status: 422 },
      )
    }

    // Vincula ao profile existente (se o aluno já acessa a plataforma).
    const profile = await getProfileByEmail(email)
    const nomeFinal = nome || profile?.fullName || null

    const [membro] = await db
      .insert(formacaoMembros)
      .values({
        turmaId,
        profileId: profile?.id ?? null,
        email,
        nome: nomeFinal,
        iniciais: iniciaisDe(nomeFinal, email),
        status: "ativo",
      })
      .returning()

    return NextResponse.json({ data: membro }, { status: 201 })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
