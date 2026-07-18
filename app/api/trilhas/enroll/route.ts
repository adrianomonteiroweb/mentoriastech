import { NextResponse } from "next/server"
import { z } from "zod"
import { enrollInTrack, TrackEnrollError } from "@/lib/trilhas/enroll"
import { optionalWhatsAppSchema } from "@/lib/whatsapp-schema"

const schema = z.object({
  trackId: z.string().uuid(),
  email: z.string().email("Email invalido"),
  name: z.string().optional(),
  whatsapp: optionalWhatsAppSchema,
  isReturningMentee: z.boolean().optional(),
  targetInternational: z.boolean().optional(),
  includeEnglish: z.boolean().optional(),
  englishInterviews: z.boolean().optional(),
  slotId: z.string().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione um horario"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Selecione um horario"),
  topicId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    // Mentorado de primeira vez precisa informar nome e WhatsApp.
    if (!parsed.data.isReturningMentee) {
      if (!parsed.data.name?.trim()) {
        return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 })
      }
      if (!parsed.data.whatsapp?.trim()) {
        return NextResponse.json({ error: "WhatsApp e obrigatorio" }, { status: 400 })
      }
    }

    const { enrollment } = await enrollInTrack(parsed.data)
    return NextResponse.json({ success: true, enrollment }, { status: 201 })
  } catch (error) {
    if (error instanceof TrackEnrollError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[trilha enroll] Error:", error)
    return NextResponse.json(
      { error: "Erro ao processar inscricao" },
      { status: 500 },
    )
  }
}
