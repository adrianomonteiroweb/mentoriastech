import { timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, sitePrivateSettings } from "@/lib/db"

// Token Bearer dos bots de vagas (repo `bots`: search-jobs-linkedin, glassdoor,
// verify-status-job). O valor principal fica em site_private_settings e é
// administrado pelo admin em /admin/settings; a env JOBS_SHARE_BOT_TOKEN segue
// como fallback legado para não derrubar os bots durante a transição.
export const JOBS_BOT_TOKEN_SETTING_KEY = "jobs_share_bot_token"

export type JobsBotTokenSource = "db" | "env" | "none"

export const jobsBotTokenSchema = z
  .string()
  .trim()
  .min(32, "O token deve ter pelo menos 32 caracteres")
  .max(256, "O token deve ter no máximo 256 caracteres")
  .regex(/^[A-Za-z0-9._~+/=-]+$/, "O token não pode conter espaços ou caracteres especiais")

export async function getJobsBotToken(): Promise<{
  token: string | null
  source: JobsBotTokenSource
}> {
  const [setting] = await db
    .select({ value: sitePrivateSettings.value })
    .from(sitePrivateSettings)
    .where(eq(sitePrivateSettings.key, JOBS_BOT_TOKEN_SETTING_KEY))
    .limit(1)

  const stored = (setting?.value as { token?: unknown } | undefined)?.token
  if (typeof stored === "string" && stored) return { token: stored, source: "db" }

  const fromEnv = process.env.JOBS_SHARE_BOT_TOKEN
  if (fromEnv) return { token: fromEnv, source: "env" }

  return { token: null, source: "none" }
}

// Confere o Bearer recebido em tempo constante (timingSafeEqual não vaza o token
// pela latência da comparação). Sem token configurado, nega tudo (fail-closed).
export async function isValidJobsBotToken(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const { token: expected } = await getJobsBotToken()
  if (!expected) return false

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  return (
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  )
}
