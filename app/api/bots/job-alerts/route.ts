import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, jobAlertSubscriptions, profiles } from "@/lib/db"

// Rota de bot para o search-jobs-linkedin (repo `bots`): lista as inscrições
// ATIVAS de vagas por WhatsApp, substituindo o antigo mentorados.csv. Acesso
// restrito ao bot — Bearer token dedicado, SEM fallback para sessão de usuário.
// Mesmo esquema de app/api/bots/jobs.

// Não cacheia: precisa refletir o estado atual das inscrições.
export const dynamic = "force-dynamic"

// Confere o Bearer contra JOBS_SHARE_BOT_TOKEN em tempo constante. Sem a env,
// nega tudo (fail-closed).
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

// GET — inscrições ativas na forma que o bot consome (equivalente a uma linha
// do CSV: name/whatsapp/email + filtros). Só enabled = true (o bot dropava as
// desabilitadas no load()).
export async function GET(request: Request) {
  if (!isBotRequest(request)) {
    return NextResponse.json(
      { error: "Token inválido ou ausente" },
      { status: 401 },
    )
  }

  try {
    const rows = await db
      .select({
        name: jobAlertSubscriptions.name,
        whatsapp: jobAlertSubscriptions.whatsapp,
        email: profiles.email,
        fullName: profiles.fullName,
        positions: jobAlertSubscriptions.positions,
        stack: jobAlertSubscriptions.stack,
        levels: jobAlertSubscriptions.levels,
        ignoreWords: jobAlertSubscriptions.ignoreWords,
        isInternational: jobAlertSubscriptions.isInternational,
        dailyLimit: jobAlertSubscriptions.dailyLimit,
      })
      .from(jobAlertSubscriptions)
      .innerJoin(profiles, eq(jobAlertSubscriptions.profileId, profiles.id))
      .where(eq(jobAlertSubscriptions.enabled, true))

    const data = rows.map((row) => ({
      name: row.name || row.fullName || "",
      whatsapp: row.whatsapp || "",
      email: row.email,
      positions: row.positions ?? [],
      stack: row.stack ?? [],
      levels: row.levels ?? [],
      ignore: row.ignoreWords ?? [],
      internacional: row.isInternational,
      daily_limit: row.dailyLimit,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
