import { redirect } from "next/navigation"
import { getProfile } from "@/lib/utils/auth"

export default async function DashboardPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect("/login")
  }

  // Redirecionar para o dashboard da role do usuário
  switch (profile.role) {
    case "admin":
      redirect("/dashboard/admin")
    case "hr":
      redirect("/dashboard/hr")
    default:
      redirect("/dashboard/mentee")
  }
}
