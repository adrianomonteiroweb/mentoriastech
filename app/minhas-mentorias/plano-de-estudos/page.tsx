import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { StudyPlanPanel } from "@/components/minhas-mentorias/study-plan/study-plan-panel"

export const dynamic = "force-dynamic"

export default async function StudyPlanPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  return <StudyPlanPanel email={session.email} />
}
