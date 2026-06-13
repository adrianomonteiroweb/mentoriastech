import { redirect } from "next/navigation"
import { getProfile } from "@/lib/utils/auth"

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile) {
    redirect("/login?redirect=/mentor")
  }

  if (profile.role !== "mentor") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
