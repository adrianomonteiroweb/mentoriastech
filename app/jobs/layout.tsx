import type { Metadata } from "next"
import { PublicNav } from "@/components/public-nav"
import { PortalTheme } from "@/components/jobs/portal/portal-theme"
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
    // data-portal="jobs" troca a paleta de TODO o portal (ver app/globals.css).
    // Como as cores do projeto passam por variaveis CSS, cada componente shadcn
    // aqui dentro herda o verde sem precisar saber disso.
    //
    // `min-h-screen bg-background` e necessario: sem um fundo proprio, o corpo
    // da pagina continuaria pintado pela paleta do site por tras do conteudo.
    <div data-portal="jobs" className="flex min-h-screen flex-col bg-background">
      <PortalTheme />
      <PublicNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
