import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"
import { uploadFile, UploadError } from "@/lib/utils/upload"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    const [mentee] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 })
    }

    const result = await uploadFile(file, `resumes/${id}`, "resume")

    await db
      .update(profiles)
      .set({ resumeUrl: result.url, updatedAt: new Date() })
      .where(eq(profiles.id, id))

    return NextResponse.json({ url: result.url, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
