import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getProfileByEmail, usableResumePathname } from "@/lib/utils/mentee-resume"
import { ResumeImprover } from "@/components/minhas-mentorias/resume-improver"

export const dynamic = "force-dynamic"

export default async function CurriculoPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  const profile = await getProfileByEmail(session.email)
  const hasResume = Boolean(usableResumePathname(profile?.resumeUrl))

  return <ResumeImprover email={session.email} initialHasResume={hasResume} />
}
