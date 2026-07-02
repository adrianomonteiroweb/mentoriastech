import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { LinkedInImprover } from "@/components/minhas-mentorias/linkedin-improver"
import { ToolViewTracker } from "@/components/tool-view-tracker"

export const dynamic = "force-dynamic"

export default async function LinkedInPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  return (
    <>
      <ToolViewTracker tool="linkedin" />
      <LinkedInImprover email={session.email} />
    </>
  )
}
