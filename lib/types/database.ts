// Types TypeScript para todas as tabelas do Supabase
// Gerados a partir de supabase/schema.sql

export type UserRole = "admin" | "mentee" | "hr"
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
export type ContentType = "pdf" | "article" | "video" | "link"
export type JobType = "remote" | "hybrid" | "onsite"
export type JobLevel = "internship" | "junior" | "mid" | "senior"
export type JobStatus = "pending" | "approved" | "rejected" | "expired"
export type JobActionType = "applied" | "link_issue" | "closed"

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
  portfolio_url: string | null
  avatar_url: string | null
  career_status: CareerStatus | null
  seniority: Seniority | null
  career_focus: string | null
  created_at: string
  updated_at: string
  booking_count?: number
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
  created_at: string
}

// -----------------------------------------------------------------------------
// Bookings
// -----------------------------------------------------------------------------
export interface Booking {
  id: string
  mentee_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_whatsapp: string | null
  slot_id: string | null
  topic_id: string | null
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
  created_at: string
  updated_at: string
}

export interface BookingWithRelations extends Booking {
  mentoring_topics?: MentoringTopic | null
  mentoring_slots?: MentoringSlot | null
  profiles?: Profile | null
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------
export interface Payment {
  id: string
  booking_id: string
  amount_cents: number
  currency: string
  method: string
  status: PaymentStatus
  pix_txid: string | null
  paid_at: string | null
  created_at: string
}

export interface PaymentWithBooking extends Payment {
  bookings?: BookingWithRelations | null
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
export interface ContentItem {
  id: string
  category_id: string
  title: string
  description: string | null
  content_type: ContentType
  url: string | null
  article_body: string | null
  file_size_bytes: number | null
  is_published: boolean
  view_count: number
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
  location: string | null
  job_type: JobType
  level: JobLevel
  salary_range: string | null
  application_url: string | null
  status: JobStatus
  approved_by: string | null
  approved_at: string | null
  expires_at: string | null
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
  user_id: string
  action_type: JobActionType
  created_at: string
}

// -----------------------------------------------------------------------------
// Site Settings
// -----------------------------------------------------------------------------
export interface SiteSetting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

// Google Calendar config stored in site_settings
export interface GoogleCalendarConfig {
  refresh_token: string
  connected_at: string
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
// Admin Stats
// -----------------------------------------------------------------------------
export interface AdminStats {
  totalBookings: number
  pendingBookings: number
  totalMentees: number
  pendingJobs: number
  publishedContent: number
  completedBookings: number
}
