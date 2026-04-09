import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PaidBookingForm } from "@/components/dashboard/mentee/paid-booking-form"
import { PixQrCode } from "@/components/pix-qrcode"

export default function NewPaidBookingPage() {
  return (
    <>
      <DashboardHeader title="Nova Mentoria" description="Solicitar mentoria paga ou particular" />
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <PaidBookingForm />

        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pagamento via PIX
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <PixQrCode
            pixKey="03440795381"
            merchantName="Adriano Monteiro"
            merchantCity="Fortaleza"
          />
        </div>
      </div>
    </>
  )
}
