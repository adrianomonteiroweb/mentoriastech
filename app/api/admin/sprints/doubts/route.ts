import { and, asc, eq, inArray, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles, simDailyMessages, simSprints } from "@/lib/db"
import { requireMentorAccess } from "@/lib/utils/auth"

/**
 * Inbox do mentor: só o que precisa de resposta — dúvidas e impedimentos ainda
 * não lidos, em sprints ativas, agrupados por sprint (mais antigos primeiro).
 * Registros de progresso (kind "daily") NÃO entram aqui — ficam só na timeline.
 */
export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select({
        message: simDailyMessages,
        sprintId: simSprints.id,
        sprintTitle: simSprints.title,
        menteeName: profiles.fullName,
        menteeEmail: profiles.email,
      })
      .from(simDailyMessages)
      .innerJoin(simSprints, eq(simDailyMessages.sprintId, simSprints.id))
      .innerJoin(profiles, eq(simSprints.profileId, profiles.id))
      .where(
        and(
          eq(simDailyMessages.authorRole, "mentee"),
          inArray(simDailyMessages.kind, ["doubt", "impediment"]),
          isNull(simDailyMessages.readAt),
          eq(simSprints.status, "active"),
        ),
      )
      .orderBy(asc(simDailyMessages.createdAt))

    const groups = new Map<
      string,
      {
        sprint_id: string
        sprint_title: string
        mentee_name: string | null
        mentee_email: string
        messages: {
          id: string
          kind: string
          body: string
          sprint_day: number
          created_at: string
        }[]
      }
    >()

    for (const row of rows) {
      let group = groups.get(row.sprintId)
      if (!group) {
        group = {
          sprint_id: row.sprintId,
          sprint_title: row.sprintTitle,
          mentee_name: row.menteeName,
          mentee_email: row.menteeEmail,
          messages: [],
        }
        groups.set(row.sprintId, group)
      }
      group.messages.push({
        id: row.message.id,
        kind: row.message.kind,
        body: row.message.body,
        sprint_day: row.message.sprintDay,
        created_at:
          row.message.createdAt instanceof Date
            ? row.message.createdAt.toISOString()
            : row.message.createdAt,
      })
    }

    return NextResponse.json({ data: Array.from(groups.values()) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
