import { NextResponse } from "next/server"
import { and, eq, or, sql } from "drizzle-orm"
import { db, tips } from "@/lib/db"
import { toTip } from "@/lib/db/mappers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const placement = searchParams.get("placement")

    if (placement !== "content" && placement !== "jobs") {
      return NextResponse.json(
        { error: "Tela inválida para buscar dicas" },
        { status: 400 },
      )
    }

    const [tip] = await db
      .select()
      .from(tips)
      .where(
        and(
          eq(tips.isActive, true),
          or(eq(tips.placement, placement), eq(tips.placement, "both")),
        ),
      )
      .orderBy(sql`random()`)
      .limit(1)

    return NextResponse.json({ data: tip ? toTip(tip) : null })
  } catch (error) {
    console.error("[tips/random] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar dica" }, { status: 500 })
  }
}
