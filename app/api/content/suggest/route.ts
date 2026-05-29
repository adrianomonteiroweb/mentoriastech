import { NextResponse } from "next/server"
import { z } from "zod"
import { db, contentSuggestions } from "@/lib/db"
import { toContentSuggestion } from "@/lib/db/mappers"
import { getSession } from "@/lib/utils/auth"

// Solicitacao ou indicacao de conteudo. Publico (qualquer pessoa).
const suggestSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("request"),
      title: z.string().max(200).optional(),
      description: z.string().min(5).max(2000),
    }),
    z.object({
      type: z.literal("indication"),
      title: z.string().max(200).optional(),
      url: z.string().url().max(2000).optional().or(z.literal("")),
      description: z.string().max(2000).optional(),
    }),
  ])
  .superRefine((d, ctx) => {
    if (
      d.type === "indication" &&
      !(d.url && d.url.trim()) &&
      !(d.description && d.description.trim().length >= 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um link ou uma descricao (min. 5 caracteres)",
        path: ["description"],
      })
    }
  })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = suggestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const session = await getSession().catch(() => null)
    const d = parsed.data

    const [data] = await db
      .insert(contentSuggestions)
      .values({
        userId: session?.id ?? null,
        type: d.type,
        title: d.title?.trim() || null,
        url: d.type === "indication" ? d.url?.trim() || null : null,
        description: d.description?.trim() || null,
        status: "pending",
      })
      .returning()

    return NextResponse.json({ data: toContentSuggestion(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
