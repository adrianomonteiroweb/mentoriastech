import type {
  Ad as DbAd,
  Booking as DbBooking,
  ContentCategory as DbContentCategory,
  ContentItem as DbContentItem,
  ContentSuggestion as DbContentSuggestion,
  Job as DbJob,
  MentoringSlot as DbMentoringSlot,
  MentoringTopic as DbMentoringTopic,
  PaidMentorship as DbPaidMentorship,
  Payment as DbPayment,
  Profile as DbProfile,
  SelectionProcess as DbSelectionProcess,
  SelectionProcessCandidate as DbSelectionProcessCandidate,
  SelectionProcessShareLink as DbSelectionProcessShareLink,
  Tip as DbTip,
} from "@/lib/db/schema"
import type {
  Ad,
  Booking,
  ContentCategory,
  ContentItem,
  ContentSuggestion,
  Job,
  MentoringSlot,
  MentoringTopic,
  PaidMentorship,
  Payment,
  Profile,
  SelectionProcess,
  SelectionProcessCandidate,
  SelectionProcessShareLink,
  Tip,
} from "@/lib/types/database"
import { normalizeSelectionProcessChecklist } from "@/lib/selection-process-checklist"

type BookingMapperRow = Omit<DbBooking, "mentorshipChecklist" | "createdAt" | "updatedAt"> & {
  mentorshipChecklist?: Booking["mentorship_checklist"] | null
  createdAt: Date | string
  updatedAt: Date | string
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export function toAd(row: DbAd): Ad {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.imageUrl,
    image_alt: row.imageAlt,
    whatsapp_number: row.whatsappNumber,
    whatsapp_message: row.whatsappMessage,
    link_url: row.linkUrl,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    view_count: row.viewCount,
    click_count: row.clickCount,
    max_clicks: row.maxClicks ?? null,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toPaidMentorship(row: DbPaidMentorship): PaidMentorship {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.imageUrl,
    image_alt: row.imageAlt,
    amount_cents: row.amountCents,
    currency: row.currency,
    pix_expires_after_seconds: row.pixExpiresAfterSeconds,
    pix_amount_includes_iof: row.pixAmountIncludesIof,
    mentor_id: row.mentorId,
    mentor_email: row.mentorEmail,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    view_count: row.viewCount,
    click_count: row.clickCount,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toPublicPaidMentorship(row: DbPaidMentorship) {
  const mentorship = toPaidMentorship(row)
  const {
    mentor_email: _mentorEmail,
    created_by: _createdBy,
    created_at: _createdAt,
    updated_at: _updatedAt,
    view_count: _viewCount,
    click_count: _clickCount,
    ...publicMentorship
  } = mentorship

  return publicMentorship
}

export function toPayment(row: DbPayment): Payment {
  return {
    id: row.id,
    booking_id: row.bookingId,
    paid_mentorship_id: row.paidMentorshipId,
    amount_cents: row.amountCents,
    currency: row.currency,
    method: row.method,
    status: row.status,
    pix_txid: row.pixTxid,
    stripe_payment_intent_id: row.stripePaymentIntentId,
    stripe_payment_intent_status: row.stripePaymentIntentStatus,
    pagarme_order_id: row.pagarmeOrderId,
    pagarme_charge_id: row.pagarmeChargeId,
    pagarme_status: row.pagarmeStatus,
    pix_qr_code_data: row.pixQrCodeData,
    pix_qr_code_image_url_png: row.pixQrCodeImageUrlPng,
    pix_qr_code_image_url_svg: row.pixQrCodeImageUrlSvg,
    pix_hosted_instructions_url: row.pixHostedInstructionsUrl,
    pix_expires_at: toIso(row.pixExpiresAt),
    paid_at: toIso(row.paidAt),
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toTip(row: DbTip): Tip {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    placement: row.placement,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    is_fixed: row.isFixed,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    role: row.role,
    full_name: row.fullName,
    email: row.email,
    whatsapp: row.whatsapp,
    linkedin_url: row.linkedinUrl,
    bio: row.bio,
    resume_url: row.resumeUrl,
    resume_markdown: row.resumeMarkdown,
    portfolio_url: row.portfolioUrl,
    avatar_url: row.avatarUrl,
    career_status: row.careerStatus,
    seniority: row.seniority,
    career_focus: row.careerFocus,
    origin_category: row.originCategory,
    origin_description: row.originDescription,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toContentCategory(row: DbContentCategory): ContentCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sort_order: row.sortOrder,
    created_at: toIso(row.createdAt) || "",
  }
}

export function toContentSuggestion(row: DbContentSuggestion): ContentSuggestion {
  return {
    id: row.id,
    user_id: row.userId,
    type: row.type,
    title: row.title,
    url: row.url,
    description: row.description,
    status: row.status,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toContentItem(row: DbContentItem): ContentItem {
  return {
    id: row.id,
    category_id: row.categoryId,
    title: row.title,
    description: row.description,
    content_type: row.contentType,
    url: row.url,
    links: (row.links as { url: string; label: string }[] | null) ?? null,
    article_body: row.articleBody,
    file_size_bytes: row.fileSizeBytes,
    is_published: row.isPublished,
    view_count: row.viewCount,
    share_count: row.shareCount,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toBooking(row: BookingMapperRow): Booking {
  return {
    id: row.id,
    mentor_id: row.mentorId,
    mentee_id: row.menteeId,
    guest_name: row.guestName,
    guest_email: row.guestEmail,
    guest_whatsapp: row.guestWhatsapp,
    slot_id: row.slotId,
    topic_id: row.topicId,
    paid_mentorship_id: row.paidMentorshipId,
    session_date: row.sessionDate,
    start_time: row.startTime,
    booking_type: row.bookingType,
    status: row.status,
    notes: row.notes,
    google_event_id: row.googleEventId,
    google_meet_url: row.googleMeetUrl,
    topics_discussed: row.topicsDiscussed,
    mentee_strengths: row.menteeStrengths,
    mentee_growth_areas: row.menteeGrowthAreas,
    admin_notes: row.adminNotes,
    mentorship_checklist: (row.mentorshipChecklist as Booking["mentorship_checklist"]) ?? null,
    origin_category: row.originCategory,
    origin_description: row.originDescription,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toMentoringTopic(row: DbMentoringTopic): MentoringTopic {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    is_active: row.isActive,
    sort_order: row.sortOrder,
    mentor_id: row.mentorId,
    created_at: toIso(row.createdAt) || "",
  }
}

export function toMentoringSlot(row: DbMentoringSlot): MentoringSlot {
  return {
    id: row.id,
    day_of_week: row.dayOfWeek,
    start_time: row.startTime,
    slot_type: row.slotType,
    is_active: row.isActive,
    rrule: row.rrule,
    recurrence_start: row.recurrenceStart,
    recurrence_end: row.recurrenceEnd,
    mentor_id: row.mentorId,
    created_at: toIso(row.createdAt) || "",
  }
}

export function toJob(row: DbJob): Job {
  return {
    id: row.id,
    posted_by: row.postedBy,
    title: row.title,
    company: row.company,
    description: row.description,
    recommendation_note: row.recommendationNote,
    location: row.location,
    job_type: row.jobType,
    level: row.level,
    category: row.category,
    salary_range: row.salaryRange,
    application_url: row.applicationUrl,
    is_international: row.isInternational,
    required_language: row.requiredLanguage,
    language_level: row.languageLevel,
    status: row.status,
    approved_by: row.approvedBy,
    approved_at: toIso(row.approvedAt),
    expires_at: toIso(row.expiresAt),
    view_count: row.viewCount,
    click_count: row.clickCount,
    share_count: row.shareCount,
    source_posted_at: toIso(row.sourcePostedAt) || "",
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toSelectionProcess(row: DbSelectionProcess): SelectionProcess {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    description: row.description,
    status: row.status,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toSelectionProcessCandidate(row: DbSelectionProcessCandidate): SelectionProcessCandidate {
  return {
    id: row.id,
    process_id: row.processId,
    mentee_id: row.menteeId,
    score: row.score,
    checklist: normalizeSelectionProcessChecklist(row.checklist),
    notes: row.notes,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toSelectionProcessShareLink(row: DbSelectionProcessShareLink): SelectionProcessShareLink {
  return {
    id: row.id,
    process_id: row.processId,
    token: row.token,
    permission: row.permission,
    label: row.label,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
  }
}
