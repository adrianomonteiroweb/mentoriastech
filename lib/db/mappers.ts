import type {
  Ad as DbAd,
  Booking as DbBooking,
  ContentCategory as DbContentCategory,
  ContentItem as DbContentItem,
  Job as DbJob,
  MentoringSlot as DbMentoringSlot,
  MentoringTopic as DbMentoringTopic,
  Profile as DbProfile,
} from "@/lib/db/schema"
import type {
  Ad,
  Booking,
  ContentCategory,
  ContentItem,
  Job,
  MentoringSlot,
  MentoringTopic,
  Profile,
} from "@/lib/types/database"

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
    whatsapp_number: row.whatsappNumber,
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

export function toContentItem(row: DbContentItem): ContentItem {
  return {
    id: row.id,
    category_id: row.categoryId,
    title: row.title,
    description: row.description,
    content_type: row.contentType,
    url: row.url,
    article_body: row.articleBody,
    file_size_bytes: row.fileSizeBytes,
    is_published: row.isPublished,
    view_count: row.viewCount,
    created_by: row.createdBy,
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}

export function toBooking(row: DbBooking): Booking {
  return {
    id: row.id,
    mentee_id: row.menteeId,
    guest_name: row.guestName,
    guest_email: row.guestEmail,
    guest_whatsapp: row.guestWhatsapp,
    slot_id: row.slotId,
    topic_id: row.topicId,
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
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}
