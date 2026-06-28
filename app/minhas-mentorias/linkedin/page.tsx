import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { LinkedInImprover } from "@/components/minhas-mentorias/linkedin-improver"

export const dynamic = "force-dynamic"

export default async function LinkedInPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  return <LinkedInImprover email={session.email} />
}
