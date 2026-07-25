import type { Metadata } from "next"
import { PublicNav } from "@/components/public-nav"
import { SiteFooter } from "@/components/site-footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Vagas em Tecnologia",
  description:
    "Curadoria de vagas em tecnologia: remotas, híbridas e presenciais, nacionais e internacionais. Atualizado diariamente.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "Vagas em Tecnologia | MentoriasTech",
    description:
      "Vagas curadas em tech para a comunidade de mentorados. Remotas, híbridas e presenciais.",
    url: `${SITE_URL}/jobs`,
    type: "website",
  },
}

export default function JobsLayout({
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
