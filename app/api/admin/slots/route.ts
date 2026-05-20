import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, mentoringSlots } from "@/lib/db"
import { toMentoringSlot } from "@/lib/db/mappers"
import { z } from "zod"

const freeSlotSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_type: z.literal("free"),
  is_active: z.boolean().default(true),
})

const paidSlotSchema = z.object({
  rrule: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_type: z.enum(["paid", "private"]),
  recurrence_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recurrence_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().default(true),
})

const createSchema = z.union([freeSlotSchema, paidSlotSchema])

export async function GET() {
  try {
    await requireRole("admin")

    const data = await db
      .select()
      .from(mentoringSlots)
      .orderBy(asc(mentoringSlots.dayOfWeek), asc(mentoringSlots.startTime))

    return NextResponse.json({ data: data.map(toMentoringSlot) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const insertData: typeof mentoringSlots.$inferInsert = {
      startTime: parsed.data.start_time + ":00",
      slotType: parsed.data.slot_type,
      isActive: parsed.data.is_active,
    }

    if ("day_of_week" in parsed.data) {
      insertData.dayOfWeek = parsed.data.day_of_week
    }

    if ("rrule" in parsed.data) {
      insertData.rrule = parsed.data.rrule
      insertData.recurrenceStart = parsed.data.recurrence_start
      insertData.recurrenceEnd = parsed.data.recurrence_end || null
    }

    const [data] = await db
      .insert(mentoringSlots)
      .values(insertData)
      .returning()

    return NextResponse.json({ data: toMentoringSlot(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
