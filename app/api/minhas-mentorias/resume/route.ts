import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, opportunityResumes, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { extractPdfText } from "@/lib/utils/pdf-to-markdown"
import { uploadPrivateResume, UploadError } from "@/lib/utils/upload"
import {
  ensureProfileForMenteeEmail,
  getProfileByEmail,
  usableResumePathname,
} from "@/lib/utils/mentee-resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ResumeResponseItem {
  id: string | null
  label: string
  file_size_bytes: number | null
  is_default: boolean
  created_at: string
  download_url: string
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function mapResume(row: typeof opportunityResumes.$inferSelect): ResumeResponseItem {
  return {
    id: row.id,
    label: row.label,
    file_size_bytes: row.fileSizeBytes,
    is_default: row.isDefault,
    created_at: toIso(row.createdAt) || "",
    download_url: `/api/minhas-mentorias/resume/download?id=${row.id}`,
  }
}

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await getProfileByEmail(session.email)
    if (!profile) {
      return NextResponse.json({ hasResume: false, resumes: [] })
    }

    const rows = await db
      .select()
      .from(opportunityResumes)
      .where(eq(opportunityResumes.profileId, profile.id))
      .orderBy(desc(opportunityResumes.createdAt))

    const currentResume = usableResumePathname(profile.resumeUrl)
    const resumes: ResumeResponseItem[] = rows.map(mapResume)

    if (currentResume && !rows.some((row) => row.fileUrl === currentResume)) {
      resumes.unshift({
        id: null,
        label: "Curriculo atual",
        file_size_bytes: null,
        is_default: true,
        created_at: toIso(profile.updatedAt) || "",
        download_url: "/api/minhas-mentorias/resume/download",
      })
    }

    return NextResponse.json({ hasResume: resumes.length > 0, resumes })
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
    const labelValue = formData.get("label")
    const rawLabel = typeof labelValue === "string" ? labelValue.trim() : ""
    const fallbackLabel = file.name.replace(/\.pdf$/i, "").trim()
    const label = (rawLabel || fallbackLabel || "Curriculo").slice(0, 120)
    const fileBuffer = await file.arrayBuffer()
    const resumeMarkdown = await extractPdfText(fileBuffer)
    const result = await uploadPrivateResume(file, profile.id)

    await db
      .update(opportunityResumes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(opportunityResumes.profileId, profile.id))

    const [resume] = await db
      .insert(opportunityResumes)
      .values({
        profileId: profile.id,
        label,
        fileUrl: result.pathname,
        fileSizeBytes: result.size,
        isDefault: true,
      })
      .returning()

    await db
      .update(profiles)
      .set({ resumeUrl: result.pathname, resumeMarkdown, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "resume_uploaded_minhas_mentorias",
      route: new URL(request.url).pathname,
      request,
      metadata: { size: result.size, resumeId: resume.id, multiple: true },
    })

    return NextResponse.json({
      hasResume: true,
      size: result.size,
      resume: mapResume(resume),
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
