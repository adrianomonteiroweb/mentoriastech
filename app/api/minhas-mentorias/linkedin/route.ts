import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { deleteFile, uploadPrivateLinkedinPdf, UploadError } from "@/lib/utils/upload"
import {
  ensureProfileForMenteeEmail,
  getProfileByEmail,
} from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function usableLinkedinPdfPathname(url: string | null | undefined): string | null {
  if (!url) return null
  if (!url.startsWith("private/linkedin/")) return null
  return url
}

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await getProfileByEmail(session.email)
    const hasLinkedinPdf = Boolean(usableLinkedinPdfPathname(profile?.linkedinPdfUrl))
    return NextResponse.json({ hasLinkedinPdf })
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
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    }

    const profile = await ensureProfileForMenteeEmail(session.email)
    const previous = profile.linkedinPdfUrl || null
    const result = await uploadPrivateLinkedinPdf(file, profile.id)

    await db
      .update(profiles)
      .set({ linkedinPdfUrl: result.pathname, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))

    if (previous && previous !== result.pathname) {
      await deleteFile(previous)
    }

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "linkedin_pdf_uploaded_minhas_mentorias",
      route: new URL(request.url).pathname,
      request,
      metadata: { size: result.size, replaced: Boolean(previous) },
    })

    return NextResponse.json({ hasLinkedinPdf: true, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
