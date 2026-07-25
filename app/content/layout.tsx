import type { Metadata } from "next"
import { PublicNav } from "@/components/public-nav"
import { SiteFooter } from "@/components/site-footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Biblioteca de Conteúdos",
  description:
    "PDFs, artigos, vídeos e links sobre programação e carreira em tecnologia. Conteúdos gratuitos curados para devs.",
  alternates: { canonical: "/content" },
  openGraph: {
    title: "Biblioteca de Conteúdos | MentoriasTech",
    description:
      "PDFs, artigos, vídeos e links gratuitos sobre programação e carreira em tech.",
    url: `${SITE_URL}/content`,
    type: "website",
  },
}

export default function ContentLayout({
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
