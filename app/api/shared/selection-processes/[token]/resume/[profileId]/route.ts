import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import {
  db,
  profiles,
  selectionProcessCandidates,
  selectionProcessShareLinks,
} from "@/lib/db"
import {
  createSignedResumeDownloadUrl,
  isProtectedResumePath,
} from "@/lib/utils/resume-access"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; profileId: string }> },
) {
  try {
    const { token, profileId } = await params

    const [link] = await db
      .select()
      .from(selectionProcessShareLinks)
      .where(eq(selectionProcessShareLinks.token, token))
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: "Link invalido ou revogado" }, { status: 404 })
    }

    const [candidate] = await db
      .select()
      .from(selectionProcessCandidates)
      .where(
        and(
          eq(selectionProcessCandidates.processId, link.processId),
          eq(selectionProcessCandidates.menteeId, profileId),
        ),
      )
      .limit(1)

    if (!candidate) {
      return NextResponse.json({ error: "Candidato nao encontrado neste processo" }, { status: 404 })
    }

    const [profile] = await db
      .select({ resumeUrl: profiles.resumeUrl })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1)

    if (!profile?.resumeUrl || !isProtectedResumePath(profile.resumeUrl)) {
      return NextResponse.json({ error: "Curriculo nao encontrado" }, { status: 404 })
    }

    const origin = new URL(request.url).origin
    const adminResumeUrl = `${origin}/api/admin/mentees/${profileId}/resume`

    const signedUrl = createSignedResumeDownloadUrl({
      requestUrl: adminResumeUrl,
      profileId,
      pathname: profile.resumeUrl,
      signedBy: `shared:${link.id}`,
      scope: "admin",
    })

    return NextResponse.redirect(signedUrl)
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
