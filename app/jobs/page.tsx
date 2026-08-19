import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site"
import JobsPortal from "./jobs-client"

export const metadata: Metadata = {
  title: "Portal de Vagas Tech — Vagas em Tecnologia",
  description:
    "Portal de vagas tech curadas todos os dias pela comunidade MentoriasTech. Vagas remotas, internacionais, júnior, pleno, sênior e estágio em tecnologia. Acesse as vagas do dia agora.",
  keywords: [
    "vagas tech",
    "vagas em tecnologia",
    "vagas remotas",
    "vagas internacionais",
    "vagas junior tecnologia",
    "vagas pleno",
    "vagas senior",
    "vagas estagio tecnologia",
    "vagas desenvolvedor",
    "vagas programador",
    "vagas TI",
    "vagas recentes tecnologia",
    "emprego tecnologia",
    "vagas remote first",
    "vagas frontend",
    "vagas backend",
  ],
  openGraph: {
    title: "Portal de Vagas Tech — MentoriasTech",
    description:
      "Vagas tech curadas todos os dias. Remotas, internacionais, júnior, pleno, sênior e estágio.",
    type: "website",
    url: `${SITE_URL}/jobs`,
    locale: "pt_BR",
    siteName: "MentoriasTech",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal de Vagas Tech — MentoriasTech",
    description: "Vagas tech curadas todos os dias. Remotas, internacionais, júnior, pleno e estágio.",
  },
  alternates: {
    canonical: `${SITE_URL}/jobs`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function JobsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Portal de Vagas Tech — MentoriasTech",
            description:
              "Portal de vagas tech curadas todos os dias pela comunidade MentoriasTech. Vagas remotas, internacionais, júnior, pleno, sênior e estágio.",
            url: `${SITE_URL}/jobs`,
            inLanguage: "pt-BR",
            isPartOf: {
              "@type": "WebSite",
              name: "MentoriasTech",
              url: SITE_URL,
            },
            about: {
              "@type": "Thing",
              name: "Vagas de emprego em tecnologia",
              description:
                "Vagas tech remotas, internacionais, júnior, pleno, sênior e estágio curadas diariamente",
            },
          }),
        }}
      />
      <JobsPortal />
    </>
  )
}
