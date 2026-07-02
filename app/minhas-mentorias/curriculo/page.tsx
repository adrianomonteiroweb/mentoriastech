import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db, opportunityResumes } from "@/lib/db"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getProfileByEmail, usableResumePathname } from "@/lib/utils/mentee-resume"
import { ResumeImprover } from "@/components/minhas-mentorias/resume-improver"
import { ToolViewTracker } from "@/components/tool-view-tracker"

export const dynamic = "force-dynamic"

export default async function CurriculoPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  const profile = await getProfileByEmail(session.email)
  const [resumeRow] = profile
    ? await db
        .select({ id: opportunityResumes.id })
        .from(opportunityResumes)
        .where(eq(opportunityResumes.profileId, profile.id))
        .limit(1)
    : []
  const hasResume = Boolean(usableResumePathname(profile?.resumeUrl) || resumeRow)

  return (
    <>
      <ToolViewTracker tool="resume" />
      <ResumeImprover
        variant="authenticated"
        email={session.email}
        initialHasResume={hasResume}
      />
    </>
  )
}
