import { NextResponse } from "next/server"
import { z } from "zod"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { getTaskById, createTaskItem } from "@/lib/db/booking-tasks"
import { uploadMentorshipFile, UploadError } from "@/lib/utils/upload"

interface RouteContext {
  params: Promise<{ id: string; taskId: string }>
}

const commentSchema = z.object({
  type: z.literal("comment"),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1, "Conteudo obrigatorio"),
})

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireMentorAccess()
    const { id: bookingId, taskId } = await context.params

    const task = await getTaskById(taskId)
    if (!task || task.bookingId !== bookingId) {
      return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const parsed = commentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Dados invalidos" },
          { status: 400 },
        )
      }

      const item = await createTaskItem({
        taskId,
        type: "comment",
        title: parsed.data.title || null,
        content: parsed.data.content,
        uploadedBy: user.id,
      })

      return NextResponse.json({ data: item }, { status: 201 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = (formData.get("title") as string) || ""
    const type = (formData.get("type") as string) || "file"
    const durationStr = formData.get("duration_seconds") as string | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 })
    }

    if (type !== "file" && type !== "audio") {
      return NextResponse.json({ error: "Tipo invalido" }, { status: 400 })
    }

    const result = await uploadMentorshipFile(file, bookingId)

    const item = await createTaskItem({
      taskId,
      type: type as "file" | "audio",
      title: title.trim() || null,
      fileUrl: result.url,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
      durationSeconds: durationStr ? parseInt(durationStr, 10) || null : null,
      uploadedBy: user.id,
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
