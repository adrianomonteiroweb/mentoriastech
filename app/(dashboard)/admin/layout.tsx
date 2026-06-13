import { redirect } from "next/navigation"
import { getProfile } from "@/lib/utils/auth"
import { MentorFilterProvider } from "@/components/dashboard/admin/mentor-filter"

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

  return <MentorFilterProvider>{children}</MentorFilterProvider>
}
