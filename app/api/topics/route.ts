import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db, mentoringTopics } from "@/lib/db"
import { toMentoringTopic } from "@/lib/db/mappers"

export async function GET() {
  try {
    const topics = await db
      .select()
      .from(mentoringTopics)
      .where(eq(mentoringTopics.isActive, true))
      .orderBy(asc(mentoringTopics.sortOrder))

    return NextResponse.json({ topics: topics.map(toMentoringTopic) })
  } catch (error) {
    console.error("[topics] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
  }
}
