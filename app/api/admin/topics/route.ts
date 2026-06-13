import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import { db, mentoringTopics } from "@/lib/db"
import { toMentoringTopic } from "@/lib/db/mappers"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["free", "paid"]),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
})

export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)

    const url = new URL(request.url)
    const filterMentorId = profile.role === "admin"
      ? url.searchParams.get("mentorId") || mentorId
      : mentorId

    const data = await db
      .select()
      .from(mentoringTopics)
      .where(eq(mentoringTopics.mentorId, filterMentorId))
      .orderBy(mentoringTopics.sortOrder)

    return NextResponse.json({ data: data.map(toMentoringTopic) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [data] = await db
      .insert(mentoringTopics)
      .values({
        name: parsed.data.name,
        category: parsed.data.category,
        description: parsed.data.description,
        isActive: parsed.data.is_active,
        sortOrder: parsed.data.sort_order,
        mentorId,
      })
      .returning()

    return NextResponse.json({ data: toMentoringTopic(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
