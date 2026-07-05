import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { getActiveSprintForProfile } from "@/lib/db/sim"
import { SprintHome } from "@/components/minhas-mentorias/sprint/sprint-home"

export const dynamic = "force-dynamic"

export default async function SprintPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  // Poucos cliques: com sprint ativa, vai direto para ela
  const profile = await ensureProfileForMenteeEmail(session.email)
  const activeSprint = await getActiveSprintForProfile(profile.id)
  if (activeSprint) {
    redirect(`/minhas-mentorias/sprint/${activeSprint.id}`)
  }

  return <SprintHome email={session.email} />
}
