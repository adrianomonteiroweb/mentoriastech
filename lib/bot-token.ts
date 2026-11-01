import { timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, sitePrivateSettings } from "@/lib/db"

export type BotTokenSource = "db" | "env" | "none"

// Schema compartilhado: mínimo 32 chars, sem espaços, caracteres URL-safe.
export const botTokenSchema = z
  .string()
  .trim()
  .min(32, "O token deve ter pelo menos 32 caracteres")
  .max(256, "O token deve ter no máximo 256 caracteres")
  .regex(/^[A-Za-z0-9._~+/=-]+$/, "O token não pode conter espaços ou caracteres especiais")

// Alias para compatibilidade com o admin route de vagas.
export const jobsBotTokenSchema = botTokenSchema

async function getBotToken(
  settingKey: string,
  envFallback: string | undefined,
): Promise<{ token: string | null; source: BotTokenSource }> {
  const [setting] = await db
    .select({ value: sitePrivateSettings.value })
    .from(sitePrivateSettings)
    .where(eq(sitePrivateSettings.key, settingKey))
    .limit(1)

  const stored = (setting?.value as { token?: unknown } | undefined)?.token
  if (typeof stored === "string" && stored) return { token: stored, source: "db" }

  if (envFallback) return { token: envFallback, source: "env" }

  return { token: null, source: "none" }
}

async function isValidBotToken(
  request: Request,
  settingKey: string,
  envFallback: string | undefined,
): Promise<boolean> {
  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  const { token: expected } = await getBotToken(settingKey, envFallback)
  if (!expected) return false

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  return (
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  )
}

// ---------------------------------------------------------------------------
// Bot de vagas (search-jobs-linkedin, glassdoor, verify-status-job)
// Env fallback: JOBS_SHARE_BOT_TOKEN
// ---------------------------------------------------------------------------
export const JOBS_BOT_TOKEN_SETTING_KEY = "jobs_share_bot_token"

export type JobsBotTokenSource = BotTokenSource

export async function getJobsBotToken() {
  return getBotToken(JOBS_BOT_TOKEN_SETTING_KEY, process.env.JOBS_SHARE_BOT_TOKEN)
}

export async function isValidJobsBotToken(request: Request): Promise<boolean> {
  return isValidBotToken(request, JOBS_BOT_TOKEN_SETTING_KEY, process.env.JOBS_SHARE_BOT_TOKEN)
}

// ---------------------------------------------------------------------------
// Bot de confirmação de mentorias (send-mentorship-confirmation)
// Env fallback: BOOKINGS_BOT_TOKEN
// ---------------------------------------------------------------------------
export const BOOKINGS_BOT_TOKEN_SETTING_KEY = "bookings_bot_token"

export async function getBookingsBotToken() {
  return getBotToken(BOOKINGS_BOT_TOKEN_SETTING_KEY, process.env.BOOKINGS_BOT_TOKEN)
}

export async function isValidBookingsBotToken(request: Request): Promise<boolean> {
  return isValidBotToken(request, BOOKINGS_BOT_TOKEN_SETTING_KEY, process.env.BOOKINGS_BOT_TOKEN)
}
