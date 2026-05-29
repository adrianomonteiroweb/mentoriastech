import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { isLegacyPublicResumeUrl } from "@/lib/utils/resume-access"
import { deleteFile, uploadPrivateResume, UploadError } from "@/lib/utils/upload"
import {
  ensureProfileForMenteeEmail,
  getProfileByEmail,
  usableResumePathname,
} from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await getProfileByEmail(session.email)
    const hasResume = Boolean(usableResumePathname(profile?.resumeUrl))
    return NextResponse.json({ hasResume })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 })
    }

    const profile = await ensureProfileForMenteeEmail(session.email)
    const previousResume = profile.resumeUrl || null
    const result = await uploadPrivateResume(file, profile.id)

    await db
      .update(profiles)
      .set({ resumeUrl: result.pathname, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))

    if (
      previousResume &&
      previousResume !== result.pathname &&
      !isLegacyPublicResumeUrl(previousResume)
    ) {
      await deleteFile(previousResume)
    }

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "resume_uploaded_minhas_mentorias",
      route: new URL(request.url).pathname,
      request,
      metadata: { size: result.size, replaced: Boolean(previousResume) },
    })

    return NextResponse.json({ hasResume: true, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
