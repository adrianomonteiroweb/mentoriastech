import { NextResponse } from "next/server"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { getProfileByEmail } from "@/lib/utils/mentee-resume"
import { getPrivateFile } from "@/lib/utils/upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await getProfileByEmail(session.email)

    const pathname = profile?.linkedinPdfUrl
    if (!pathname || !pathname.startsWith("private/linkedin/")) {
      return NextResponse.json({ error: "PDF do LinkedIn não encontrado" }, { status: 404 })
    }

    const file = await getPrivateFile(pathname)
    if (!file || !file.stream) {
      return NextResponse.json({ error: "PDF do LinkedIn não encontrado" }, { status: 404 })
    }

    return new Response(file.stream as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="linkedin-profile.pdf"',
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
