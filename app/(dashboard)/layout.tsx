import { redirect } from "next/navigation"
import { getProfile } from "@/lib/utils/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile) {
    redirect("/login?redirect=/dashboard")
  }

  return (
    <SidebarProvider>
      <SidebarNav
        role={profile.role}
        userName={profile.full_name || profile.email || "Usuario"}
      />
      <SidebarInset className="min-w-0">
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
