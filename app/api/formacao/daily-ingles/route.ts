import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, formacaoDailyEntries, formacaoDailyIngles, formacaoMembros } from "@/lib/db"
import { requireMenteeAccess, MenteeAccessError } from "@/lib/utils/mentee-access"
import { getActiveTurmaMembershipForEmail } from "@/lib/db/formacao"
import { isFormacaoPreviewEnabled } from "@/lib/formacao/preview"
import { translateToEnglish, buildIncrements, TranslationError } from "@/lib/formacao/translate"

const schema = z.object({
  encontroId: z.string().uuid(),
  textoPt: z.string().min(3, "Texto muito curto").max(500, "Texto muito longo"),
})

export async function POST(request: Request) {
  try {
    if (!isFormacaoPreviewEnabled()) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    const session = await requireMenteeAccess()
    const membership = await getActiveTurmaMembershipForEmail(session.email)
    if (!membership) {
      return NextResponse.json({ error: "Sem turma ativa" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const { encontroId, textoPt } = parsed.data
    const membroId = membership.membro.id

    let [daily] = await db
      .select()
      .from(formacaoDailyEntries)
      .where(
        and(
          eq(formacaoDailyEntries.encontroId, encontroId),
          eq(formacaoDailyEntries.membroId, membroId),
        ),
      )
      .limit(1)

    if (!daily) {
      [daily] = await db
        .insert(formacaoDailyEntries)
        .values({ encontroId, membroId })
        .returning()
    }

    const translation = await translateToEnglish(textoPt)
    const incrementos = buildIncrements(translation)
    const vocab = extractVocab(translation)

    const [existing] = await db
      .select()
      .from(formacaoDailyIngles)
      .where(eq(formacaoDailyIngles.dailyEntryId, daily.id))
      .limit(1)

    let ingles
    if (existing) {
      [ingles] = await db
        .update(formacaoDailyIngles)
        .set({
          fraseCompletaPt: textoPt,
          fraseCompletaEn: translation,
          incrementos,
          vocab,
          updatedAt: new Date(),
        })
        .where(eq(formacaoDailyIngles.id, existing.id))
        .returning()
    } else {
      [ingles] = await db
        .insert(formacaoDailyIngles)
        .values({
          dailyEntryId: daily.id,
          fraseCompletaPt: textoPt,
          fraseCompletaEn: translation,
          incrementos,
          vocab,
        })
        .returning()
    }

    return NextResponse.json({ data: ingles })
  } catch (error) {
    if (error instanceof MenteeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof TranslationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[formacao/daily-ingles]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

function extractVocab(sentence: string): string[] {
  const stopWords = new Set([
    "i", "a", "an", "the", "is", "are", "was", "were", "am", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "and", "but", "or", "nor", "not", "so",
    "yet", "both", "either", "neither", "each", "every", "all", "any",
    "few", "more", "most", "other", "some", "such", "no", "only", "own",
    "same", "than", "too", "very", "just", "because", "about", "up",
    "out", "if", "then", "that", "this", "it", "its", "my", "our",
    "your", "his", "her", "their", "we", "they", "them", "me", "him",
  ])
  const words = sentence.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/)
  const unique = [...new Set(words)]
  return unique.filter((w) => w.length > 2 && !stopWords.has(w)).slice(0, 8)
}
