import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

// -----------------------------------------------------------------------------
// PROFILES — perfis de usuário (auth + dados)
// -----------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "mentee", "hr"] }).notNull().default("mentee"),
  fullName: text("full_name"),
  whatsapp: text("whatsapp"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"),
  resumeUrl: text("resume_url"),
  portfolioUrl: text("portfolio_url"),
  avatarUrl: text("avatar_url"),
  careerStatus: text("career_status", {
    enum: ["seeking", "interning", "employed", "student", "other"],
  }),
  seniority: text("seniority", { enum: ["junior", "mid", "senior", "undefined"] }),
  careerFocus: text("career_focus"),
  originCategory: text("origin_category", {
    enum: ["linkedin", "palestra", "indicacao", "instagram", "evento"],
  }),
  originDescription: text("origin_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// MENTORING_SLOTS — horários disponíveis
// -----------------------------------------------------------------------------
export const mentoringSlots = pgTable("mentoring_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week"),
  startTime: time("start_time").notNull(),
  slotType: text("slot_type", { enum: ["free", "paid", "private"] }).notNull().default("free"),
  isActive: boolean("is_active").notNull().default(true),
  rrule: text("rrule"),
  recurrenceStart: date("recurrence_start"),
  recurrenceEnd: date("recurrence_end"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// MENTORING_TOPICS — temas de mentoria
// -----------------------------------------------------------------------------
export const mentoringTopics = pgTable("mentoring_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category", { enum: ["free", "paid"] }).notNull().default("free"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// BOOKINGS — agendamentos
// -----------------------------------------------------------------------------
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  menteeId: uuid("mentee_id").references(() => profiles.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestWhatsapp: text("guest_whatsapp"),
  slotId: uuid("slot_id").references(() => mentoringSlots.id),
  topicId: uuid("topic_id").references(() => mentoringTopics.id),
  sessionDate: date("session_date"),
  startTime: time("start_time"),
  bookingType: text("booking_type", { enum: ["free", "paid", "private"] }).notNull().default("free"),
  status: text("status", {
    enum: ["pending", "confirmed", "payment_pending", "paid", "scheduled", "completed", "cancelled"],
  }).notNull().default("pending"),
  notes: text("notes"),
  googleEventId: text("google_event_id"),
  googleMeetUrl: text("google_meet_url"),
  topicsDiscussed: text("topics_discussed"),
  menteeStrengths: text("mentee_strengths"),
  menteeGrowthAreas: text("mentee_growth_areas"),
  adminNotes: text("admin_notes"),
  mentorshipChecklist: jsonb("mentorship_checklist").$type<
    { id: string; label: string; checked: boolean }[]
  >(),
  originCategory: text("origin_category", {
    enum: ["linkedin", "palestra", "indicacao", "instagram", "evento"],
  }),
  originDescription: text("origin_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// PAYMENTS — pagamentos
// -----------------------------------------------------------------------------
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("BRL"),
  method: text("method").notNull().default("pix"),
  status: text("status", { enum: ["pending", "confirmed", "failed", "refunded"] }).notNull().default("pending"),
  pixTxid: text("pix_txid"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// CONTENT_CATEGORIES
// -----------------------------------------------------------------------------
export const contentCategories = pgTable("content_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// CONTENT_ITEMS
// -----------------------------------------------------------------------------
export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => contentCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type", { enum: ["pdf", "article", "video", "link"] }).notNull(),
  url: text("url"),
  links: jsonb("links"),
  articleBody: text("article_body"),
  fileSizeBytes: integer("file_size_bytes"),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// JOBS — quadro de vagas
// -----------------------------------------------------------------------------
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  postedBy: uuid("posted_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  jobType: text("job_type", { enum: ["remote", "hybrid", "onsite"] }).notNull().default("remote"),
  level: text("level", { enum: ["internship", "junior", "mid", "senior"] }).notNull().default("junior"),
  category: text("category").notNull().default("other"),
  salaryRange: text("salary_range"),
  applicationUrl: text("application_url"),
  isInternational: boolean("is_international").notNull().default(false),
  requiredLanguage: text("required_language"),
  languageLevel: text("language_level", { enum: ["basic", "intermediate", "advanced", "fluent"] }),
  status: text("status", { enum: ["pending", "approved", "rejected", "expired"] }).notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// SITE_SETTINGS
// -----------------------------------------------------------------------------
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const sitePrivateSettings = pgTable("site_private_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// PAGE_SHARES — contadores de compartilhamento para páginas públicas sem tabela
// -----------------------------------------------------------------------------
export const pageShares = pgTable("page_shares", {
  path: text("path").primaryKey(),
  label: text("label").notNull(),
  shareCount: integer("share_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// SESSIONS — sessões de auth (cookie-based)
// -----------------------------------------------------------------------------
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// MENTEE_ACCESS_CODES — códigos one-time enviados por email para área Minhas Mentorias
// -----------------------------------------------------------------------------
export const menteeAccessCodes = pgTable("mentee_access_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// MENTEE_ACCESS_SESSIONS — sessões isoladas da área Minhas Mentorias (vinculadas por email)
// -----------------------------------------------------------------------------
export const menteeAccessSessions = pgTable("mentee_access_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// CONTENT_VIEWS — rastreamento de visitantes únicos por conteúdo
// -----------------------------------------------------------------------------
export const contentViews = pgTable("content_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  visitorHash: text("visitor_hash").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// ADS — anúncios de serviços indicados pelo admin
// -----------------------------------------------------------------------------
export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  whatsappNumber: text("whatsapp_number"),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  maxClicks: integer("max_clicks"),  // null = sem limite
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// TIPS - dicas exibidas nas telas públicas
// -----------------------------------------------------------------------------
export const tips = pgTable("tips", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  placement: text("placement", { enum: ["content", "jobs", "both"] }).notNull().default("both"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFixed: boolean("is_fixed").notNull().default(false),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// JOB_ACTIONS — ações de mentorados em vagas
// -----------------------------------------------------------------------------
export const jobActions = pgTable("job_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  actionType: text("action_type", { enum: ["applied", "link_issue", "closed"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// -----------------------------------------------------------------------------
// TYPE EXPORTS
// -----------------------------------------------------------------------------
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type MentoringSlot = typeof mentoringSlots.$inferSelect
export type MentoringTopic = typeof mentoringTopics.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type Payment = typeof payments.$inferSelect
export type ContentCategory = typeof contentCategories.$inferSelect
export type ContentItem = typeof contentItems.$inferSelect
export type Job = typeof jobs.$inferSelect
export type PageShare = typeof pageShares.$inferSelect
export type ContentView = typeof contentViews.$inferSelect
export type JobAction = typeof jobActions.$inferSelect
export type Ad = typeof ads.$inferSelect
export type NewAd = typeof ads.$inferInsert
export type Tip = typeof tips.$inferSelect
export type NewTip = typeof tips.$inferInsert
export type SiteSetting = typeof siteSettings.$inferSelect
export type SitePrivateSetting = typeof sitePrivateSettings.$inferSelect
export type Session = typeof sessions.$inferSelect
export type MenteeAccessCode = typeof menteeAccessCodes.$inferSelect
export type MenteeAccessSession = typeof menteeAccessSessions.$inferSelect
