import { ProfileHeader } from "@/components/profile-header"
import { SocialLinks } from "@/components/social-links"
import { UnifiedBookingForm } from "@/components/booking/unified-booking-form"
import { MentoringInfo } from "@/components/mentoring-info"
import { CalendarDays } from "lucide-react"

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-md flex flex-col gap-8">
        <ProfileHeader />

        <SocialLinks />

        <MentoringInfo />

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Agendar mentoria
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-xl border border-border bg-card p-6" id="booking">
            <UnifiedBookingForm />
          </div>
        </div>

        <footer className="text-center">
          <p className="text-xs text-muted-foreground">
            {"Adriano Monteiro"} &middot; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  )
}
