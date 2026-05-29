import { NextResponse } from "next/server"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { streamPrivateResume } from "@/lib/utils/resume-access"
import { getProfileByEmail, usableResumePathname } from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await getProfileByEmail(session.email)
    const pathname = usableResumePathname(profile?.resumeUrl)

    if (!profile || !pathname) {
      return NextResponse.json({ error: "Curriculo nao encontrado" }, { status: 404 })
    }

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "resume_downloaded",
      route: new URL(request.url).pathname,
      request,
      metadata: { scope: "self", area: "minhas_mentorias" },
    })

    return streamPrivateResume(pathname)
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
