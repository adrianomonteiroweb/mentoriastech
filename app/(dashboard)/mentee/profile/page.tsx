import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default function MenteeProfilePage() {
  return (
    <>
      <DashboardHeader title="Perfil" description="Complete seu cadastro" />
      <div className="p-4 md:p-6">
        <ProfileForm />
      </div>
    </>
  )
}
