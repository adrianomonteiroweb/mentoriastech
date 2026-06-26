import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { DEFAULT_AD_WHATSAPP_MESSAGE } from "@/lib/ad-whatsapp";

// -----------------------------------------------------------------------------
// PROFILES — perfis de usuário (auth + dados)
// -----------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "mentor", "mentee", "hr"] })
    .notNull()
    .default("mentee"),
  fullName: text("full_name"),
  whatsapp: text("whatsapp"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"),
  resumeUrl: text("resume_url"),
  resumeMarkdown: text("resume_markdown"),
  linkedinPdfUrl: text("linkedin_pdf_url"),
  portfolioUrl: text("portfolio_url"),
  avatarUrl: text("avatar_url"),
  careerStatus: text("career_status", {
    enum: ["seeking", "interning", "employed", "student", "other"],
  }),
  seniority: text("seniority", {
    enum: ["junior", "mid", "senior", "undefined"],
  }),
  careerFocus: text("career_focus"),
  passwordHash: text("password_hash"),
  originCategory: text("origin_category", {
    enum: ["linkedin", "palestra", "indicacao", "instagram", "evento"],
  }),
  originDescription: text("origin_description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin", "mentor", "mentee", "hr"] })
    .notNull()
    .default("mentee"),
  assignedBy: uuid("assigned_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// MENTORING_SLOTS — horários disponíveis
// -----------------------------------------------------------------------------
export const mentoringSlots = pgTable("mentoring_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week"),
  startTime: time("start_time").notNull(),
  slotType: text("slot_type", { enum: ["free", "paid", "private"] })
    .notNull()
    .default("free"),
  isActive: boolean("is_active").notNull().default(true),
  rrule: text("rrule"),
  recurrenceStart: date("recurrence_start"),
  recurrenceEnd: date("recurrence_end"),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// MENTORING_TOPICS — temas de mentoria
// -----------------------------------------------------------------------------
export const mentoringTopics = pgTable("mentoring_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category", { enum: ["free", "paid"] })
    .notNull()
    .default("free"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paidMentorships = pgTable(
  "paid_mentorships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    pixExpiresAfterSeconds: integer("pix_expires_after_seconds")
      .notNull()
      .default(86400),
    pixAmountIncludesIof: text("pix_amount_includes_iof", {
      enum: ["always", "never"],
    })
      .notNull()
      .default("never"),
    mentorId: uuid("mentor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    mentorEmail: text("mentor_email").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("paid_mentorships_amount_min", sql`${table.amountCents} >= 50`),
    check(
      "paid_mentorships_pix_expiration_range",
      sql`${table.pixExpiresAfterSeconds} BETWEEN 10 AND 1209600`,
    ),
  ],
);

// -----------------------------------------------------------------------------
// BOOKINGS — agendamentos
// -----------------------------------------------------------------------------
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorId: uuid("mentor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  menteeId: uuid("mentee_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestWhatsapp: text("guest_whatsapp"),
  slotId: uuid("slot_id").references(() => mentoringSlots.id, {
    onDelete: "set null",
  }),
  topicId: uuid("topic_id").references(() => mentoringTopics.id),
  paidMentorshipId: uuid("paid_mentorship_id").references(
    () => paidMentorships.id,
    { onDelete: "set null" },
  ),
  sessionDate: date("session_date"),
  startTime: time("start_time"),
  bookingType: text("booking_type", { enum: ["free", "paid", "private"] })
    .notNull()
    .default("free"),
  status: text("status", {
    enum: [
      "pending",
      "confirmed",
      "payment_pending",
      "paid",
      "scheduled",
      "completed",
      "cancelled",
    ],
  })
    .notNull()
    .default("pending"),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// BOOKING_HISTORY_SYNC_QUEUE - fila de sincronizacao offline-first do historico
// -----------------------------------------------------------------------------
export const bookingHistorySyncQueue = pgTable("booking_history_sync_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status", { enum: ["pending", "processed", "failed"] })
    .notNull()
    .default("pending"),
  error: text("error"),
  clientCreatedAt: timestamp("client_created_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// BOOKING_ATTACHMENTS — anexos de mentoria (arquivos, notas, audio)
// -----------------------------------------------------------------------------
export const bookingAttachments = pgTable("booking_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["file", "note", "audio"] }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: text("mime_type"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// BOOKING_TASKS — tarefas/checklist de mentoria
// -----------------------------------------------------------------------------
export const bookingTasks = pgTable("booking_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  menteeId: uuid("mentee_id")
    .notNull()
    .references(() => profiles.id),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BookingTask = typeof bookingTasks.$inferSelect;

// -----------------------------------------------------------------------------
// BOOKING_TASK_ITEMS — itens de tarefa (comentario, arquivo, audio)
// -----------------------------------------------------------------------------
export const bookingTaskItems = pgTable("booking_task_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => bookingTasks.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["comment", "file", "audio"] }).notNull(),
  title: text("title"),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: text("mime_type"),
  durationSeconds: integer("duration_seconds"),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BookingTaskItem = typeof bookingTaskItems.$inferSelect;

// -----------------------------------------------------------------------------
// PAYMENTS — pagamentos
// -----------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    paidMentorshipId: uuid("paid_mentorship_id").references(
      () => paidMentorships.id,
      { onDelete: "set null" },
    ),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    method: text("method").notNull().default("pix"),
    status: text("status", {
      enum: ["pending", "confirmed", "failed", "refunded"],
    })
      .notNull()
      .default("pending"),
    pixTxid: text("pix_txid"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripePaymentIntentStatus: text("stripe_payment_intent_status"),
    pagarmeOrderId: text("pagarme_order_id"),
    pagarmeChargeId: text("pagarme_charge_id"),
    pagarmeStatus: text("pagarme_status"),
    pixQrCodeData: text("pix_qr_code_data"),
    pixQrCodeImageUrlPng: text("pix_qr_code_image_url_png"),
    pixQrCodeImageUrlSvg: text("pix_qr_code_image_url_svg"),
    pixHostedInstructionsUrl: text("pix_hosted_instructions_url"),
    pixExpiresAt: timestamp("pix_expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_stripe_payment_intent_id_unique").on(
      table.stripePaymentIntentId,
    ),
    uniqueIndex("payments_pagarme_charge_id_unique").on(table.pagarmeChargeId),
  ],
);

// -----------------------------------------------------------------------------
// CONTENT_CATEGORIES
// -----------------------------------------------------------------------------
export const contentCategories = pgTable("content_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// CONTENT_ITEMS
// -----------------------------------------------------------------------------
export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => contentCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type", {
    enum: ["pdf", "article", "video", "link"],
  }).notNull(),
  url: text("url"),
  links: jsonb("links"),
  articleBody: text("article_body"),
  fileSizeBytes: integer("file_size_bytes"),
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// JOBS — curadoria de vagas
// -----------------------------------------------------------------------------
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  postedBy: uuid("posted_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description"),
  descriptionEn: text("description_en"),
  stackTags: text("stack_tags").array().notNull().default([]),
  recommendationNote: text("recommendation_note"),
  location: text("location"),
  jobType: text("job_type", { enum: ["remote", "hybrid", "onsite"] })
    .notNull()
    .default("remote"),
  level: text("level", { enum: ["internship", "junior", "mid", "senior"] })
    .notNull()
    .default("junior"),
  category: text("category").notNull().default("other"),
  salaryRange: text("salary_range"),
  applicationUrl: text("application_url"),
  isInternational: boolean("is_international").notNull().default(false),
  requiredLanguage: text("required_language"),
  languageLevel: text("language_level", {
    enum: ["basic", "intermediate", "advanced", "fluent"],
  }),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "expired"],
  })
    .notNull()
    .default("pending"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  viewCount: integer("view_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  sourcePostedAt: timestamp("source_posted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SITE_SETTINGS
// -----------------------------------------------------------------------------
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value")
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sitePrivateSettings = pgTable("site_private_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value")
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// PAGE_SHARES — contadores de compartilhamento para páginas públicas sem tabela
// -----------------------------------------------------------------------------
export const pageShares = pgTable("page_shares", {
  path: text("path").primaryKey(),
  label: text("label").notNull(),
  shareCount: integer("share_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// PAGE_EVENTS — eventos de visita/click em páginas públicas (tráfego e conversão)
// -----------------------------------------------------------------------------
export const pageEvents = pgTable("page_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull(), // ex: "/"
  eventType: text("event_type").notNull(), // 'visit' | 'click'
  target: text("target"), // clicks: 'booking_submit' | 'platform_link' | 'social_link' | ...
  visitorHash: text("visitor_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// AUDIT_LOGS - eventos sensiveis sem conteudo completo de PII
// -----------------------------------------------------------------------------
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  targetUserId: uuid("target_user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  route: text("route"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// MENTEE_ACCESS_SESSIONS — sessões isoladas da área Minhas Mentorias (vinculadas por email)
// -----------------------------------------------------------------------------
export const menteeAccessSessions = pgTable("mentee_access_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// CONTENT_VIEWS — rastreamento de visitantes únicos por conteúdo
// -----------------------------------------------------------------------------
export const contentViews = pgTable("content_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  visitorHash: text("visitor_hash").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// ADS — anúncios de serviços indicados pelo admin
// -----------------------------------------------------------------------------
export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  whatsappNumber: text("whatsapp_number"),
  whatsappMessage: text("whatsapp_message")
    .notNull()
    .default(DEFAULT_AD_WHATSAPP_MESSAGE),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  maxClicks: integer("max_clicks"), // null = sem limite
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// TIPS - dicas exibidas nas telas públicas
// -----------------------------------------------------------------------------
export const tips = pgTable("tips", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  placement: text("placement", { enum: ["content", "jobs", "both"] })
    .notNull()
    .default("both"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFixed: boolean("is_fixed").notNull().default(false),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// JOB_ACTIONS — ações de mentorados em vagas
// -----------------------------------------------------------------------------
export const jobActions = pgTable(
  "job_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    visitorHash: text("visitor_hash"),
    actionType: text("action_type", {
      enum: ["applied", "link_issue", "closed", "liked"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "job_actions_actor_required",
      sql`${table.userId} IS NOT NULL OR (${table.actionType} = 'liked' AND ${table.visitorHash} IS NOT NULL)`,
    ),
    uniqueIndex("idx_job_actions_public_like_unique")
      .on(table.jobId, table.visitorHash)
      .where(
        sql`${table.actionType} = 'liked' AND ${table.visitorHash} IS NOT NULL`,
      ),
  ],
);

// -----------------------------------------------------------------------------
// CONTENT_SUGGESTIONS — solicitações e indicações de conteúdo da comunidade
// -----------------------------------------------------------------------------
export const contentSuggestions = pgTable("content_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["request", "indication"] }).notNull(),
  title: text("title"),
  url: text("url"),
  description: text("description"),
  status: text("status", {
    enum: ["pending", "reviewed", "approved", "archived"],
  })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// COMPANIES — empresas rastreadas pelos mentorados
// -----------------------------------------------------------------------------
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  linkedinUrl: text("linkedin_url"),
  website: text("website"),
  industry: text("industry"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// OPPORTUNITY_RESUMES — biblioteca de curriculos do mentorado
// -----------------------------------------------------------------------------
export const opportunityResumes = pgTable("opportunity_resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// OPPORTUNITIES — oportunidades de emprego (pipeline de candidaturas)
// -----------------------------------------------------------------------------
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title"),
  url: text("url"),
  description: text("description"),
  category: text("category"),
  city: text("city"),
  state: text("state"),
  status: text("status", {
    enum: [
      "evaluating",
      "preparing_application",
      "resume_sent",
      "in_conversation",
      "interviews",
      "offer",
      "finalized",
    ],
  })
    .notNull()
    .default("evaluating"),
  finalizationType: text("finalization_type", {
    enum: ["hired", "rejected", "no_response", "frozen", "candidate_withdrew"],
  }),
  priority: text("priority", {
    enum: ["high", "medium", "low"],
  })
    .notNull()
    .default("medium"),
  workModel: text("work_model", { enum: ["remote", "hybrid", "onsite"] }),
  jobLevel: text("job_level", {
    enum: ["internship", "junior", "mid", "senior", "trainee"],
  }),
  salaryRange: text("salary_range"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  contactLinkedin: text("contact_linkedin"),
  interviewType: text("interview_type", {
    enum: ["rh", "technical", "manager"],
  }),
  resumeId: uuid("resume_id").references(() => opportunityResumes.id, {
    onDelete: "set null",
  }),
  checklist:
    jsonb("checklist").$type<
      { id: string; label: string; checked: boolean }[]
    >(),
  applicationDate: timestamp("application_date", { withTimezone: true }),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  nextInterviewAt: timestamp("next_interview_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// OPPORTUNITY_EVENTS — timeline unificada (stage_change, note, follow_up, etc.)
// -----------------------------------------------------------------------------
export const opportunityEvents = pgTable("opportunity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  eventType: text("event_type", {
    enum: [
      "stage_change",
      "note",
      "mentor_comment",
      "follow_up",
      "interview_scheduled",
      "message_sent",
      "resume_linked",
      "checklist_completed",
      "application_sent",
    ],
  }).notNull(),
  title: text("title"),
  body: text("body"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  authorId: uuid("author_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// STUDY_PLANS — planos de estudo gerados por IA (Minhas Mentorias)
// -----------------------------------------------------------------------------
export const studyPlans = pgTable("study_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title"),
  // Posição-alvo
  roleType: text("role_type"), // desenvolvedor, engenheiro, analista, tech_lead, outro
  stack: text("stack", {
    enum: [
      "fullstack",
      "backend",
      "frontend",
      "mobile",
      "data",
      "devops",
      "outro",
    ],
  }),
  seniority: text("seniority", {
    enum: ["internship", "trainee", "junior", "mid", "senior"],
  }),
  languages: jsonb("languages").$type<string[]>(),
  frameworks: jsonb("frameworks").$type<string[]>(),
  // Diagnóstico de ponto de partida
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  experience: text("experience"),
  minutesPerDay: integer("minutes_per_day").notNull().default(30),
  // Vagas vinculadas (oportunidades existentes do mentorado)
  linkedOpportunityIds: jsonb("linked_opportunity_ids").$type<string[]>(),
  // Saída da IA + acompanhamento
  planMarkdown: text("plan_markdown"),
  progress:
    jsonb("progress").$type<
      { id: string; label: string; checked: boolean }[]
    >(),
  status: text("status", { enum: ["draft", "active", "completed"] })
    .notNull()
    .default("active"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// MESSAGE_TEMPLATES — templates de mensagem do sistema
// -----------------------------------------------------------------------------
export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category", {
    enum: [
      "connect_recruiter",
      "connect_employee",
      "send_resume",
      "reply_recruiter",
      "thank_interview",
      "follow_up",
      "ask_status",
      "negotiate_offer",
      "decline_offer",
      "ask_feedback",
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SELECTION_PROCESSES — processos seletivos (empresa + posicao)
// -----------------------------------------------------------------------------
export const selectionProcesses = pgTable("selection_processes", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: text("company").notNull(),
  position: text("position").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SELECTION_PROCESS_CANDIDATES — mentorados participantes de um processo seletivo
// -----------------------------------------------------------------------------
export const selectionProcessCandidates = pgTable(
  "selection_process_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    processId: uuid("process_id")
      .notNull()
      .references(() => selectionProcesses.id, { onDelete: "cascade" }),
    menteeId: uuid("mentee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    score: integer("score"),
    checklist:
      jsonb("checklist").$type<
        { id: string; label: string; checked: boolean }[]
      >(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_selection_process_candidates_unique").on(
      table.processId,
      table.menteeId,
    ),
  ],
);

// -----------------------------------------------------------------------------
// SELECTION_PROCESS_SHARE_LINKS — links compartilhaveis para processos seletivos
// -----------------------------------------------------------------------------
export const selectionProcessShareLinks = pgTable(
  "selection_process_share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    processId: uuid("process_id")
      .notNull()
      .references(() => selectionProcesses.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    permission: text("permission", { enum: ["view", "edit"] }).notNull(),
    label: text("label"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// -----------------------------------------------------------------------------
// TYPE EXPORTS
// -----------------------------------------------------------------------------
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserRoleAssignment = typeof userRoles.$inferSelect;
export type MentoringSlot = typeof mentoringSlots.$inferSelect;
export type MentoringTopic = typeof mentoringTopics.$inferSelect;
export type PaidMentorship = typeof paidMentorships.$inferSelect;
export type NewPaidMentorship = typeof paidMentorships.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type BookingHistorySyncQueueItem =
  typeof bookingHistorySyncQueue.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ContentCategory = typeof contentCategories.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type PageShare = typeof pageShares.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ContentView = typeof contentViews.$inferSelect;
export type JobAction = typeof jobActions.$inferSelect;
export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type NewContentSuggestion = typeof contentSuggestions.$inferInsert;
export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;
export type Tip = typeof tips.$inferSelect;
export type NewTip = typeof tips.$inferInsert;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type SitePrivateSetting = typeof sitePrivateSettings.$inferSelect;
export type MenteeAccessCode = typeof menteeAccessCodes.$inferSelect;
export type MenteeAccessSession = typeof menteeAccessSessions.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type OpportunityEvent = typeof opportunityEvents.$inferSelect;
export type OpportunityResume = typeof opportunityResumes.$inferSelect;
export type NewOpportunityResume = typeof opportunityResumes.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type SelectionProcess = typeof selectionProcesses.$inferSelect;
export type NewSelectionProcess = typeof selectionProcesses.$inferInsert;
export type SelectionProcessCandidate =
  typeof selectionProcessCandidates.$inferSelect;
export type NewSelectionProcessCandidate =
  typeof selectionProcessCandidates.$inferInsert;
export type SelectionProcessShareLink =
  typeof selectionProcessShareLinks.$inferSelect;
export type NewSelectionProcessShareLink =
  typeof selectionProcessShareLinks.$inferInsert;
export type BookingAttachment = typeof bookingAttachments.$inferSelect;
export type NewBookingAttachment = typeof bookingAttachments.$inferInsert;
