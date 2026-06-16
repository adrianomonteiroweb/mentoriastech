import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireRole } from "@/lib/utils/auth"
import {
  createSignedResumeDownloadUrl,
  isLegacyPublicResumeUrl,
  isProtectedResumePath,
  safeProfileResumeHref,
  streamPrivateResume,
  verifySignedResumeDownload,
} from "@/lib/utils/resume-access"
import { extractPdfText } from "@/lib/utils/pdf-to-markdown"
import { deleteFile, uploadPrivateResume, UploadError } from "@/lib/utils/upload"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const requestUrl = new URL(request.url)
  const signedDownload = verifySignedResumeDownload(requestUrl)

  if (signedDownload) {
    if (signedDownload.profileId !== id) {
      return NextResponse.json({ error: "Assinatura invalida" }, { status: 403 })
    }

    await logAuditEvent({
      actorId: signedDownload.signedBy,
      targetUserId: id,
      action: "resume_downloaded",
      route: requestUrl.pathname,
      request,
      metadata: { scope: signedDownload.scope },
    })
    return streamPrivateResume(signedDownload.pathname)
  }

  try {
    const actor = await requireRole("admin", "hr")

    const [mentee] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)
    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    if (!mentee.resumeUrl) {
      return NextResponse.json({ error: "Curriculo nao encontrado" }, { status: 404 })
    }

    if (isLegacyPublicResumeUrl(mentee.resumeUrl)) {
      await db
        .update(profiles)
        .set({ resumeUrl: null, resumeMarkdown: null, updatedAt: new Date() })
        .where(eq(profiles.id, id))
      return NextResponse.json(
        { error: "Curriculo nao encontrado" },
        { status: 404 },
      )
    }

    if (!isProtectedResumePath(mentee.resumeUrl)) {
      return NextResponse.json({ error: "Curriculo invalido" }, { status: 404 })
    }

    const signedUrl = createSignedResumeDownloadUrl({
      requestUrl: request.url,
      profileId: id,
      pathname: mentee.resumeUrl,
      signedBy: actor.id,
      scope: actor.role === "hr" ? "hr" : "admin",
    })

    await logAuditEvent({
      actorId: actor.id,
      targetUserId: id,
      action: "resume_signed_url_created",
      route: requestUrl.pathname,
      request,
      metadata: { scope: actor.role },
    })

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole("admin", "mentor")
    const { id } = await params

    const [mentee] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)
    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 })
    }

    const previousResume = mentee.resumeUrl || null
    const fileBuffer = await file.arrayBuffer()
    const resumeMarkdown = await extractPdfText(fileBuffer)
    const result = await uploadPrivateResume(file, id)

    await db
      .update(profiles)
      .set({ resumeUrl: result.pathname, resumeMarkdown, updatedAt: new Date() })
      .where(eq(profiles.id, id))

    if (
      previousResume &&
      previousResume !== result.pathname &&
      !isLegacyPublicResumeUrl(previousResume)
    ) {
      await deleteFile(previousResume)
    }

    await logAuditEvent({
      actorId: actor.id,
      targetUserId: id,
      action: "resume_uploaded_by_admin",
      route: new URL(request.url).pathname,
      request,
      metadata: { size: result.size, replaced: Boolean(previousResume) },
    })

    const href = safeProfileResumeHref(id, result.pathname)
    return NextResponse.json({ url: href, resume_url: href, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
