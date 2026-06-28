import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { TrilhaClient } from "./trilha-client"

export const dynamic = "force-dynamic"

export default async function TrilhaPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  return <TrilhaClient email={session.email} />
}
