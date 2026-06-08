import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
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

const updateSchema = z.object({
  linkedin_url: z.string().url("LinkedIn invalido").optional().or(z.literal("")),
})

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
    return NextResponse.json({
      hasLinkedinPdf,
      linkedin_url: profile?.linkedinUrl || "",
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      )
    }

    const profile = await ensureProfileForMenteeEmail(session.email)
    const linkedinUrl = parsed.data.linkedin_url?.trim() || null

    await db
      .update(profiles)
      .set({ linkedinUrl, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "linkedin_url_updated_minhas_mentorias",
      route: new URL(request.url).pathname,
      request,
      metadata: { hasLinkedinUrl: Boolean(linkedinUrl) },
    })

    return NextResponse.json({ linkedin_url: linkedinUrl || "" })
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
