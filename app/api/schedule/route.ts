import { NextResponse } from "next/server"
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm"
import { bookings, db, mentoringSlots, mentoringTopics, profiles } from "@/lib/db"
import { expandRRuleDates } from "@/lib/rrule-utils"

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
]

function normalizeTime(time: string | null | undefined) {
  if (!time) return ""
  return time.length === 5 ? `${time}:00` : time
}

export async function GET() {
  try {
    const [slots, topics] = await Promise.all([
      db
        .select()
        .from(mentoringSlots)
        .where(eq(mentoringSlots.isActive, true))
        .orderBy(asc(mentoringSlots.startTime)),
      db
        .select()
        .from(mentoringTopics)
        .where(eq(mentoringTopics.isActive, true))
        .orderBy(asc(mentoringTopics.sortOrder)),
    ])

    const SCHEDULE_WEEKS = 16

    const now = new Date()
    const currentDay = now.getDay()

    const monday = new Date(now)
    monday.setDate(now.getDate() - ((currentDay + 6) % 7))
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const horizonOut = new Date(monday)
    horizonOut.setDate(monday.getDate() + SCHEDULE_WEEKS * 7 - 1)
    horizonOut.setHours(23, 59, 59, 999)

    const mondayStr = monday.toISOString().split("T")[0]
    const sundayStr = sunday.toISOString().split("T")[0]
    const horizonStr = horizonOut.toISOString().split("T")[0]

    const bookingRows = await db
      .select({
        id: bookings.id,
        menteeId: bookings.menteeId,
        guestName: bookings.guestName,
        topicId: bookings.topicId,
        sessionDate: bookings.sessionDate,
        startTime: bookings.startTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.sessionDate, mondayStr),
          lte(bookings.sessionDate, horizonStr),
          inArray(bookings.status, ["pending", "confirmed", "paid", "scheduled"]),
        ),
      )

    const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]))
    const menteeIds = Array.from(
      new Set(bookingRows.map((booking) => booking.menteeId).filter(Boolean)),
    ) as string[]

    const menteeProfiles = menteeIds.length
      ? await db
          .select()
          .from(profiles)
          .where(inArray(profiles.id, menteeIds))
      : []

    const menteeNames = Object.fromEntries(
      menteeProfiles.map((profile) => [
        profile.id,
        profile.fullName?.split(" ")[0] || "Mentorado",
      ]),
    )

    function getSlotBookings(dateStr: string, startTime: string) {
      const normalizedStartTime = normalizeTime(startTime)

      return bookingRows
        .filter(
          (booking) =>
            booking.sessionDate === dateStr &&
            normalizeTime(booking.startTime) === normalizedStartTime,
        )
        .map((booking) => ({
          id: booking.id,
          topic: booking.topicId ? topicNames[booking.topicId] || "Tema livre" : "Tema livre",
          firstName: booking.menteeId
            ? menteeNames[booking.menteeId] || "Mentorado"
            : booking.guestName?.split(" ")[0] || "Visitante",
          status: booking.status,
        }))
    }

    const freeSlots = slots.filter((slot) => !slot.rrule && slot.dayOfWeek !== null)
    const paidSlots = slots.filter((slot) => slot.rrule)

    type ScheduleEntry = {
      id: string
      slotId: string
      dayOfWeek: number
      dayName: string
      startTime: string
      slotType: typeof slots[number]["slotType"]
      date: string
      bookings: ReturnType<typeof getSlotBookings>
      isAvailable: boolean
    }

    const freeSchedule: ScheduleEntry[] = []
    for (const slot of freeSlots) {
      const daysToAdd = (slot.dayOfWeek! - 1 + 7) % 7
      const startTime = slot.startTime.substring(0, 5)

      for (let week = 0; week < SCHEDULE_WEEKS; week++) {
        const slotDate = new Date(monday)
        slotDate.setDate(monday.getDate() + daysToAdd + week * 7)
        const slotDateStr = slotDate.toISOString().split("T")[0]
        const slotBookings = getSlotBookings(slotDateStr, slot.startTime)

        freeSchedule.push({
          id: `${slot.id}_${slotDateStr}`,
          slotId: slot.id,
          dayOfWeek: slot.dayOfWeek!,
          dayName: DAY_NAMES[slot.dayOfWeek!],
          startTime,
          slotType: slot.slotType,
          date: slotDateStr,
          bookings: slotBookings,
          isAvailable: slotBookings.length === 0,
        })
      }
    }

    const paidSchedule: ScheduleEntry[] = []
    for (const slot of paidSlots) {
      if (!slot.rrule || !slot.recurrenceStart) continue

      const dates = expandRRuleDates(
        slot.rrule,
        slot.recurrenceStart,
        slot.recurrenceEnd,
        now,
        horizonOut,
      )

      for (const dateStr of dates) {
        const dayOfWeek = new Date(dateStr + "T12:00:00").getDay()
        const startTime = slot.startTime.substring(0, 5)
        const slotBookings = getSlotBookings(dateStr, slot.startTime)

        paidSchedule.push({
          id: `${slot.id}_${dateStr}`,
          slotId: slot.id,
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          startTime,
          slotType: slot.slotType,
          date: dateStr,
          bookings: slotBookings,
          isAvailable: slotBookings.length === 0,
        })
      }
    }

    const schedule = [...freeSchedule, ...paidSchedule]
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        return dateCompare !== 0 ? dateCompare : a.startTime.localeCompare(b.startTime)
      })
      .filter((slot) => `${slot.date}T${slot.startTime}:00` > now.toISOString())

    return NextResponse.json({
      schedule,
      topics: topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        category: topic.category,
        description: topic.description,
      })),
      weekStart: mondayStr,
      weekEnd: sundayStr,
    })
  } catch (error) {
    console.error("[schedule] Error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar agenda" },
      { status: 500 },
    )
  }
}
