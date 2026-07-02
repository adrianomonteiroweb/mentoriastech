import type { Metadata } from "next"
import { ResumeImprover } from "@/components/minhas-mentorias/resume-improver"
import { ToolViewTracker } from "@/components/tool-view-tracker"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Melhorar Currículo com IA Grátis",
  description:
    "Ferramenta gratuita de IA para otimizar seu currículo para a vaga: análise de compatibilidade (ATS), palavras-chave, sugestões e download em PDF. Sem cadastro.",
  keywords: [
    "melhorar currículo com IA",
    "otimizar currículo grátis",
    "ajustar currículo gratuito",
    "currículo para vaga",
    "currículo ATS",
    "gerador de currículo com inteligência artificial",
    "ferramenta de currículo grátis",
  ],
  alternates: { canonical: "/ferramentas/curriculo" },
  openGraph: {
    title: "Melhorar Currículo com IA Grátis | MentoriasTech",
    description:
      "Otimize seu currículo para a vaga com IA, de graça: compatibilidade, ATS, sugestões e PDF. Sem cadastro.",
    url: `${SITE_URL}/ferramentas/curriculo`,
    type: "website",
  },
}

export default function FerramentaCurriculoPage() {
  return (
    <>
      <ToolViewTracker tool="resume" />
      <ResumeImprover variant="public" />
    </>
  )
}
