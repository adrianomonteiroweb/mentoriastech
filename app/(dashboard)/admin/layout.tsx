import { redirect } from "next/navigation"
import { getProfile } from "@/lib/utils/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile) {
    redirect("/login?redirect=/admin")
  }

  if (profile.role !== "admin") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
