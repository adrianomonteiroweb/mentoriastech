import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { db, bookings } from "@/lib/db"
import { getTasksByBookingId, createTask } from "@/lib/db/booking-tasks"

interface RouteContext {
  params: Promise<{ id: string }>
}

const createSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio").max(500),
  sort_order: z.number().int().optional(),
})

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { id } = await context.params
    const tasks = await getTasksByBookingId(id)
    return NextResponse.json({ data: tasks })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { id: bookingId } = await context.params

    const [booking] = await db
      .select({ menteeId: bookings.menteeId })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1)

    if (!booking?.menteeId) {
      return NextResponse.json({ error: "Mentoria nao encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const task = await createTask({
      bookingId,
      menteeId: booking.menteeId,
      title: parsed.data.title,
      sortOrder: parsed.data.sort_order,
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
