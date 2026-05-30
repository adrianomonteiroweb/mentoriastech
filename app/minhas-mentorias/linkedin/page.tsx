import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getProfileByEmail } from "@/lib/utils/mentee-resume"
import { LinkedInImprover } from "@/components/minhas-mentorias/linkedin-improver"

export const dynamic = "force-dynamic"

export default async function LinkedInPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  const profile = await getProfileByEmail(session.email)
  const hasLinkedinPdf = Boolean(
    profile?.linkedinPdfUrl?.startsWith("private/linkedin/"),
  )

  return <LinkedInImprover email={session.email} initialHasLinkedinPdf={hasLinkedinPdf} />
}
