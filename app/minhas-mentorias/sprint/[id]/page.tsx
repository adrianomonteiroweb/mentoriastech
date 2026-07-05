import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { getSprintOwnedByProfile } from "@/lib/db/sim"
import { SprintHub } from "@/components/minhas-mentorias/sprint/sprint-hub"

export const dynamic = "force-dynamic"

export default async function SprintHubPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  const { id } = await params
  const profile = await ensureProfileForMenteeEmail(session.email)
  const sprint = await getSprintOwnedByProfile(id, profile.id)

  if (!sprint) {
    redirect("/minhas-mentorias/sprint")
  }

  return <SprintHub email={session.email} sprintId={id} />
}
