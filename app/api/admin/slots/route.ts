import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

// Slot simples (gratuito) — usa day_of_week
const freeSlotSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_type: z.literal("free"),
  is_active: z.boolean().default(true),
})

// Slot com RRule (pago/privado) — usa rrule + recurrence dates
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
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("mentoring_slots")
      .select("*")
      .order("day_of_week")
      .order("start_time")

    if (error) throw error
    return NextResponse.json({ data })
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

    const supabase = createAdminClient()
    const insertData: Record<string, unknown> = {
      start_time: parsed.data.start_time + ":00",
      slot_type: parsed.data.slot_type,
      is_active: parsed.data.is_active,
    }

    if ("day_of_week" in parsed.data) {
      insertData.day_of_week = parsed.data.day_of_week
    }
    if ("rrule" in parsed.data) {
      insertData.rrule = parsed.data.rrule
      insertData.recurrence_start = parsed.data.recurrence_start
      insertData.recurrence_end = parsed.data.recurrence_end || null
    }

    const { data, error } = await supabase
      .from("mentoring_slots")
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
