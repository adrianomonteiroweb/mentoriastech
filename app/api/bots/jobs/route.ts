import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { db, jobs } from "@/lib/db"

// Endpoints de bot para o verify-status-job (repo `bots`): lista as vagas
// aprovadas com link de candidatura e apaga as que o bot confirmou como
// fechadas na origem ("Não aceita mais candidaturas" no LinkedIn). Mesma
// autenticação por Bearer token do jobs/share (JOBS_SHARE_BOT_TOKEN).

// Não cacheia: precisa refletir o estado atual das vagas.
export const dynamic = "force-dynamic"

// Valida o Bearer token do bot com comparação timing-safe. Sem env configurada,
// o caminho fica desabilitado (retorna false) — espelha jobs/share/route.ts.
function isValidBotToken(request: Request): boolean {
  const expected = process.env.JOBS_SHARE_BOT_TOKEN
  if (!expected) return false

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// GET: lista as vagas aprovadas (visíveis publicamente) que têm link de
// candidatura, para o bot verificar o status na origem.
export async function GET(request: Request) {
  try {
    if (!isValidBotToken(request)) {
      return NextResponse.json(
        { error: "Token inválido ou ausente" },
        { status: 401 },
      )
    }

    const rows = await db
      .select({
        id: jobs.id,
        application_url: jobs.applicationUrl,
        title: jobs.title,
        company: jobs.company,
      })
      .from(jobs)
      .where(and(eq(jobs.status, "approved"), isNotNull(jobs.applicationUrl)))

    return NextResponse.json({ data: rows })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE: remove definitivamente as vagas informadas (hard delete). O bot manda
// os ids que confirmou como fechados. A FK job_actions.job_id é ON DELETE
// CASCADE, então as ações relacionadas somem junto — mesmo caminho do delete em
// massa do admin.
const deleteSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict()

export async function DELETE(request: Request) {
  try {
    if (!isValidBotToken(request)) {
      return NextResponse.json(
        { error: "Token inválido ou ausente" },
        { status: 401 },
      )
    }

    const body = await request.json()

    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const deleted = await db
      .delete(jobs)
      .where(inArray(jobs.id, parsed.data.ids))
      .returning({ id: jobs.id })

    return NextResponse.json({ ok: true, deleted: deleted.length })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
