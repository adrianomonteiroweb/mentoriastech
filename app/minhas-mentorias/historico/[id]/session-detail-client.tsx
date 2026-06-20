"use client"

import { MessageCircle, Mail } from "lucide-react"
import { SessionDetailHeader } from "@/components/minhas-mentorias/session-detail/session-detail-header"
import { SessionTabs } from "@/components/minhas-mentorias/session-detail/session-tabs"
import { BottomNav } from "@/components/minhas-mentorias/layout/bottom-nav"
import {
  buildWhatsAppCorrectionLink,
  buildEmailCorrectionLink,
} from "@/lib/mentor-contact"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"
import type { BookingStatus } from "@/lib/types/database"
import { useState } from "react"
import { ProfileAssets } from "@/components/minhas-mentorias/profile-assets"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  email: string
  booking: MenteeBookingItem
}

export function SessionDetailClient({ email, booking }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  const whatsapp = buildWhatsAppCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })
  const emailLink = buildEmailCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })

  async function handleLogout() {
    await fetch("/api/minhas-mentorias/logout", { method: "POST" })
    router.push("/minhas-mentorias")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SessionDetailHeader
        bookingId={booking.id}
        topicName={booking.topicName}
        status={booking.status as BookingStatus}
      />

      <div className="mx-auto max-w-2xl">
        <SessionTabs
          booking={booking}
          attachmentCount={booking.attachmentCount}
          taskCount={booking.taskCount}
        />

        <div className="px-4 pb-6">
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Identificou algo a corrigir?
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-4 min-h-[48px] text-base text-[#15803d] hover:bg-[#25D366]/20 dark:text-[#4ade80] transition-colors"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </a>
              <a
                href={emailLink}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 min-h-[48px] text-base text-primary hover:bg-primary/20 transition-colors"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </a>
            </div>
          </div>
        </div>
      </div>

      <BottomNav onProfileClick={() => setProfileOpen(true)} />

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-4">
            <ProfileAssets />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 min-h-[48px] text-base font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
