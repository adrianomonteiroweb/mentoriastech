import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, opportunities, opportunityEvents } from "@/lib/db"
import { getOpportunityById } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { mapOpportunity } from "../../route"

export const dynamic = "force-dynamic"

const OPPORTUNITY_STATUSES = [
  "evaluating", "preparing_application", "resume_sent",
  "in_conversation", "interviews", "offer", "finalized",
] as const

const FINALIZATION_TYPES = [
  "hired", "rejected", "no_response", "frozen", "candidate_withdrew",
] as const

const moveSchema = z.object({
  to_status: z.enum(OPPORTUNITY_STATUSES),
  finalization_type: z.enum(FINALIZATION_TYPES).optional(),
}).refine(
  (data) => data.to_status !== "finalized" || data.finalization_type,
  { message: "Tipo de finalizacao e obrigatorio ao finalizar", path: ["finalization_type"] },
)

// Checklists default por etapa
const DEFAULT_CHECKLISTS: Record<string, { id: string; label: string; checked: boolean }[]> = {
  evaluating: [
    { id: "item-0", label: "Entendi o que a empresa faz?", checked: false },
    { id: "item-1", label: "Tenho aderencia minima?", checked: false },
    { id: "item-2", label: "A vaga faz sentido pro meu momento?", checked: false },
    { id: "item-3", label: "Existe recrutador para contato?", checked: false },
  ],
  preparing_application: [
    { id: "item-0", label: "Curriculo adaptado?", checked: false },
    { id: "item-1", label: "Projeto aderente destacado?", checked: false },
    { id: "item-2", label: "Palavras-chave da vaga incluidas?", checked: false },
    { id: "item-3", label: "Mensagem para recrutador pronta?", checked: false },
  ],
  resume_sent: [
    { id: "item-0", label: "Curriculo enviado?", checked: false },
    { id: "item-1", label: "Data registrada?", checked: false },
    { id: "item-2", label: "Recrutador identificado?", checked: false },
    { id: "item-3", label: "Follow-up agendado?", checked: false },
  ],
  in_conversation: [
    { id: "item-0", label: "Respondi o recrutador?", checked: false },
    { id: "item-1", label: "Demonstrei interesse?", checked: false },
    { id: "item-2", label: "Reforcei minha aderencia?", checked: false },
    { id: "item-3", label: "Registrei proximo passo?", checked: false },
  ],
  interviews: [
    { id: "item-0", label: "Revisitei a empresa?", checked: false },
    { id: "item-1", label: "Revisei requisitos que atendo?", checked: false },
    { id: "item-2", label: "Preparei minha apresentacao?", checked: false },
    { id: "item-3", label: "Preparei perguntas?", checked: false },
  ],
  offer: [
    { id: "item-0", label: "Comparei salario e beneficios?", checked: false },
    { id: "item-1", label: "Avaliei modelo de trabalho?", checked: false },
    { id: "item-2", label: "Avaliei crescimento?", checked: false },
    { id: "item-3", label: "Conversei com mentor?", checked: false },
  ],
  finalized: [
    { id: "item-0", label: "Registrei motivo?", checked: false },
    { id: "item-1", label: "Anotei aprendizados?", checked: false },
    { id: "item-2", label: "Salvei contatos?", checked: false },
    { id: "item-3", label: "Vale tentar de novo?", checked: false },
  ],
}

const STAGE_LABELS: Record<string, string> = {
  evaluating: "Avaliar",
  preparing_application: "Preparar candidatura",
  resume_sent: "Curriculo enviado",
  in_conversation: "Em conversa",
  interviews: "Entrevistas",
  offer: "Proposta",
  finalized: "Finalizada",
}

// POST /api/minhas-mentorias/opportunities/[id]/move
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const { id } = await params

    const existing = await getOpportunityById(id, profile.id)
    if (!existing) {
      return NextResponse.json({ error: "Oportunidade nao encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = moveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const { to_status, finalization_type } = parsed.data
    const fromStatus = existing.opportunity.status

    if (fromStatus === to_status) {
      return NextResponse.json({ error: "Ja esta nessa etapa" }, { status: 400 })
    }

    // Atualizar status + checklist da nova etapa
    const updateData: Record<string, unknown> = {
      status: to_status,
      checklist: DEFAULT_CHECKLISTS[to_status] || [],
      updatedAt: new Date(),
    }

    if (to_status === "finalized") {
      updateData.finalizationType = finalization_type
    }

    // Se moveu para resume_sent, registrar data de envio e sugerir follow-up em 5 dias
    if (to_status === "resume_sent" && !existing.opportunity.applicationDate) {
      updateData.applicationDate = new Date()
      const followUp = new Date()
      followUp.setDate(followUp.getDate() + 5)
      updateData.nextFollowUpAt = followUp
    }

    // Se recebeu proposta, prioridade alta automatica
    if (to_status === "offer") {
      updateData.priority = "high"
    }

    await db
      .update(opportunities)
      .set(updateData)
      .where(
        and(eq(opportunities.id, id), eq(opportunities.profileId, profile.id)),
      )

    // Criar evento de stage_change na timeline
    await db.insert(opportunityEvents).values({
      opportunityId: id,
      eventType: "stage_change",
      title: `${STAGE_LABELS[fromStatus] || fromStatus} → ${STAGE_LABELS[to_status] || to_status}`,
      fromStatus,
      toStatus: to_status,
    })

    const updated = await getOpportunityById(id, profile.id)
    return NextResponse.json({ data: mapOpportunity(updated!) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
