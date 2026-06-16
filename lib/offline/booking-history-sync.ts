"use client"

export interface BookingHistorySyncPayload {
  topic_id: string
  session_date: string
  start_time: string
  topics_discussed: string
  mentee_strengths: string
  mentee_growth_areas: string
  admin_notes: string
}

export interface BookingHistoryQueueItem {
  id: string
  bookingId: string
  payload: BookingHistorySyncPayload
  clientCreatedAt: string
  updatedAt: string
  attempts: number
  lastError?: string
}

export interface BookingHistoryFlushResult {
  syncedCount: number
  pendingCount: number
  error?: string
}

const QUEUE_KEY = "mentoriastech:booking-history-sync-queue"
const DRAFT_PREFIX = "mentoriastech:booking-history-draft:"
const LEGACY_QUEUE_KEY = "adriano:booking-history-sync-queue"
const LEGACY_DRAFT_PREFIX = "adriano:booking-history-draft:"

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function createMutationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function serializePayload(payload: BookingHistorySyncPayload) {
  return JSON.stringify(payload)
}

function readQueue(): BookingHistoryQueueItem[] {
  if (!hasBrowserStorage()) return []

  try {
    let raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) {
      const legacy = window.localStorage.getItem(LEGACY_QUEUE_KEY)
      if (legacy) {
        window.localStorage.setItem(QUEUE_KEY, legacy)
        window.localStorage.removeItem(LEGACY_QUEUE_KEY)
        raw = legacy
      }
    }
    if (!raw) return []
    const value = JSON.parse(raw)

    return Array.isArray(value)
      ? value.filter((item): item is BookingHistoryQueueItem => {
          return (
            typeof item?.id === "string" &&
            typeof item?.bookingId === "string" &&
            typeof item?.payload === "object" &&
            typeof item?.clientCreatedAt === "string"
          )
        })
      : []
  } catch {
    return []
  }
}

function writeQueue(items: BookingHistoryQueueItem[]) {
  if (!hasBrowserStorage()) return

  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  syncDraftsFromQueue(items)
}

function syncDraftsFromQueue(items: BookingHistoryQueueItem[]) {
  if (!hasBrowserStorage()) return

  const latestByBooking = new Map<string, BookingHistoryQueueItem>()

  for (const item of items) {
    latestByBooking.set(item.bookingId, item)
  }

  for (const [bookingId, item] of latestByBooking) {
    window.localStorage.setItem(`${DRAFT_PREFIX}${bookingId}`, JSON.stringify(item))
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(DRAFT_PREFIX)) continue

    const bookingId = key.slice(DRAFT_PREFIX.length)
    if (!latestByBooking.has(bookingId)) {
      window.localStorage.removeItem(key)
    }
  }
}

export function clearBookingHistoryDraft(bookingId: string) {
  if (!hasBrowserStorage()) return
  window.localStorage.removeItem(`${DRAFT_PREFIX}${bookingId}`)
}

export function getQueuedBookingHistoryDraft(
  bookingId: string,
): BookingHistoryQueueItem | null {
  if (!hasBrowserStorage()) return null

  try {
    let raw = window.localStorage.getItem(`${DRAFT_PREFIX}${bookingId}`)
    if (!raw) {
      const legacy = window.localStorage.getItem(`${LEGACY_DRAFT_PREFIX}${bookingId}`)
      if (legacy) {
        window.localStorage.setItem(`${DRAFT_PREFIX}${bookingId}`, legacy)
        window.localStorage.removeItem(`${LEGACY_DRAFT_PREFIX}${bookingId}`)
        raw = legacy
      }
    }
    if (!raw) return null
    const value = JSON.parse(raw)

    if (value?.bookingId !== bookingId || typeof value?.payload !== "object") {
      return null
    }

    return value as BookingHistoryQueueItem
  } catch {
    return null
  }
}

export function countQueuedBookingHistoryChanges() {
  return readQueue().length
}

export function queueBookingHistoryChange(
  bookingId: string,
  payload: BookingHistorySyncPayload,
) {
  const queue = readQueue()
  const latestForBooking = [...queue]
    .reverse()
    .find((item) => item.bookingId === bookingId)

  if (
    latestForBooking &&
    serializePayload(latestForBooking.payload) === serializePayload(payload)
  ) {
    return latestForBooking
  }

  const now = new Date().toISOString()
  const item: BookingHistoryQueueItem = {
    id: createMutationId(),
    bookingId,
    payload,
    clientCreatedAt: now,
    updatedAt: now,
    attempts: 0,
  }

  writeQueue([...queue, item])
  return item
}

export async function flushBookingHistoryQueue(): Promise<BookingHistoryFlushResult> {
  if (typeof window === "undefined") {
    return { syncedCount: 0, pendingCount: 0 }
  }

  if (window.navigator && !window.navigator.onLine) {
    return { syncedCount: 0, pendingCount: countQueuedBookingHistoryChanges() }
  }

  let queue = readQueue().sort((a, b) =>
    a.clientCreatedAt.localeCompare(b.clientCreatedAt),
  )
  let syncedCount = 0

  for (const item of queue) {
    try {
      const res = await fetch("/api/admin/bookings/history-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation_id: item.id,
          booking_id: item.bookingId,
          payload: item.payload,
          client_created_at: item.clientCreatedAt,
        }),
      })

      if (!res.ok) {
        let message = "Nao foi possivel sincronizar agora."

        try {
          const data = await res.json()
          if (typeof data?.error === "string") message = data.error
        } catch {
        }

        queue = markQueueItemError(queue, item.id, message)
        writeQueue(queue)
        return {
          syncedCount,
          pendingCount: queue.length,
          error: message,
        }
      }

      queue = queue.filter((queuedItem) => queuedItem.id !== item.id)
      writeQueue(queue)
      syncedCount += 1
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Conexao indisponivel."
      queue = markQueueItemError(queue, item.id, message)
      writeQueue(queue)

      return {
        syncedCount,
        pendingCount: queue.length,
        error: message,
      }
    }
  }

  return { syncedCount, pendingCount: queue.length }
}

function markQueueItemError(
  queue: BookingHistoryQueueItem[],
  id: string,
  message: string,
) {
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          attempts: item.attempts + 1,
          lastError: message,
          updatedAt: new Date().toISOString(),
        }
      : item,
  )
}
