import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireAuth } from "@/lib/utils/auth"
import {
  createSignedResumeDownloadUrl,
  isLegacyPublicResumeUrl,
  isProtectedResumePath,
  safeOwnResumeHref,
  streamPrivateResume,
  verifySignedResumeDownload,
} from "@/lib/utils/resume-access"
import { deleteFile, uploadPrivateResume, UploadError } from "@/lib/utils/upload"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const signedDownload = verifySignedResumeDownload(requestUrl)

  if (signedDownload) {
    await logAuditEvent({
      actorId: signedDownload.signedBy,
      targetUserId: signedDownload.profileId,
      action: "resume_downloaded",
      route: requestUrl.pathname,
      request,
      metadata: { scope: signedDownload.scope },
    })
    return streamPrivateResume(signedDownload.pathname)
  }

  try {
    const user = await requireAuth()
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    if (!profile?.resumeUrl) {
      return NextResponse.json({ error: "Curriculo nao encontrado" }, { status: 404 })
    }

    if (isLegacyPublicResumeUrl(profile.resumeUrl)) {
      return NextResponse.json(
        { error: "Curriculo antigo precisa ser reenviado." },
        { status: 410 },
      )
    }

    if (!isProtectedResumePath(profile.resumeUrl)) {
      return NextResponse.json({ error: "Curriculo invalido" }, { status: 404 })
    }

    const signedUrl = createSignedResumeDownloadUrl({
      requestUrl: request.url,
      profileId: user.id,
      pathname: profile.resumeUrl,
      signedBy: user.id,
      scope: "self",
    })

    await logAuditEvent({
      actorId: user.id,
      targetUserId: user.id,
      action: "resume_signed_url_created",
      route: requestUrl.pathname,
      request,
      metadata: { scope: "self" },
    })

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 })
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    const previousResume = profile?.resumeUrl || null
    const result = await uploadPrivateResume(file, user.id)

    await db
      .update(profiles)
      .set({ resumeUrl: result.pathname, updatedAt: new Date() })
      .where(eq(profiles.id, user.id))

    if (previousResume && previousResume !== result.pathname) {
      await deleteFile(previousResume)
    }

    await logAuditEvent({
      actorId: user.id,
      targetUserId: user.id,
      action: "resume_uploaded",
      route: new URL(request.url).pathname,
      request,
      metadata: { size: result.size, replaced: Boolean(previousResume) },
    })

    return NextResponse.json({
      url: safeOwnResumeHref(result.pathname),
      resume_url: safeOwnResumeHref(result.pathname),
      size: result.size,
    })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
