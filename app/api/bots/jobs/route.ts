import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { db, jobs } from "@/lib/db"

// Rotas de bot para o verify-status-job (repo `bots`): listar as vagas aprovadas
// com link e EXCLUIR as que o bot confirmou como fechadas na origem ("Não aceita
// mais candidaturas" no LinkedIn). Acesso restrito ao bot — autenticação por
// Bearer token dedicado, SEM fallback para sessão de usuário: quem não apresenta
// o token recebe 401 antes de qualquer acesso ao banco.

// Não cacheia: precisa refletir o estado atual das vagas.
export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Autenticação — apenas o bot
// ---------------------------------------------------------------------------

// Confere o Bearer recebido contra o JOBS_SHARE_BOT_TOKEN em tempo constante
// (timingSafeEqual não vaza o token pela latência da comparação). Sem o token no
// ambiente, nega tudo (fail-closed). Mesmo esquema do app/api/jobs/share.
function isBotRequest(request: Request): boolean {
  const expected = process.env.JOBS_SHARE_BOT_TOKEN
  if (!expected) return false

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  return (
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  )
}

// Envolve um handler garantindo que só o bot autenticado chegue nele: sem token
// válido, responde 401 antes de tocar no banco. Também centraliza o tratamento
// de erro, deixando cada handler enxuto e focado na sua regra.
function botOnly(handler: (request: Request) => Promise<NextResponse>) {
  return async (request: Request): Promise<NextResponse> => {
    if (!isBotRequest(request)) {
      return NextResponse.json(
        { error: "Token inválido ou ausente" },
        { status: 401 },
      )
    }

    try {
      return await handler(request)
    } catch (error) {
      const status = (error as { status?: number }).status || 500
      const message = (error as Error).message || "Erro interno"
      return NextResponse.json({ error: message }, { status })
    }
  }
}

// ---------------------------------------------------------------------------
// GET — vagas aprovadas (com link) para o bot verificar o status na origem
// ---------------------------------------------------------------------------

export const GET = botOnly(async () => {
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
})

// ---------------------------------------------------------------------------
// DELETE — exclui definitivamente as vagas que o bot confirmou como fechadas
// ---------------------------------------------------------------------------

// Corpo: { ids: uuid[] } — os ids das vagas a apagar. Hard delete: a FK
// job_actions.job_id é ON DELETE CASCADE, então as ações relacionadas somem
// junto (mesmo caminho do delete em massa do admin em app/api/admin/jobs).
const deleteBodySchema = z
  .object({ ids: z.array(z.string().uuid()).min(1).max(200) })
  .strict()

export const DELETE = botOnly(async (request) => {
  const body = await request.json().catch(() => null)

  const parsed = deleteBodySchema.safeParse(body)
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
})
