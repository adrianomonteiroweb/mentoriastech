import type { Metadata } from "next"
import { PublicNav } from "@/components/public-nav"
import { SiteFooter } from "@/components/site-footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Agenda de Mentorias",
  description:
    "Confira a agenda semanal de mentorias gratuitas em tecnologia. Veja horários disponíveis e agende sua sessão.",
  alternates: { canonical: "/schedule" },
  openGraph: {
    title: "Agenda de Mentorias | MentoriasTech",
    description:
      "Horários disponíveis para mentorias gratuitas em tecnologia.",
    url: `${SITE_URL}/schedule`,
    type: "website",
  },
}

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicNav />
      {children}
      <SiteFooter />
    </>
  )
}
