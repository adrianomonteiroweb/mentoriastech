// Types TypeScript para todas as tabelas do banco de dados

export type { SelectionProcessChecklistItem } from "@/lib/selection-process-checklist"
import type { SelectionProcessChecklistItem } from "@/lib/selection-process-checklist"
export type {
  SimEvaluationResult,
  SimEvaluationRule,
} from "@/lib/sim/evaluation-types"
import type {
  SimEvaluationResult,
  SimEvaluationRule,
} from "@/lib/sim/evaluation-types"

export type UserRole = "admin" | "mentor" | "mentee" | "hr"
export type SlotType = "free" | "paid" | "private"
export type TopicCategory = "free" | "paid"
export type BookingType = "free" | "paid" | "private"
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "payment_pending"
  | "paid"
  | "scheduled"
  | "completed"
  | "cancelled"
export type CareerStatus =
  | "seeking"
  | "interning"
  | "employed"
  | "student"
  | "other"
export type Seniority = "junior" | "mid" | "senior" | "undefined"
export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded"
export type PixAmountIncludesIof = "always" | "never"
export type ContentType = "pdf" | "article" | "video" | "link"
export type JobType = "remote" | "hybrid" | "onsite"
export type JobLevel = "internship" | "junior" | "mid" | "senior" | "staff" | "senior_staff" | "principal" | "distinguished"
export type JobStatus = "pending" | "approved" | "rejected" | "expired"
export type JobActionType = "applied" | "link_issue" | "closed" | "liked"
export type ContentSuggestionType = "request" | "indication"
export type ContentSuggestionStatus = "pending" | "reviewed" | "approved" | "archived"
export type LanguageLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "basic" | "intermediate" | "advanced" | "fluent"
export type TipPlacement = "content" | "jobs" | "both"
export type JobCategory = string
export type OriginCategory = "linkedin" | "palestra" | "indicacao" | "instagram" | "evento"
export type BookingAttachmentType = "file" | "note" | "audio"
export type BookingTaskItemType = "comment" | "file" | "audio"

export interface BookingTaskApi {
  id: string
  booking_id: string
  mentee_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
  updated_at: string
  items: BookingTaskItemApi[]
}

export interface BookingTaskItemApi {
  id: string
  task_id: string
  type: BookingTaskItemType
  title: string | null
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size_bytes: number | null
  mime_type: string | null
  duration_seconds: number | null
  uploaded_by: string | null
  created_at: string
}

export interface MentorshipChecklistSnapshotItem {
  id: string
  label: string
  checked: boolean
}

// -----------------------------------------------------------------------------
// Profiles
// -----------------------------------------------------------------------------
export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  whatsapp: string | null
  linkedin_url: string | null
  bio: string | null
  resume_url: string | null
  resume_markdown: string | null
  portfolio_url: string | null
  avatar_url: string | null
  career_status: CareerStatus | null
  seniority: Seniority | null
  career_focus: string | null
  origin_category: OriginCategory | null
  origin_description: string | null
  created_at: string
  updated_at: string
  booking_count?: number
  selection_processes?: MenteeSelectionProcessSummary[]
}

export interface MenteeSelectionProcessSummary {
  id: string
  company: string
  position: string
  status: SelectionProcessStatus
}

