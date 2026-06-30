import type { ChecklistItem, OpportunityStatus, InterviewType } from "./types"

// --- Etapas do pipeline ---

export interface StageDefinition {
  key: OpportunityStatus
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
}

export const STAGES: StageDefinition[] = [
  { key: "evaluating", label: "Avaliar", shortLabel: "Avaliar", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40" },
  { key: "preparing_application", label: "Preparar candidatura", shortLabel: "Preparar", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40" },
  { key: "resume_sent", label: "Curriculo enviado", shortLabel: "Enviado", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/40" },
  { key: "in_conversation", label: "Em conversa", shortLabel: "Conversa", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/40" },
  { key: "interviews", label: "Entrevistas", shortLabel: "Entrevista", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40" },
  { key: "offer", label: "Proposta", shortLabel: "Proposta", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/40" },
  { key: "finalized", label: "Finalizadas", shortLabel: "Finalizada", color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/40" },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<OpportunityStatus, StageDefinition>

// --- Checklists default por etapa ---

function makeChecklist(items: string[]): ChecklistItem[] {
  return items.map((label, i) => ({
    id: `item-${i}`,
    label,
    checked: false,
  }))
}

export const DEFAULT_CHECKLISTS: Record<OpportunityStatus, ChecklistItem[]> = {
  evaluating: makeChecklist([
    "Entendi o que a empresa faz?",
    "Tenho aderencia minima?",
    "A vaga faz sentido pro meu momento?",
    "Existe recrutador para contato?",
  ]),
  preparing_application: makeChecklist([
    "Curriculo adaptado?",
    "Projeto aderente destacado?",
    "Palavras-chave da vaga incluidas?",
    "Mensagem para recrutador pronta?",
  ]),
  resume_sent: makeChecklist([
    "Curriculo enviado?",
    "Data registrada?",
    "Recrutador identificado?",
    "Follow-up agendado?",
  ]),
  in_conversation: makeChecklist([
    "Respondi o recrutador?",
    "Demonstrei interesse?",
    "Reforcei minha aderencia?",
    "Registrei proximo passo?",
  ]),
  interviews: makeChecklist([
    "Revisitei a empresa?",
    "Revisei requisitos que atendo?",
    "Preparei minha apresentacao?",
    "Preparei perguntas?",
  ]),
  offer: makeChecklist([
    "Comparei salario e beneficios?",
    "Avaliei modelo de trabalho?",
    "Avaliei crescimento?",
    "Conversei com mentor?",
  ]),
  finalized: makeChecklist([
    "Registrei motivo?",
    "Anotei aprendizados?",
    "Salvei contatos?",
    "Vale tentar de novo?",
  ]),
}

// Checklists especificos por tipo de entrevista
export const INTERVIEW_CHECKLISTS: Record<InterviewType, ChecklistItem[]> = {
  rh: makeChecklist([
    "Revisitei a empresa?",
    "Revisei requisitos que atendo?",
    "Preparei minha apresentacao?",
    "Preparei perguntas pro RH?",
  ]),
  technical: makeChecklist([
    "Revisei linguagem da vaga?",
    "Revisei framework principal?",
    "Preparei explicacao de projeto?",
    "Revisei boas praticas?",
  ]),
  manager: makeChecklist([
    "Revisei empresa e produtos?",
    "Exercitei minha trajetoria?",
    "Preparei perguntas sobre carreira?",
    "Pronto pra ser autentico?",
  ]),
}

// --- Labels de UI ---

export const PRIORITY_CONFIG = {
  high: { label: "Alta", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/40" },
  medium: { label: "Media", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40" },
  low: { label: "Baixa", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40" },
} as const

export const WORK_MODEL_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Hibrido",
  onsite: "Presencial",
}

export const JOB_LEVEL_LABELS: Record<string, string> = {
  internship: "Estagio",
  junior: "Junior",
  mid: "Pleno",
  senior: "Senior",
  staff: "Staff",
  senior_staff: "Senior Staff",
  principal: "Principal",
  distinguished: "Distinguished",
  trainee: "Trainee",
}

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  rh: "RH",
  technical: "Tecnica",
  manager: "Gestor",
}

export const FINALIZATION_LABELS: Record<string, string> = {
  hired: "Contratado",
  rejected: "Recusado",
  no_response: "Sem retorno",
  frozen: "Congelado",
  candidate_withdrew: "Desistencia",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  stage_change: "Mudanca de etapa",
  note: "Anotacao",
  mentor_comment: "Comentario do mentor",
  follow_up: "Follow-up",
  interview_scheduled: "Entrevista agendada",
  message_sent: "Mensagem enviada",
  resume_linked: "Curriculo vinculado",
  checklist_completed: "Checklist completo",
  application_sent: "Candidatura enviada",
}

// --- Microcopy ---

export const TODAY_ACTION_LABELS = {
  interview_soon: {
    title: "Preparar entrevista",
    icon: "calendar",
  },
  recruiter_waiting: {
    title: "Responder recrutador",
    icon: "message-circle",
  },
  offer_received: {
    title: "Avaliar proposta",
    icon: "gift",
  },
  overdue_followup: {
    title: "Fazer follow-up",
    icon: "clock",
  },
  resume_almost_ready: {
    title: "Finalizar candidatura",
    icon: "file-text",
  },
  stale_opportunity: {
    title: "Dar atencao a esta candidatura",
    icon: "alert-triangle",
  },
} as const
