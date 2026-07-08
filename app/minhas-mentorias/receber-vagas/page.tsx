import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { JobAlertsPanel } from "@/components/minhas-mentorias/job-alerts/job-alerts-panel"

export const dynamic = "force-dynamic"

export default async function ReceberVagasPage() {
  const session = await getMenteeAccessSession()
  if (!session) redirect("/minhas-mentorias")
  return <JobAlertsPanel email={session.email} />
}
