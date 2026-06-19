import { NextResponse } from "next/server"
import { z } from "zod"
import { requireMentorAccess } from "@/lib/utils/auth"
import { AuthError } from "@/lib/utils/auth"
import { getAttachmentsByBookingId, createAttachment } from "@/lib/db/booking-attachments"
import { uploadMentorshipFile, UploadError } from "@/lib/utils/upload"

interface RouteContext {
  params: Promise<{ id: string }>
}

const noteSchema = z.object({
  type: z.literal("note"),
  title: z.string().min(1, "Titulo obrigatorio").max(200),
  content: z.string().min(1, "Conteudo obrigatorio"),
})

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { id } = await context.params

    const attachments = await getAttachmentsByBookingId(id)
    return NextResponse.json({ data: attachments })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[bookings/attachments] GET error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireMentorAccess()
    const { id: bookingId } = await context.params
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const parsed = noteSchema.safeParse(body)
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
        return NextResponse.json({ error: firstError }, { status: 400 })
      }

      const attachment = await createAttachment({
        bookingId,
        uploadedBy: user.id,
        type: "note",
        title: parsed.data.title,
        content: parsed.data.content,
      })

      return NextResponse.json({ data: attachment }, { status: 201 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = (formData.get("title") as string) || ""
    const type = (formData.get("type") as string) || "file"
    const durationStr = formData.get("duration_seconds") as string | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 })
    }

    if (!title.trim()) {
      return NextResponse.json({ error: "Titulo obrigatorio" }, { status: 400 })
    }

    if (type !== "file" && type !== "audio") {
      return NextResponse.json({ error: "Tipo invalido" }, { status: 400 })
    }

    const result = await uploadMentorshipFile(file, bookingId)

    const attachment = await createAttachment({
      bookingId,
      uploadedBy: user.id,
      type,
      title: title.trim(),
      fileUrl: result.url,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
      durationSeconds: durationStr ? parseInt(durationStr, 10) || null : null,
    })

    return NextResponse.json({ data: attachment }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[bookings/attachments] POST error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
