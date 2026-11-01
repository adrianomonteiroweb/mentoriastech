import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, jobAlertSubscriptions, profiles } from "@/lib/db"
import { isValidJobsBotToken } from "@/lib/bot-token"

// Rota de bot para o search-jobs-linkedin (repo `bots`): lista as inscrições
// ATIVAS de vagas por WhatsApp, substituindo o antigo mentorados.csv. Acesso
// restrito ao bot — Bearer token dedicado, SEM fallback para sessão de usuário.
// Mesmo esquema de app/api/bots/jobs.

// Não cacheia: precisa refletir o estado atual das inscrições.
export const dynamic = "force-dynamic"

// GET — inscrições ativas na forma que o bot consome. `whatsapp` é entregue
// em E.164 (ex.: +5511987654321 ou +2389841098), sem DDI fixo.
export async function GET(request: Request) {
  if (!(await isValidJobsBotToken(request))) {
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
        workModel: jobAlertSubscriptions.workModel,
        cities: jobAlertSubscriptions.cities,
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
      work_model: row.workModel ?? "all",
      cities: row.cities ?? [],
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
