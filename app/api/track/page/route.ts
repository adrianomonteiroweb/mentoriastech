import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { db, pageEvents } from "@/lib/db"
import { getSession } from "@/lib/utils/auth"

const trackSchema = z.object({
  event: z.enum(["visit", "click", "tool_view"]),
  path: z
    .string()
    .min(1)
    .max(200)
    .startsWith("/")
    .refine((value) => !value.includes("://"), "Path invalido"),
  target: z.string().min(1).max(60).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = trackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const { event, path, target } = parsed.data

    let visitorHash: string
    const session = await getSession().catch(() => null)
    if (session) {
      visitorHash = `user:${session.id}`
    } else {
      const forwarded = request.headers.get("x-forwarded-for")
      const ip = forwarded?.split(",")[0]?.trim() || "unknown"
      visitorHash = `ip:${createHash("sha256").update(ip).digest("hex").substring(0, 16)}`
    }

    await db.insert(pageEvents).values({
      path,
      eventType: event,
      target: target ?? null,
      visitorHash,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[track/page] Error:", error)
    // Tracking nunca deve quebrar a UX do visitante
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
