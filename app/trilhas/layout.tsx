import type { Metadata } from "next"
import { PublicNav } from "@/components/public-nav"
import { SiteFooter } from "@/components/site-footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Trilhas de Recolocação",
  description:
    "Trilhas estruturadas para recolocação profissional em tecnologia. Etapas organizadas para transição de carreira.",
  alternates: { canonical: "/trilhas" },
  openGraph: {
    title: "Trilhas de Recolocação | MentoriasTech",
    description:
      "Trilhas estruturadas para recolocação e transição de carreira em tecnologia.",
    url: `${SITE_URL}/trilhas`,
    type: "website",
  },
}

export default function TrilhasLayout({
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
