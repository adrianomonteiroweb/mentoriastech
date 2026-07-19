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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_AD_WHATSAPP_MESSAGE } from "@/lib/ad-whatsapp";
import type {
  SimEvaluationResult,
  SimEvaluationRule,
} from "@/lib/sim/evaluation-types";

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
  // Transcrição e resumo gerados por IA (Gemini) a partir do áudio da mentoria.
  aiTranscript: text("ai_transcript"),
  aiSummary: text("ai_summary"),
  aiTranscriptStatus: text("ai_transcript_status", {
    enum: ["pending", "processing", "done", "failed"],
  }),
  mentorshipChecklist: jsonb("mentorship_checklist").$type<
    { id: string; label: string; checked: boolean }[]
  >(),
  originCategory: text("origin_category", {
    enum: ["linkedin", "palestra", "indicacao", "instagram", "evento"],
  }),
  originDescription: text("origin_description"),
  // Vincula o agendamento a uma fase de trilha (quando criado a partir de uma inscrição).
  trackEnrollmentPhaseId: uuid("track_enrollment_phase_id").references(
    (): AnyPgColumn => trackEnrollmentPhases.id,
    { onDelete: "set null" },
  ),
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
  level: text("level", { enum: ["internship", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished"] })
    .notNull()
    .default("junior"),
  category: text("category").notNull().default("other"),
  salaryRange: text("salary_range"),
  applicationUrl: text("application_url"),
  isInternational: boolean("is_international").notNull().default(false),
  requiredLanguage: text("required_language"),
  languageLevel: text("language_level", {
    enum: ["a1", "a2", "b1", "b2", "c1", "c2", "basic", "intermediate", "advanced", "fluent"],
  }),
  summary: text("summary"),
  importantNote: text("important_note"),
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
  referrer: text("referrer"),
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
// AD_DAILY_STATS — estatísticas diárias de anúncios (views/cliques por dia)
// -----------------------------------------------------------------------------
export const adDailyStats = pgTable(
  "ad_daily_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adId: uuid("ad_id")
      .notNull()
      .references(() => ads.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull().defaultNow(),
    viewCount: integer("view_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
  },
  (table) => [uniqueIndex("idx_ad_daily_stats_unique").on(table.adId, table.statDate)],
);

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
    enum: ["internship", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished", "trainee"],
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
    enum: ["internship", "trainee", "junior", "mid", "senior", "staff", "senior_staff", "principal", "distinguished"],
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
// JOB_ALERT_SUBSCRIPTIONS — inscrição do mentorado p/ receber vagas no WhatsApp.
// O bot search-jobs-linkedin lê estas preferências (via /api/bots/job-alerts) e
// casa cada vaga do LinkedIn contra elas em memória, pelo TÍTULO da vaga. Uma
// inscrição por mentorado (profile_id unique).
// -----------------------------------------------------------------------------
export const jobAlertSubscriptions = pgTable(
  "job_alert_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Liga/desliga o recebimento (padrão habilitado).
    enabled: boolean("enabled").notNull().default(true),
    // Canal de entrega: nome exibido + número internacional no padrão E.164.
    name: text("name"),
    whatsapp: text("whatsapp"),
    // Palavras casadas contra o título da vaga (armazenadas em minúsculas).
    positions: text("positions").array().notNull().default([]),
    stack: text("stack").array().notNull().default([]),
    // Subconjunto de internship|junior|mid|senior (níveis que o bot detecta).
    levels: text("levels").array().notNull().default([]),
    // Se qualquer palavra aparecer no título, a vaga é ignorada.
    ignoreWords: text("ignore_words").array().notNull().default([]),
    // Ver vagas internacionais (padrão true, como o default do bot).
    isInternational: boolean("is_international").notNull().default(true),
    // Máximo de vagas por dia (aplicado pelo bot na Fase B).
    dailyLimit: integer("daily_limit").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "job_alert_subscriptions_daily_limit_range",
      sql`${table.dailyLimit} BETWEEN 1 AND 50`,
    ),
  ],
);

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
// LEARNING_TRACKS — trilhas de recolocação (template/oferta criada pelo admin)
// -----------------------------------------------------------------------------
export const TRACK_PHASE_KEYS = [
  "positioning",
  "english",
  "interview_rh",
  "interview_tech",
  "interview_manager",
  "job_search",
] as const;

export const learningTracks = pgTable("learning_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  supportsEnglish: boolean("supports_english").notNull().default(false),
  // Mentoria paga de inglês indicada na fase 2 (só exibida se ativa).
  englishPaidMentorshipId: uuid("english_paid_mentorship_id").references(
    () => paidMentorships.id,
    { onDelete: "set null" },
  ),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
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
// LEARNING_TRACK_PHASES — fases-template de uma trilha (semeadas na criação)
// -----------------------------------------------------------------------------
export const learningTrackPhases = pgTable("learning_track_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackId: uuid("track_id")
    .notNull()
    .references(() => learningTracks.id, { onDelete: "cascade" }),
  phaseKey: text("phase_key", { enum: TRACK_PHASE_KEYS }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isOptional: boolean("is_optional").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// TRACK_PHASE_CONTENT — conteúdos vinculados a uma fase-template
// -----------------------------------------------------------------------------
export const trackPhaseContent = pgTable(
  "track_phase_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => learningTrackPhases.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_track_phase_content_unique").on(
      table.phaseId,
      table.contentId,
    ),
  ],
);

// -----------------------------------------------------------------------------
// TRACK_ENROLLMENTS — inscrição de um mentorado em uma trilha
// -----------------------------------------------------------------------------
export const trackEnrollments = pgTable("track_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackId: uuid("track_id").references(() => learningTracks.id, {
    onDelete: "set null",
  }),
  menteeId: uuid("mentee_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestWhatsapp: text("guest_whatsapp"),
  targetInternational: boolean("target_international").notNull().default(false),
  includeEnglish: boolean("include_english").notNull().default(false),
  englishInterviews: boolean("english_interviews").notNull().default(false),
  requestedSlotId: uuid("requested_slot_id").references(
    () => mentoringSlots.id,
    { onDelete: "set null" },
  ),
  requestedSessionDate: date("requested_session_date"),
  requestedStartTime: time("requested_start_time"),
  requestedTopicId: uuid("requested_topic_id").references(
    () => mentoringTopics.id,
    { onDelete: "set null" },
  ),
  status: text("status", {
    enum: ["pending", "active", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  notes: text("notes"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// TRACK_ENROLLMENT_PHASES — progresso por fase de uma inscrição
// -----------------------------------------------------------------------------
export const trackEnrollmentPhases = pgTable("track_enrollment_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => trackEnrollments.id, { onDelete: "cascade" }),
  phaseKey: text("phase_key", { enum: TRACK_PHASE_KEYS }).notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", {
    enum: [
      "locked",
      "pending",
      "scheduled",
      "in_progress",
      "completed",
      "skipped",
    ],
  })
    .notNull()
    .default("locked"),
  bookingId: uuid("booking_id").references(() => bookings.id, {
    onDelete: "set null",
  }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_COMPANIES — Sprint Simulator: empresa fictícia (hub com produto, cliente,
// serviço, processo e docs de PO/PM/Tech Lead)
// -----------------------------------------------------------------------------
export const simCompanies = pgTable("sim_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  archetype: text("archetype", { enum: ["startup", "saas", "enterprise"] })
    .notNull()
    .default("startup"),
  description: text("description"),
  productDescription: text("product_description"),
  clientDescription: text("client_description"),
  serviceDescription: text("service_description"),
  processDescription: text("process_description"),
  poDocMarkdown: text("po_doc_markdown"),
  pmDocMarkdown: text("pm_doc_markdown"),
  techLeadDocMarkdown: text("tech_lead_doc_markdown"),
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
// SIM_SPRINT_TEMPLATES — "vaga" publicada: template de sprint de uma empresa
// -----------------------------------------------------------------------------
export const simSprintTemplates = pgTable("sim_sprint_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => simCompanies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  objective: text("objective"),
  level: integer("level").notNull().default(1),
  durationDays: integer("duration_days").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
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
// SIM_TEMPLATE_TASKS — tasks do template (com regras de avaliação da Fase 2)
// -----------------------------------------------------------------------------
export const simTemplateTasks = pgTable("sim_template_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => simSprintTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type", {
    enum: ["feature", "bug", "refactor", "architecture", "increment"],
  })
    .notNull()
    .default("feature"),
  points: integer("points").notNull().default(10),
  initialStatus: text("initial_status", { enum: ["backlog", "todo"] })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  evaluationRules: jsonb("evaluation_rules").$type<SimEvaluationRule[]>(),
  // Gabarito padrão (markdown), copiado p/ a sprint task na instanciação.
  solutionMarkdown: text("solution_markdown"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_APPLICATIONS — candidatura do mentorado a uma vaga fictícia
// -----------------------------------------------------------------------------
export const simApplications = pgTable(
  "sim_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => simSprintTemplates.id, { onDelete: "cascade" }),
    message: text("message"),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "cancelled"],
    })
      .notNull()
      .default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sim_applications_pending_unique")
      .on(table.profileId, table.templateId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

// -----------------------------------------------------------------------------
// SIM_SPRINTS — instância de sprint por mentorado (snapshot do template).
// Dia corrente é derivado de started_at (lib/sim/sprint-day.ts).
// -----------------------------------------------------------------------------
export const simSprints = pgTable("sim_sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => simApplications.id, {
    onDelete: "set null",
  }),
  templateId: uuid("template_id").references(() => simSprintTemplates.id, {
    onDelete: "set null",
  }),
  companyId: uuid("company_id").references(() => simCompanies.id, {
    onDelete: "set null",
  }),
  mentorId: uuid("mentor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  objective: text("objective"),
  durationDays: integer("duration_days").notNull(),
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  finalScore: integer("final_score"),
  finalFeedback: text("final_feedback"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_SPRINT_TASKS — kanban da sprint (backlog/todo/doing/review/done)
// -----------------------------------------------------------------------------
export const simSprintTasks = pgTable("sim_sprint_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id")
    .notNull()
    .references(() => simSprints.id, { onDelete: "cascade" }),
  templateTaskId: uuid("template_task_id").references(
    () => simTemplateTasks.id,
    { onDelete: "set null" },
  ),
  taskNumber: integer("task_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type", {
    enum: ["feature", "bug", "refactor", "architecture", "increment"],
  })
    .notNull()
    .default("feature"),
  points: integer("points").notNull().default(10),
  status: text("status", {
    enum: ["backlog", "todo", "doing", "review", "done"],
  })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  evaluationRules: jsonb("evaluation_rules").$type<SimEvaluationRule[]>(),
  lastEvaluation: jsonb("last_evaluation").$type<SimEvaluationResult>(),
  // Gabarito desta instância. released_at NULL = oculto p/ o mentorado;
  // quando o mentor libera, recebe o timestamp e o mentorado passa a ver.
  solutionMarkdown: text("solution_markdown"),
  solutionReleasedAt: timestamp("solution_released_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
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
// SIM_TASK_TRANSITIONS — histórico de movimentação (monitor + timeline)
// -----------------------------------------------------------------------------
export const simTaskTransitions = pgTable("sim_task_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => simSprintTasks.id, { onDelete: "cascade" }),
  sprintId: uuid("sprint_id")
    .notNull()
    .references(() => simSprints.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorRole: text("actor_role", { enum: ["mentee", "mentor"] }).notNull(),
  actorId: uuid("actor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  sprintDay: integer("sprint_day").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_DAILY_MESSAGES — daily assíncrona (chat mentor ↔ mentorado)
// -----------------------------------------------------------------------------
export const simDailyMessages = pgTable("sim_daily_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id")
    .notNull()
    .references(() => simSprints.id, { onDelete: "cascade" }),
  authorRole: text("author_role", { enum: ["mentee", "mentor"] }).notNull(),
  authorId: uuid("author_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  // Tipo da mensagem: progresso da daily, impedimento ou dúvida.
  // Só 'doubt'/'impediment' vão para o inbox do mentor; 'daily' fica na timeline.
  kind: text("kind", { enum: ["daily", "impediment", "doubt"] })
    .notNull()
    .default("daily"),
  body: text("body").notNull(),
  taskId: uuid("task_id").references(() => simSprintTasks.id, {
    onDelete: "set null",
  }),
  sprintDay: integer("sprint_day").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_SCORE_EVENTS — ledger de pontuação (auto + manual, motivo obrigatório).
// Total da sprint = SUM(delta) WHERE superseded_at IS NULL.
// -----------------------------------------------------------------------------
export const simScoreEvents = pgTable("sim_score_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id")
    .notNull()
    .references(() => simSprints.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => simSprintTasks.id, {
    onDelete: "set null",
  }),
  messageId: uuid("message_id").references(() => simDailyMessages.id, {
    onDelete: "set null",
  }),
  source: text("source", { enum: ["auto", "manual"] }).notNull(),
  category: text("category", {
    enum: [
      "structure",
      "code",
      "tests",
      "architecture",
      "communication",
      "general",
      "agile",
    ],
  })
    .notNull()
    .default("general"),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  sprintDay: integer("sprint_day").notNull(),
  // Chave estável dos eventos ágeis automáticos (ex.: "daily:3", "done:<taskId>").
  // Único por (sprint_id, event_key) → cada comportamento pontua uma vez só.
  eventKey: text("event_key"),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------------------------------------------------------
// SIM_WORKSPACE_FILES — arquivos do workspace Monaco (Fase 2)
// -----------------------------------------------------------------------------
export const simWorkspaceFiles = pgTable(
  "sim_workspace_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sprintId: uuid("sprint_id")
      .notNull()
      .references(() => simSprints.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    isFolder: boolean("is_folder").notNull().default(false),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sim_workspace_files_path_unique").on(
      table.sprintId,
      table.path,
    ),
  ],
);

// =============================================================================
// ÓRBITA — Formação em Squad (tabelas formacao_*)
// Produto distinto do Sprint Simulator: squad de até 5 alunos + 1 instrutor,
// papéis rotativos, projetos obrigatórios, dailies bilíngues, encontros semanais.
// SQL manual em drizzle/manual/formacao_schema.sql.
// =============================================================================

export const formacaoFases = pgTable("formacao_fases", {
  id: uuid("id").primaryKey().defaultRandom(),
  numero: integer("numero").notNull(),
  nome: text("nome").notNull(),
  objetivo: text("objetivo"),
  ordem: integer("ordem").notNull().default(0),
});

export const formacaoPapeis = pgTable("formacao_papeis", {
  id: uuid("id").primaryKey().defaultRandom(),
  faseId: uuid("fase_id")
    .notNull()
    .references(() => formacaoFases.id, { onDelete: "cascade" }),
  chave: text("chave").notNull(),
  nome: text("nome").notNull(),
  nomeCurto: text("nome_curto"),
  responsabilidades: jsonb("responsabilidades")
    .$type<string[]>()
    .notNull()
    .default([]),
  cor: text("cor").notNull().default("blue"),
  minOcorrencias: integer("min_ocorrencias").notNull().default(1),
  ordem: integer("ordem").notNull().default(0),
});

export const formacaoProjetos = pgTable("formacao_projetos", {
  id: uuid("id").primaryKey().defaultRandom(),
  faseId: uuid("fase_id")
    .notNull()
    .references(() => formacaoFases.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  chave: text("chave").notNull(),
  nome: text("nome").notNull(),
  problema: text("problema"),
  objetivo: text("objetivo"),
  ordem: integer("ordem").notNull().default(0),
});

export const formacaoRequisitosProjeto = pgTable(
  "formacao_requisitos_projeto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projetoId: uuid("projeto_id")
      .notNull()
      .references(() => formacaoProjetos.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: ["requisito", "evidencia"] })
      .notNull()
      .default("requisito"),
    texto: text("texto").notNull(),
    ordem: integer("ordem").notNull().default(0),
  },
  (table) => [
    uniqueIndex("formacao_requisitos_unique").on(
      table.projetoId,
      table.tipo,
      table.ordem,
    ),
  ],
);

export const formacaoEtapas = pgTable(
  "formacao_etapas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projetoId: uuid("projeto_id")
      .notNull()
      .references(() => formacaoProjetos.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    oQueE: text("o_que_e"),
    porQueExiste: text("por_que_existe"),
    oQueEntregar: text("o_que_entregar"),
    oQueDesbloqueia: text("o_que_desbloqueia"),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_etapas_unique").on(table.projetoId, table.ordem),
  ],
);

export const formacaoCompetencias = pgTable(
  "formacao_competencias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    faseId: uuid("fase_id")
      .notNull()
      .references(() => formacaoFases.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    ordem: integer("ordem").notNull().default(0),
  },
  (table) => [
    uniqueIndex("formacao_competencias_unique").on(table.faseId, table.nome),
  ],
);

export const formacaoTurmas = pgTable("formacao_turmas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  instrutorId: uuid("instrutor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  empresaFicticia: text("empresa_ficticia"),
  linkMeet: text("link_meet"),
  dataInicio: date("data_inicio").notNull(),
  faseAtual: integer("fase_atual").notNull().default(1),
  status: text("status", {
    enum: ["planejada", "ativa", "concluida", "cancelada"],
  })
    .notNull()
    .default("planejada"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formacaoMembros = pgTable(
  "formacao_membros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => formacaoTurmas.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    nome: text("nome"),
    iniciais: text("iniciais"),
    whatsapp: text("whatsapp"),
    status: text("status", { enum: ["convidado", "ativo", "inativo"] })
      .notNull()
      .default("convidado"),
    convidadoEm: timestamp("convidado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_membros_turma_email_unique").on(
      table.turmaId,
      table.email,
    ),
  ],
);

export const formacaoEncontros = pgTable(
  "formacao_encontros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turmaId: uuid("turma_id")
      .notNull()
      .references(() => formacaoTurmas.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    data: timestamp("data", { withTimezone: true }).notNull(),
    linkMeet: text("link_meet"),
    tipo: text("tipo").notNull().default("semanal"),
    pauta: jsonb("pauta").$type<string[]>().notNull().default([]),
    faseId: uuid("fase_id").references(() => formacaoFases.id, {
      onDelete: "set null",
    }),
    projetoId: uuid("projeto_id").references(() => formacaoProjetos.id, {
      onDelete: "set null",
    }),
    etapaId: uuid("etapa_id").references(() => formacaoEtapas.id, {
      onDelete: "set null",
    }),
    decisoes: text("decisoes"),
    proximosPassos: text("proximos_passos"),
    status: text("status", { enum: ["agendado", "realizado", "cancelado"] })
      .notNull()
      .default("agendado"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_encontros_turma_numero_unique").on(
      table.turmaId,
      table.numero,
    ),
  ],
);

export const formacaoTarefas = pgTable("formacao_tarefas", {
  id: uuid("id").primaryKey().defaultRandom(),
  turmaId: uuid("turma_id")
    .notNull()
    .references(() => formacaoTurmas.id, { onDelete: "cascade" }),
  projetoId: uuid("projeto_id").references(() => formacaoProjetos.id, {
    onDelete: "set null",
  }),
  etapaId: uuid("etapa_id").references(() => formacaoEtapas.id, {
    onDelete: "set null",
  }),
  papelId: uuid("papel_id").references(() => formacaoPapeis.id, {
    onDelete: "set null",
  }),
  membroId: uuid("membro_id").references(() => formacaoMembros.id, {
    onDelete: "set null",
  }),
  titulo: text("titulo").notNull(),
  contexto: text("contexto"),
  motivo: text("motivo"),
  politicaIa: text("politica_ia"),
  prazo: timestamp("prazo", { withTimezone: true }),
  status: text("status", {
    enum: ["a_fazer", "em_andamento", "bloqueada", "em_revisao", "concluida"],
  })
    .notNull()
    .default("a_fazer"),
  ordem: integer("ordem").notNull().default(0),
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

export const formacaoCriteriosAceite = pgTable("formacao_criterios_aceite", {
  id: uuid("id").primaryKey().defaultRandom(),
  tarefaId: uuid("tarefa_id")
    .notNull()
    .references(() => formacaoTarefas.id, { onDelete: "cascade" }),
  texto: text("texto").notNull(),
  concluido: boolean("concluido").notNull().default(false),
  ordem: integer("ordem").notNull().default(0),
});

export const formacaoEntregas = pgTable("formacao_entregas", {
  id: uuid("id").primaryKey().defaultRandom(),
  tarefaId: uuid("tarefa_id")
    .notNull()
    .references(() => formacaoTarefas.id, { onDelete: "cascade" }),
  membroId: uuid("membro_id")
    .notNull()
    .references(() => formacaoMembros.id, { onDelete: "cascade" }),
  tipo: text("tipo", {
    enum: [
      "texto",
      "arquivo",
      "link",
      "audio",
      "produto",
      "repositorio",
      "pull_request",
    ],
  })
    .notNull()
    .default("texto"),
  conteudo: text("conteudo"),
  arquivoUrl: text("arquivo_url"),
  versao: integer("versao").notNull().default(1),
  status: text("status", {
    enum: ["rascunho", "enviada", "correcao_solicitada", "aprovada"],
  })
    .notNull()
    .default("rascunho"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formacaoFeedbacks = pgTable("formacao_feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  entregaId: uuid("entrega_id")
    .notNull()
    .references(() => formacaoEntregas.id, { onDelete: "cascade" }),
  instrutorId: uuid("instrutor_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  comentario: text("comentario").notNull(),
  statusSolicitado: text("status_solicitado", {
    enum: ["correcao_solicitada", "aprovada"],
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formacaoConteudos = pgTable("formacao_conteudos", {
  id: uuid("id").primaryKey().defaultRandom(),
  turmaId: uuid("turma_id").references(() => formacaoTurmas.id, {
    onDelete: "cascade",
  }),
  etapaId: uuid("etapa_id").references(() => formacaoEtapas.id, {
    onDelete: "set null",
  }),
  tarefaId: uuid("tarefa_id").references(() => formacaoTarefas.id, {
    onDelete: "set null",
  }),
  encontroId: uuid("encontro_id").references(() => formacaoEncontros.id, {
    onDelete: "set null",
  }),
  titulo: text("titulo").notNull(),
  explicacao: text("explicacao"),
  porQueImporta: text("por_que_importa"),
  exemplo: text("exemplo"),
  tipo: text("tipo", {
    enum: ["texto", "video", "audio", "arquivo", "link", "checklist"],
  })
    .notNull()
    .default("texto"),
  url: text("url"),
  corpo: text("corpo"),
  ordem: integer("ordem").notNull().default(0),
  status: text("status", { enum: ["rascunho", "publicado"] })
    .notNull()
    .default("rascunho"),
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

export const formacaoConteudoArquivos = pgTable("formacao_conteudo_arquivos", {
  id: uuid("id").primaryKey().defaultRandom(),
  conteudoId: uuid("conteudo_id")
    .notNull()
    .references(() => formacaoConteudos.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  nome: text("nome"),
  tipo: text("tipo"),
  tamanho: integer("tamanho"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formacaoPresencas = pgTable(
  "formacao_presencas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encontroId: uuid("encontro_id")
      .notNull()
      .references(() => formacaoEncontros.id, { onDelete: "cascade" }),
    membroId: uuid("membro_id")
      .notNull()
      .references(() => formacaoMembros.id, { onDelete: "cascade" }),
    presenca: text("presenca", {
      enum: ["pendente", "confirmado", "presente", "atrasado", "ausente"],
    })
      .notNull()
      .default("pendente"),
    confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_presencas_unique").on(
      table.encontroId,
      table.membroId,
    ),
  ],
);

export const formacaoDailyEntries = pgTable(
  "formacao_daily_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encontroId: uuid("encontro_id")
      .notNull()
      .references(() => formacaoEncontros.id, { onDelete: "cascade" }),
    membroId: uuid("membro_id")
      .notNull()
      .references(() => formacaoMembros.id, { onDelete: "cascade" }),
    concluidoPt: text("concluido_pt"),
    andamentoPt: text("andamento_pt"),
    proximoPt: text("proximo_pt"),
    bloqueioPt: text("bloqueio_pt"),
    ajudaPt: text("ajuda_pt"),
    registradoEm: timestamp("registrado_em", { withTimezone: true }),
    noPrazo: boolean("no_prazo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_daily_entries_unique").on(
      table.encontroId,
      table.membroId,
    ),
  ],
);

export const formacaoDailyIngles = pgTable("formacao_daily_ingles", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyEntryId: uuid("daily_entry_id")
    .notNull()
    .references(() => formacaoDailyEntries.id, { onDelete: "cascade" }),
  fraseCompletaPt: text("frase_completa_pt"),
  fraseCompletaEn: text("frase_completa_en"),
  incrementos: jsonb("incrementos").$type<string[]>().notNull().default([]),
  vocab: jsonb("vocab").$type<string[]>().notNull().default([]),
  status: text("status", {
    enum: [
      "nao_iniciada",
      "repetida_leitura",
      "repetida_apoio",
      "repetida_sem_leitura",
      "usada_na_daily",
    ],
  })
    .notNull()
    .default("nao_iniciada"),
  observacaoInstrutor: text("observacao_instrutor"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Histórico imutável: a aplicação não faz UPDATE/DELETE nesta tabela.
export const formacaoAtribuicoesPapel = pgTable("formacao_atribuicoes_papel", {
  id: uuid("id").primaryKey().defaultRandom(),
  turmaId: uuid("turma_id")
    .notNull()
    .references(() => formacaoTurmas.id, { onDelete: "cascade" }),
  membroId: uuid("membro_id")
    .notNull()
    .references(() => formacaoMembros.id, { onDelete: "cascade" }),
  papelId: uuid("papel_id")
    .notNull()
    .references(() => formacaoPapeis.id, { onDelete: "cascade" }),
  encontroId: uuid("encontro_id").references(() => formacaoEncontros.id, {
    onDelete: "set null",
  }),
  atribuidoPor: uuid("atribuido_por").references(() => profiles.id, {
    onDelete: "set null",
  }),
  atribuidoEm: timestamp("atribuido_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formacaoCertificados = pgTable(
  "formacao_certificados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membroId: uuid("membro_id")
      .notNull()
      .references(() => formacaoMembros.id, { onDelete: "cascade" }),
    faseId: uuid("fase_id")
      .notNull()
      .references(() => formacaoFases.id, { onDelete: "cascade" }),
    codigo: uuid("codigo").notNull().defaultRandom(),
    alunoNome: text("aluno_nome"),
    faseNome: text("fase_nome"),
    competenciasComplementares: jsonb("competencias_complementares")
      .$type<string[]>()
      .notNull()
      .default([]),
    emitidoPor: uuid("emitido_por").references(() => profiles.id, {
      onDelete: "set null",
    }),
    emitidoEm: timestamp("emitido_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("formacao_certificados_codigo_unique").on(table.codigo),
    uniqueIndex("formacao_certificados_membro_fase_unique").on(
      table.membroId,
      table.faseId,
    ),
  ],
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
export type AdDailyStat = typeof adDailyStats.$inferSelect;
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
export type LearningTrack = typeof learningTracks.$inferSelect;
export type NewLearningTrack = typeof learningTracks.$inferInsert;
export type LearningTrackPhase = typeof learningTrackPhases.$inferSelect;
export type NewLearningTrackPhase = typeof learningTrackPhases.$inferInsert;
export type TrackPhaseContent = typeof trackPhaseContent.$inferSelect;
export type NewTrackPhaseContent = typeof trackPhaseContent.$inferInsert;
export type TrackEnrollment = typeof trackEnrollments.$inferSelect;
export type NewTrackEnrollment = typeof trackEnrollments.$inferInsert;
export type TrackEnrollmentPhase = typeof trackEnrollmentPhases.$inferSelect;
export type NewTrackEnrollmentPhase = typeof trackEnrollmentPhases.$inferInsert;
export type SimCompany = typeof simCompanies.$inferSelect;
export type NewSimCompany = typeof simCompanies.$inferInsert;
export type SimSprintTemplate = typeof simSprintTemplates.$inferSelect;
export type NewSimSprintTemplate = typeof simSprintTemplates.$inferInsert;
export type SimTemplateTask = typeof simTemplateTasks.$inferSelect;
export type NewSimTemplateTask = typeof simTemplateTasks.$inferInsert;
export type SimApplication = typeof simApplications.$inferSelect;
export type NewSimApplication = typeof simApplications.$inferInsert;
export type SimSprint = typeof simSprints.$inferSelect;
export type NewSimSprint = typeof simSprints.$inferInsert;
export type SimSprintTask = typeof simSprintTasks.$inferSelect;
export type NewSimSprintTask = typeof simSprintTasks.$inferInsert;
export type SimTaskTransition = typeof simTaskTransitions.$inferSelect;
export type SimDailyMessage = typeof simDailyMessages.$inferSelect;
export type NewSimDailyMessage = typeof simDailyMessages.$inferInsert;
export type SimScoreEvent = typeof simScoreEvents.$inferSelect;
export type NewSimScoreEvent = typeof simScoreEvents.$inferInsert;
export type SimWorkspaceFile = typeof simWorkspaceFiles.$inferSelect;
export type NewSimWorkspaceFile = typeof simWorkspaceFiles.$inferInsert;

// Órbita — Formação em Squad
export type FormacaoFase = typeof formacaoFases.$inferSelect;
export type NewFormacaoFase = typeof formacaoFases.$inferInsert;
export type FormacaoPapel = typeof formacaoPapeis.$inferSelect;
export type NewFormacaoPapel = typeof formacaoPapeis.$inferInsert;
export type FormacaoProjeto = typeof formacaoProjetos.$inferSelect;
export type NewFormacaoProjeto = typeof formacaoProjetos.$inferInsert;
export type FormacaoRequisitoProjeto =
  typeof formacaoRequisitosProjeto.$inferSelect;
export type NewFormacaoRequisitoProjeto =
  typeof formacaoRequisitosProjeto.$inferInsert;
export type FormacaoEtapa = typeof formacaoEtapas.$inferSelect;
export type NewFormacaoEtapa = typeof formacaoEtapas.$inferInsert;
export type FormacaoCompetencia = typeof formacaoCompetencias.$inferSelect;
export type NewFormacaoCompetencia = typeof formacaoCompetencias.$inferInsert;
export type FormacaoTurma = typeof formacaoTurmas.$inferSelect;
export type NewFormacaoTurma = typeof formacaoTurmas.$inferInsert;
export type FormacaoMembro = typeof formacaoMembros.$inferSelect;
export type NewFormacaoMembro = typeof formacaoMembros.$inferInsert;
export type FormacaoEncontro = typeof formacaoEncontros.$inferSelect;
export type NewFormacaoEncontro = typeof formacaoEncontros.$inferInsert;
export type FormacaoTarefa = typeof formacaoTarefas.$inferSelect;
export type NewFormacaoTarefa = typeof formacaoTarefas.$inferInsert;
export type FormacaoCriterioAceite =
  typeof formacaoCriteriosAceite.$inferSelect;
export type NewFormacaoCriterioAceite =
  typeof formacaoCriteriosAceite.$inferInsert;
export type FormacaoEntrega = typeof formacaoEntregas.$inferSelect;
export type NewFormacaoEntrega = typeof formacaoEntregas.$inferInsert;
export type FormacaoFeedback = typeof formacaoFeedbacks.$inferSelect;
export type NewFormacaoFeedback = typeof formacaoFeedbacks.$inferInsert;
export type FormacaoConteudo = typeof formacaoConteudos.$inferSelect;
export type NewFormacaoConteudo = typeof formacaoConteudos.$inferInsert;
export type FormacaoConteudoArquivo =
  typeof formacaoConteudoArquivos.$inferSelect;
export type NewFormacaoConteudoArquivo =
  typeof formacaoConteudoArquivos.$inferInsert;
export type FormacaoPresenca = typeof formacaoPresencas.$inferSelect;
export type NewFormacaoPresenca = typeof formacaoPresencas.$inferInsert;
export type FormacaoDailyEntry = typeof formacaoDailyEntries.$inferSelect;
export type NewFormacaoDailyEntry = typeof formacaoDailyEntries.$inferInsert;
export type FormacaoDailyIngles = typeof formacaoDailyIngles.$inferSelect;
export type NewFormacaoDailyIngles = typeof formacaoDailyIngles.$inferInsert;
export type FormacaoAtribuicaoPapel =
  typeof formacaoAtribuicoesPapel.$inferSelect;
export type NewFormacaoAtribuicaoPapel =
  typeof formacaoAtribuicoesPapel.$inferInsert;
export type FormacaoCertificado = typeof formacaoCertificados.$inferSelect;
export type NewFormacaoCertificado = typeof formacaoCertificados.$inferInsert;

// -----------------------------------------------------------------------------
// COMPANY_FEEDBACKS — feedbacks de usuários sobre empresas (salário baixo, etc.)
// -----------------------------------------------------------------------------
export const companyFeedbacks = pgTable("company_feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: text("company").notNull(),
  category: text("category", {
    enum: ["salario_baixo", "processo_longo", "nao_confiavel", "processos_inexistentes", "outro"],
  }).notNull(),
  comment: text("comment"),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  status: text("status", { enum: ["pending", "reviewed", "blocked"] }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompanyFeedback = typeof companyFeedbacks.$inferSelect;
export type NewCompanyFeedback = typeof companyFeedbacks.$inferInsert;
