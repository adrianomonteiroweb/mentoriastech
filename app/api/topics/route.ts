import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { db, mentoringTopics } from "@/lib/db"
import { toMentoringTopic } from "@/lib/db/mappers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorId = searchParams.get("mentorId")

    const filters = [eq(mentoringTopics.isActive, true)]
    if (mentorId) filters.push(eq(mentoringTopics.mentorId, mentorId))

    const topics = await db
      .select()
      .from(mentoringTopics)
      .where(and(...filters))
      .orderBy(asc(mentoringTopics.sortOrder))

    return NextResponse.json({ topics: topics.map(toMentoringTopic) })
  } catch (error) {
    console.error("[topics] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
  }
}
