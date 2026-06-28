import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  // BookOpenCheck,
  // Briefcase,
  Linkedin,
  Sparkles,
} from "lucide-react";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ferramentas de IA grátis para currículo e carreira em tech",
  description:
    "Ferramentas gratuitas de IA para turbinar seu currículo, LinkedIn e carreira em tecnologia. Comece agora, sem cadastro.",
  keywords: [
    "ferramentas de IA grátis",
    "ferramenta de currículo com IA",
    "melhorar currículo grátis",
    "IA para carreira em tech",
    "otimizar currículo gratuito",
  ],
  alternates: { canonical: "/ferramentas" },
  openGraph: {
    title: "Ferramentas de IA grátis para currículo e carreira | MentoriasTech",
    description:
      "Turbine seu currículo e sua carreira em tech com ferramentas de IA gratuitas.",
    url: `${SITE_URL}/ferramentas`,
    type: "website",
  },
};

const TOOLS = [
  {
    href: "/ferramentas/curriculo",
    icon: Sparkles,
    title: "Melhorar Currículo com IA",
    description:
      "Otimize seu currículo para a vaga: compatibilidade (ATS), palavras-chave, sugestões e PDF.",
    badge: "Grátis · sem cadastro",
    available: true,
  },
  {
    href: "/minhas-mentorias/linkedin",
    icon: Linkedin,
    title: "Melhorar LinkedIn",
    description:
      "Fortaleça seu perfil profissional e atraia mais recrutadores.",
    badge: "Grátis · sem cadastro",
    available: false,
  },
  // {
  //   href: "/minhas-mentorias/plano-de-estudos",
  //   icon: BookOpenCheck,
  //   title: "Plano de Estudos",
  //   description: "Trilha de aprendizado personalizada para acelerar sua evolução.",
  //   badge: "Na área do mentorado",
  //   available: false,
  // },
  // {
  //   href: "/jobs",
  //   icon: Briefcase,
  //   title: "Curadoria de Vagas",
  //   description: "Oportunidades em tecnologia para o seu próximo passo.",
  //   badge: "Grátis",
  //   available: true,
  // },
] as const;

export default function FerramentasPage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 md:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-10 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            Ferramentas de IA grátis
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Turbine seu currículo e sua carreira em tecnologia com ferramentas
            de inteligência artificial. Comece agora, sem cadastro.
          </p>
        </div>

        <section className="flex flex-col gap-3" aria-label="Ferramentas">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <tool.icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {tool.title}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tool.badge}
                  </span>
                </span>
                <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                  {tool.description}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
