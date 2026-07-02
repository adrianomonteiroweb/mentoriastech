import { eq } from "drizzle-orm"

import { db, bookings, siteSettings, mentoringTopics, profiles } from "@/lib/db"
import { getAttachmentsByBookingId } from "@/lib/db/booking-attachments"
import { isOptionalBookingMetadataPersistenceError } from "@/lib/db/booking-select"
import {
  transcribeAudio,
  summarizeMentorshipTranscript,
  ResumeAIError,
  type MentorshipSummary,
} from "@/lib/ai/gemini"
import {
  MEETING_AI_PROMPT_SETTING_KEY,
  normalizeMeetingSummaryPrompt,
} from "@/lib/meeting-ai-prompt"
import { logAuditEvent } from "@/lib/audit"
import type { AITranscriptStatus } from "@/lib/types/database"

const MIGRATION_ERROR_MESSAGE =
  "As colunas de IA ainda não foram aplicadas no banco (ai_transcript, ai_summary, ai_transcript_status). Rode a migração antes de usar a transcrição."

export type TranscriptionOutcomeStatus = "done" | "skipped" | "failed"

export interface TranscriptionOutcome {
  status: TranscriptionOutcomeStatus
  reason?: string
  transcriptChars?: number
  transcript?: string
  summary?: MentorshipSummary
}

interface TranscribeBookingParams {
  bookingId: string
  actorId?: string | null
  request?: Request
  route?: string
}

async function setAiFields(
  bookingId: string,
  fields: {
    aiTranscriptStatus?: AITranscriptStatus
    aiTranscript?: string | null
    aiSummary?: string | null
  },
) {
  await db
    .update(bookings)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
}

async function getCustomSummaryPrompt(): Promise<string | null> {
  try {
    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, MEETING_AI_PROMPT_SETTING_KEY))
      .limit(1)
    return normalizeMeetingSummaryPrompt(setting?.value) || null
  } catch {
    return null
  }
}

async function loadContext(bookingId: string) {
  const [row] = await db
    .select({
      menteeName: profiles.fullName,
      guestName: bookings.guestName,
      topicName: mentoringTopics.name,
    })
    .from(bookings)
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
    .where(eq(bookings.id, bookingId))
    .limit(1)
  return row
}

/**
 * Transcreve e resume o áudio gravado de uma mentoria, persistindo o resultado
 * nas colunas ai_transcript / ai_summary / ai_transcript_status do booking.
 *
 * Reutilizado pelo botão manual do admin e pelo cron. Em caso de erro de IA/IO,
 * marca o status como "failed" (best-effort) e relança o erro.
 */
export async function transcribeBookingSession({
  bookingId,
  actorId = null,
  request,
  route,
}: TranscribeBookingParams): Promise<TranscriptionOutcome> {
  const attachments = await getAttachmentsByBookingId(bookingId)
  const audios = attachments
    .filter((a) => a.type === "audio" && a.fileUrl)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))

  if (audios.length === 0) {
    return { status: "skipped", reason: "no_audio" }
  }

  // Marca "processing" já detectando a ausência das colunas (evita gastar tokens
  // de IA quando a migração ainda não foi aplicada).
  try {
    await setAiFields(bookingId, { aiTranscriptStatus: "processing" })
  } catch (error) {
    if (isOptionalBookingMetadataPersistenceError(error)) {
      throw new ResumeAIError(MIGRATION_ERROR_MESSAGE, 500)
    }
    throw error
  }

  try {
    const context = await loadContext(bookingId)
    const customPrompt = await getCustomSummaryPrompt()

    const parts: string[] = []
    for (const audio of audios) {
      const res = await fetch(audio.fileUrl as string)
      if (!res.ok) {
        throw new ResumeAIError("Não foi possível baixar o áudio da mentoria.", 502)
      }
      const buffer = await res.arrayBuffer()
      const transcript = await transcribeAudio({
        audio: buffer,
        mimeType: audio.mimeType || "audio/wav",
      })
      parts.push(audios.length > 1 ? `## ${audio.title}\n\n${transcript}` : transcript)
    }

    const fullTranscript = parts.join("\n\n---\n\n")

    const summary = await summarizeMentorshipTranscript({
      transcript: fullTranscript,
      topicName: context?.topicName,
      menteeName: context?.menteeName || context?.guestName,
      customPrompt,
    })

    await setAiFields(bookingId, {
      aiTranscript: fullTranscript,
      aiSummary: JSON.stringify(summary),
      aiTranscriptStatus: "done",
    })

    await logAuditEvent({
      actorId,
      action: "transcribe_session",
      route,
      request,
      metadata: {
        bookingId,
        audioCount: audios.length,
        transcriptChars: fullTranscript.length,
      },
    })

    return {
      status: "done",
      transcriptChars: fullTranscript.length,
      transcript: fullTranscript,
      summary,
    }
  } catch (error) {
    try {
      await setAiFields(bookingId, { aiTranscriptStatus: "failed" })
    } catch {
      // best-effort: não mascarar o erro original
    }
    await logAuditEvent({
      actorId,
      action: "transcribe_session_failed",
      route,
      request,
      metadata: {
        bookingId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
