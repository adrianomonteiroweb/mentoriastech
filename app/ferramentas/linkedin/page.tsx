import type { Metadata } from "next"
import { LinkedInImprover } from "@/components/minhas-mentorias/linkedin-improver"
import { ToolViewTracker } from "@/components/tool-view-tracker"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Melhorar Perfil do LinkedIn com IA Grátis",
  description:
    "Ferramenta gratuita de IA para otimizar seu perfil do LinkedIn: headline, seção sobre, experiências, conexões e um checklist com nota. Sem cadastro.",
  keywords: [
    "melhorar LinkedIn com IA",
    "otimizar perfil LinkedIn grátis",
    "headline LinkedIn",
    "perfil LinkedIn para recrutadores",
    "checklist LinkedIn",
    "LinkedIn para tech",
    "ferramenta de LinkedIn grátis",
  ],
  alternates: { canonical: "/ferramentas/linkedin" },
  openGraph: {
    title: "Melhorar Perfil do LinkedIn com IA Grátis | MentoriasTech",
    description:
      "Otimize seu LinkedIn com IA, de graça: headline, sobre, experiências, conexões e checklist com nota. Sem cadastro.",
    url: `${SITE_URL}/ferramentas/linkedin`,
    type: "website",
  },
}

export default function FerramentaLinkedInPage() {
  return (
    <>
      <ToolViewTracker tool="linkedin" />
      <LinkedInImprover variant="public" />
    </>
  )
}
