import type { Metadata } from "next"
import { StudyPlanGenerator } from "@/components/tools/study-plan/study-plan-generator"
import { ToolViewTracker } from "@/components/tool-view-tracker"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Plano de Estudos por Vaga com IA — planilha .xlsx grátis",
  description:
    "Cole a descrição de uma vaga e baixe uma planilha .xlsx com um plano de estudos completo: semana a semana, requisitos, projeto final e rotina. Grátis, sem cadastro.",
  keywords: [
    "plano de estudos com IA",
    "plano de estudos para vaga",
    "roadmap de estudos programação",
    "trilha de estudos tech",
    "plano de estudos grátis",
    "planilha de plano de estudos",
    "estudar para vaga de programador",
  ],
  alternates: { canonical: "/ferramentas/plano-de-estudos" },
  openGraph: {
    title: "Plano de Estudos por Vaga com IA | MentoriasTech",
    description:
      "Cole a vaga, receba a planilha. Plano semanal, requisitos, projeto final e rotina — pronto para baixar em .xlsx. Sem cadastro.",
    url: `${SITE_URL}/ferramentas/plano-de-estudos`,
    type: "website",
  },
}

export default function FerramentaPlanoDeEstudosPage() {
  return (
    <>
      <ToolViewTracker tool="study-plan" />
      <StudyPlanGenerator />
    </>
  )
}
