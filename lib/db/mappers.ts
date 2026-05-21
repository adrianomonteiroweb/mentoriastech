import type {
  Booking as DbBooking,
  ContentCategory as DbContentCategory,
  ContentItem as DbContentItem,
  Job as DbJob,
  MentoringSlot as DbMentoringSlot,
  MentoringTopic as DbMentoringTopic,
  Profile as DbProfile,
} from "@/lib/db/schema"
import type {
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
    avatar_url: row.avatarUrl,
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
    salary_range: row.salaryRange,
    application_url: row.applicationUrl,
    status: row.status,
    approved_by: row.approvedBy,
    approved_at: toIso(row.approvedAt),
    expires_at: toIso(row.expiresAt),
    created_at: toIso(row.createdAt) || "",
    updated_at: toIso(row.updatedAt) || "",
  }
}
