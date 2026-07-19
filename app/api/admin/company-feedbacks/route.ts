import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, companyFeedbacks, profiles } from "@/lib/db"

export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
      .select({
        id: companyFeedbacks.id,
        company: companyFeedbacks.company,
        category: companyFeedbacks.category,
        comment: companyFeedbacks.comment,
        status: companyFeedbacks.status,
        adminNotes: companyFeedbacks.adminNotes,
        createdAt: companyFeedbacks.createdAt,
        profileName: profiles.fullName,
        profileEmail: profiles.email,
      })
      .from(companyFeedbacks)
      .leftJoin(profiles, eq(companyFeedbacks.profileId, profiles.id))
      .orderBy(desc(companyFeedbacks.createdAt))

    return NextResponse.json({ data: rows })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
