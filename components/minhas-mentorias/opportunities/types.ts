// Tipos do frontend para o Painel de Oportunidades.
// Estes tipos representam os dados como chegam da API (snake_case).

export type OpportunityStatus =
  | "evaluating"
  | "preparing_application"
  | "resume_sent"
  | "in_conversation"
  | "interviews"
  | "offer"
  | "finalized"

export type FinalizationType =
  | "hired"
  | "rejected"
  | "no_response"
  | "frozen"
  | "candidate_withdrew"

export type OpportunityPriority = "high" | "medium" | "low"

export type WorkModel = "remote" | "hybrid" | "onsite"

export type JobLevel = "internship" | "junior" | "mid" | "senior" | "staff" | "senior_staff" | "principal" | "distinguished" | "trainee"

export type InterviewType = "rh" | "technical" | "manager"

export type EventType =
  | "stage_change"
  | "note"
  | "mentor_comment"
  | "follow_up"
  | "interview_scheduled"
  | "message_sent"
  | "resume_linked"
  | "checklist_completed"
  | "application_sent"

export type MessageTemplateCategory =
  | "connect_recruiter"
  | "connect_employee"
  | "send_resume"
  | "reply_recruiter"
  | "thank_interview"
  | "follow_up"
  | "ask_status"
  | "negotiate_offer"
  | "decline_offer"
  | "ask_feedback"

export type ViewTab = "hoje" | "kanban" | "lista"

// --- Entidades da API (snake_case) ---

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface ApiCompany {
  id: string
  profile_id: string
  name: string
  linkedin_url: string | null
  website: string | null
  industry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ApiOpportunity {
  id: string
  profile_id: string
  company_id: string
  company_name: string
  company_linkedin_url: string | null
  title: string | null
  url: string | null
  description: string | null
  category: string | null
  city: string | null
  state: string | null
  status: OpportunityStatus
  finalization_type: FinalizationType | null
  priority: OpportunityPriority
  work_model: WorkModel | null
  job_level: JobLevel | null
  salary_range: string | null
  contact_name: string | null
  contact_role: string | null
  contact_linkedin: string | null
  interview_type: InterviewType | null
  resume_id: string | null
  checklist: ChecklistItem[] | null
  application_date: string | null
  next_follow_up_at: string | null
  next_interview_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiOpportunityEvent {
  id: string
  opportunity_id: string
  event_type: EventType
  title: string | null
  body: string | null
  from_status: string | null
  to_status: string | null
  scheduled_at: string | null
  is_completed: boolean
  completed_at: string | null
  author_id: string | null
  author_name: string | null
  occurred_at: string
  created_at: string
}

export interface ApiOpportunityResume {
  id: string
  profile_id: string
  label: string
  file_url: string
  file_size_bytes: number | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ApiMessageTemplate {
  id: string
  category: MessageTemplateCategory
  title: string
  body: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ApiSuggestedJob {
  id: string
  title: string
  company: string | null
  description: string | null
  location: string | null
  job_type: WorkModel
  level: string
  category: string
  salary_range: string | null
  application_url: string | null
  created_at: string
  already_tracked: boolean
}

// --- Dados computados ---

export interface TodayAction {
  id: string
  type:
    | "interview_soon"
    | "recruiter_waiting"
    | "offer_received"
    | "overdue_followup"
    | "resume_almost_ready"
    | "stale_opportunity"
  title: string
  subtitle: string
  urgency: "critical" | "high" | "medium" | "low"
  opportunity: ApiOpportunity
}

export interface WeeklyStats {
  applications_sent: number
  interviews_scheduled: number
  responses_received: number
  pending_actions: number
  total_active: number
}

export interface OpportunityFilters {
  stage: OpportunityStatus | "all"
  priority: OpportunityPriority | "all"
  workModel: WorkModel | "all"
  level: JobLevel | "all"
  company: string
  hasInterview: boolean | null
  awaitingFollowUp: boolean | null
}
