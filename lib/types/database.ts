// Types TypeScript para todas as tabelas do banco de dados

export type { SelectionProcessChecklistItem } from "@/lib/selection-process-checklist"
import type { SelectionProcessChecklistItem } from "@/lib/selection-process-checklist"

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
export type JobLevel = "internship" | "junior" | "mid" | "senior"
export type JobStatus = "pending" | "approved" | "rejected" | "expired"
export type JobActionType = "applied" | "link_issue" | "closed" | "liked"
export type ContentSuggestionType = "request" | "indication"
export type ContentSuggestionStatus = "pending" | "reviewed" | "approved" | "archived"
export type LanguageLevel = "basic" | "intermediate" | "advanced" | "fluent"
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
}
