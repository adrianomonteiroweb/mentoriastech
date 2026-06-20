import { redirect } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { FerramentasClient } from "./ferramentas-client"

export const dynamic = "force-dynamic"

export default async function FerramentasPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  return <FerramentasClient email={session.email} />
}