export interface UserRoleAssignment {
  user_id: string
  role: UserRole
  assigned_by: string | null
  assigned_at: string
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Mentoring Slots
// -----------------------------------------------------------------------------
export interface MentoringSlot {
  id: string
  day_of_week: number | null // 0=Domingo, 6=Sábado — nullable para slots com rrule
  start_time: string // "HH:MM:SS"
  slot_type: SlotType
  is_active: boolean
  rrule: string | null // Ex: "FREQ=WEEKLY;BYDAY=MO,WE"
  recurrence_start: string | null // "YYYY-MM-DD"
  recurrence_end: string | null // "YYYY-MM-DD"
  mentor_id: string
  created_at: string
}

// -----------------------------------------------------------------------------
// Mentoring Topics
// -----------------------------------------------------------------------------
export interface MentoringTopic {
  id: string
  name: string
  category: TopicCategory
  description: string | null
  is_active: boolean
  sort_order: number
  mentor_id: string
  created_at: string
}

// -----------------------------------------------------------------------------
// Paid Mentorships
// -----------------------------------------------------------------------------
export interface PaidMentorship {
  id: string
  title: string
  description: string
  image_url: string | null
  image_alt: string | null
  amount_cents: number
  currency: string
  pix_expires_after_seconds: number
  pix_amount_includes_iof: PixAmountIncludesIof
  mentor_id: string | null
  mentor_email: string
  sort_order: number
  is_active: boolean
  view_count: number
  click_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PublicPaidMentorship = Omit<
  PaidMentorship,
  "mentor_email" | "created_by" | "created_at" | "updated_at" | "view_count" | "click_count"
>

// -----------------------------------------------------------------------------
// Bookings
// -----------------------------------------------------------------------------
export type AITranscriptStatus = "pending" | "processing" | "done" | "failed"

export interface Booking {
  id: string
  mentor_id: string | null
  mentee_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_whatsapp: string | null
  slot_id: string | null
  topic_id: string | null
  paid_mentorship_id: string | null
  session_date: string | null // "YYYY-MM-DD"
  start_time: string | null // "HH:MM:SS"
  booking_type: BookingType
  status: BookingStatus
  notes: string | null
  google_event_id: string | null
  google_meet_url: string | null
  topics_discussed: string | null
  mentee_strengths: string | null
  mentee_growth_areas: string | null
  admin_notes: string | null
  ai_transcript: string | null
  ai_summary: string | null
  ai_transcript_status: AITranscriptStatus | null
  mentorship_checklist: MentorshipChecklistSnapshotItem[] | null
  origin_category: OriginCategory | null
  origin_description: string | null
  created_at: string
  updated_at: string
}

export interface BookingWithRelations extends Booking {
  mentoring_topics?: MentoringTopic | null
  mentoring_slots?: MentoringSlot | null
  paid_mentorships?: PublicPaidMentorship | null
  profiles?: Profile | null
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------
export interface Payment {
  id: string
  booking_id: string
  paid_mentorship_id: string | null
  amount_cents: number
  currency: string
  method: string
  status: PaymentStatus
  pix_txid: string | null
  stripe_payment_intent_id: string | null
  stripe_payment_intent_status: string | null
  pagarme_order_id: string | null
  pagarme_charge_id: string | null
  pagarme_status: string | null
  pix_qr_code_data: string | null
  pix_qr_code_image_url_png: string | null
  pix_qr_code_image_url_svg: string | null
  pix_hosted_instructions_url: string | null
  pix_expires_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithBooking extends Payment {
  bookings?: BookingWithRelations | null
  paid_mentorships?: PublicPaidMentorship | null
}

// -----------------------------------------------------------------------------
// Content Categories
// -----------------------------------------------------------------------------
export interface ContentCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
}

// -----------------------------------------------------------------------------
// Content Items
// -----------------------------------------------------------------------------
export interface ContentLink {
  url: string
  label: string
}

export interface ContentItem {
  id: string
  category_id: string
  title: string
  description: string | null
  content_type: ContentType
  url: string | null
  links: ContentLink[] | null
  article_body: string | null
  file_size_bytes: number | null
  is_published: boolean
  view_count: number
  share_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContentItemWithCategory extends ContentItem {
  content_categories?: ContentCategory | null
}

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------
export interface Job {
  id: string
  posted_by: string | null
  title: string
  company: string | null
  description: string | null
  description_en: string | null
  stack_tags: string[]
  recommendation_note: string | null
  location: string | null
  job_type: JobType
  level: JobLevel
  category: JobCategory
  salary_range: string | null
  application_url: string | null
  is_international: boolean
  required_language: string | null
  language_level: LanguageLevel | null
  summary: string | null
  important_note: string | null
  status: JobStatus
  approved_by: string | null
  approved_at: string | null
  expires_at: string | null
  view_count: number
  click_count: number
  share_count: number
  source_posted_at: string
  created_at: string
  updated_at: string
}

export interface JobWithAuthor extends Job {
  profiles?: Profile | null
}

// -----------------------------------------------------------------------------
// Job Actions
// -----------------------------------------------------------------------------
export interface JobAction {
  id: string
  job_id: string
  user_id: string | null
  visitor_hash: string | null
  action_type: JobActionType
  created_at: string
}

// -----------------------------------------------------------------------------
// Content Suggestions — solicitações e indicações da comunidade
// -----------------------------------------------------------------------------
export interface ContentSuggestion {
  id: string
  user_id: string | null
  type: ContentSuggestionType
  title: string | null
  url: string | null
  description: string | null
  status: ContentSuggestionStatus
  created_at: string
  updated_at: string
}

export interface ContentSuggestionWithUser extends ContentSuggestion {
  profiles?: Profile | null
}

// -----------------------------------------------------------------------------
// Ads
// -----------------------------------------------------------------------------
export interface Ad {
  id: string
  title: string
  description: string | null
  image_url: string | null
  image_alt: string | null
  whatsapp_number: string | null
  whatsapp_message: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  view_count: number
  click_count: number
  max_clicks: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Tips
// -----------------------------------------------------------------------------
export interface Tip {
  id: string
  title: string
  body: string
  placement: TipPlacement
  sort_order: number
  is_active: boolean
  is_fixed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Site Settings
// -----------------------------------------------------------------------------
export interface SiteSetting {
  key: string
  value: unknown
  updated_at: string
}

// Google Calendar metadata stored in site_settings. Secrets live in site_private_settings.
export interface GoogleCalendarConfig {
  is_connected: boolean
  connected_at: string | null
}

// -----------------------------------------------------------------------------
// Learning Tracks (Trilhas)
// -----------------------------------------------------------------------------
export type TrackPhaseKey =
  | "positioning"
  | "english"
  | "interview_rh"
  | "interview_tech"
  | "interview_manager"
  | "job_search"
export type TrackEnrollmentStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
export type TrackPhaseStatus =
  | "locked"
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "skipped"

export interface LearningTrack {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  supports_english: boolean
  english_paid_mentorship_id: string | null
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LearningTrackPhase {
  id: string
  track_id: string
  phase_key: TrackPhaseKey
  title: string
  description: string | null
  sort_order: number
  is_optional: boolean
  created_at: string
}

export interface LearningTrackPhaseWithContent extends LearningTrackPhase {
  content: ContentItem[]
}

export interface LearningTrackWithPhases extends LearningTrack {
  phases: LearningTrackPhaseWithContent[]
  english_mentorship?: PublicPaidMentorship | null
}

export interface TrackEnrollment {
  id: string
  track_id: string | null
  mentee_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_whatsapp: string | null
  target_international: boolean
  include_english: boolean
  english_interviews: boolean
  requested_slot_id: string | null
  requested_session_date: string | null
  requested_start_time: string | null
  requested_topic_id: string | null
  status: TrackEnrollmentStatus
  notes: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface TrackEnrollmentPhase {
  id: string
  enrollment_id: string
  phase_key: TrackPhaseKey
  title: string
  sort_order: number
  status: TrackPhaseStatus
  booking_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TrackEnrollmentPhaseWithDetails extends TrackEnrollmentPhase {
  content: ContentItem[]
  booking?: Pick<Booking, "id" | "session_date" | "start_time" | "status" | "google_meet_url"> | null
}

export interface TrackEnrollmentWithDetails extends TrackEnrollment {
  track?: Pick<
    LearningTrack,
    "id" | "title" | "slug" | "supports_english" | "cover_image_url"
  > | null
  phases: TrackEnrollmentPhaseWithDetails[]
  english_mentorship?: PublicPaidMentorship | null
}

// -----------------------------------------------------------------------------
// API Response types
// -----------------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// -----------------------------------------------------------------------------
// Selection Processes
// -----------------------------------------------------------------------------
export type SelectionProcessStatus = "open" | "closed"

export interface SelectionProcess {
  id: string
  company: string
  position: string
  description: string | null
  status: SelectionProcessStatus
  created_by: string | null
  created_at: string
  updated_at: string
  candidate_count?: number
}

export interface SelectionProcessCandidate {
  id: string
  process_id: string
  mentee_id: string
  score: number | null
  checklist: SelectionProcessChecklistItem[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SelectionProcessCandidateWithProfile extends SelectionProcessCandidate {
  profiles?: Profile | null
  booking_count?: number
}

// -----------------------------------------------------------------------------
// Selection Process Share Links
// -----------------------------------------------------------------------------
export type ShareLinkPermission = "view" | "edit"

export interface SelectionProcessShareLink {
  id: string
  process_id: string
  token: string
  permission: ShareLinkPermission
  label: string | null
  created_by: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Admin Stats
// -----------------------------------------------------------------------------
export interface TopicRanking {
  topicId: string
  topicName: string
  category: "free" | "paid"
  bookingCount: number
}

export interface MostRequestedMentorship {
  name: string
  count: number
}

export interface TopJob {
  id: string
  title: string
  company: string | null
  views: number
  clicks: number
}

export interface TopContent {
  id: string
  title: string
  views: number
}

export interface PeriodValues {
  today: number
  week: number
  month: number
  prevMonth: number
}

export interface ToolPeriodStats {
  clicks: PeriodValues
  uses: PeriodValues
}

export interface AdminStatsTimeSeries {
  mentorias: {
    completed: PeriodValues
    pending: PeriodValues
    mentees: PeriodValues
    total: PeriodValues
  }
  receita: {
    revenueCents: PeriodValues
    paidConversion: PeriodValues
  }
  publico: {
    visits: PeriodValues
    clicks: PeriodValues
    newMentees: PeriodValues
    adsConversion: PeriodValues
  }
  ferramentas: {
    resume: ToolPeriodStats
    linkedin: ToolPeriodStats
  }
}

export interface AdminStats {
  totalBookings: number
  pendingBookings: number
  totalMentees: number
  pendingJobs: number
  publishedContent: number
  completedBookings: number
  reportedJobs: number
  totalApplications: number
  totalPageShares: number
  totalContentShares: number
  totalJobShares: number
  totalShares: number
  minhasMentoriasToolUses: number
  minhasMentoriasResumeToolUses: number
  minhasMentoriasLinkedinToolUses: number
  minhasMentoriasOpportunityToolUses: number
  minhasMentoriasResumeJobToolUses: number
  adsConversionRate: number
  paidConversionRate: number
  monthlyPaidRevenueCents: number
  totalPaidRevenueCents: number
  avgTicketCents: number
  newMenteesThisMonth: number
  completionRate: number
  publicVisits: number
  publicClicks: number
  publicConversionRate: number
  visitsToday: number
  visitsThisWeek: number
  visitsThisMonth: number
  mostRequestedPaid: MostRequestedMentorship | null
  mostRequestedFree: MostRequestedMentorship | null
  timeSeries: AdminStatsTimeSeries
}

// -----------------------------------------------------------------------------
// SPRINT SIMULATOR — tipos da API (snake_case, consumidos pelos componentes)
// -----------------------------------------------------------------------------

export type SimCompanyArchetype = "startup" | "saas" | "enterprise"
export type SimTaskStatus = "backlog" | "todo" | "doing" | "review" | "done"
export type SimTaskType =
  | "feature"
  | "bug"
  | "refactor"
  | "architecture"
  | "increment"
export type SimApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
export type SimSprintStatus = "active" | "completed" | "cancelled"
export type SimAuthorRole = "mentee" | "mentor"
export type SimScoreSource = "auto" | "manual"
export type SimScoreCategory =
  | "structure"
  | "code"
  | "tests"
  | "architecture"
  | "communication"
  | "general"
  | "agile"
/** Tipo da mensagem na daily: progresso (standup), impedimento ou dúvida. */
export type SimDailyMessageKind = "daily" | "impediment" | "doubt"

export interface SimCompanyApi {
  id: string
  name: string
  archetype: SimCompanyArchetype
  description: string | null
  product_description: string | null
  client_description: string | null
  service_description: string | null
  process_description: string | null
  po_doc_markdown: string | null
  pm_doc_markdown: string | null
  tech_lead_doc_markdown: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SimTemplateTaskApi {
  id: string
  template_id: string
  title: string
  description: string | null
  task_type: SimTaskType
  points: number
  initial_status: "backlog" | "todo"
  sort_order: number
  evaluation_rules?: SimEvaluationRule[] | null
  solution_markdown: string | null
  created_at: string
}

export interface SimSprintTemplateApi {
  id: string
  company_id: string
  title: string
  objective: string | null
  level: number
  duration_days: number
  is_active: boolean
  sort_order: number
  created_at: string
  company?: Pick<SimCompanyApi, "id" | "name" | "archetype"> | null
  tasks?: SimTemplateTaskApi[]
  task_count?: number
  my_application_status?: SimApplicationStatus | null
}

export interface SimApplicationApi {
  id: string
  profile_id: string
  template_id: string
  message: string | null
  status: SimApplicationStatus
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  template?: Pick<
    SimSprintTemplateApi,
    "id" | "title" | "level" | "duration_days"
  > | null
  company?: Pick<SimCompanyApi, "id" | "name" | "archetype"> | null
  mentee?: { id: string; full_name: string | null; email: string } | null
}

export interface SimSprintTaskApi {
  id: string
  sprint_id: string
  task_number: number
  title: string
  description: string | null
  task_type: SimTaskType
  points: number
  status: SimTaskStatus
  sort_order: number
  has_rules: boolean
  last_evaluation: SimEvaluationResult | null
  /** Gabarito liberado pelo mentor? (sempre presente; conteúdo só quando liberado) */
  solution_released: boolean
  /** Só preenchido quando liberado (mentee) ou p/ o mentor; senão null. */
  solution_markdown: string | null
  submitted_at: string | null
  approved_at: string | null
  created_at: string
}

export interface SimScoreEventApi {
  id: string
  sprint_id: string
  task_id: string | null
  message_id: string | null
  source: SimScoreSource
  category: SimScoreCategory
  delta: number
  reason: string
  sprint_day: number
  event_key: string | null
  created_at: string
}

export interface SimDailyMessageApi {
  id: string
  sprint_id: string
  author_role: SimAuthorRole
  kind: SimDailyMessageKind
  author_name: string | null
  body: string
  task_id: string | null
  task_number: number | null
  sprint_day: number
  read_at: string | null
  created_at: string
  score_event?: Pick<
    SimScoreEventApi,
    "id" | "delta" | "reason" | "category"
  > | null
}

export interface SimSprintApi {
  id: string
  profile_id: string
  title: string
  objective: string | null
  duration_days: number
  current_day: number
  status: SimSprintStatus
  started_at: string
  ended_at: string | null
  final_score: number | null
  final_feedback: string | null
  created_at: string
  company?: Pick<SimCompanyApi, "id" | "name" | "archetype"> | null
  total_score?: number
  done_count?: number
  task_count?: number
  unread_count?: number
  doubt_count?: number
}

export interface SimSprintHubApi extends SimSprintApi {
  tasks: SimSprintTaskApi[]
  company_docs: Pick<
    SimCompanyApi,
    | "name"
    | "archetype"
    | "description"
    | "product_description"
    | "client_description"
    | "service_description"
    | "process_description"
    | "po_doc_markdown"
    | "pm_doc_markdown"
    | "tech_lead_doc_markdown"
  > | null
}

export interface SimSprintMonitorRowApi extends SimSprintApi {
  mentee: { id: string; full_name: string | null; email: string } | null
  last_activity_at: string | null
}
