import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, Briefcase, GraduationCap, Sparkles, Users } from "lucide-react"
import { SocialLinks } from "@/components/social-links"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Sobre a MentoriasTech",
  description:
    "Conheça a MentoriasTech: plataforma gratuita de mentorias em tecnologia, ferramentas de IA para carreira e curadoria de vagas.",
  alternates: { canonical: "/sobre" },
  openGraph: {
    title: "Sobre a MentoriasTech",
    description:
      "Plataforma gratuita de mentorias em tecnologia, ferramentas de IA e curadoria de vagas.",
    url: `${SITE_URL}/sobre`,
    type: "website",
  },
}

const FEATURES = [
  {
    icon: Users,
    title: "Mentorias Individuais",
    description:
      "Sessões 1:1 gratuitas e pagas sobre carreira em tech, desenvolvimento web, automações RPA e preparação para entrevistas.",
  },
  {
    icon: Sparkles,
    title: "Ferramentas de IA",
    description:
      "Melhore seu currículo e perfil do LinkedIn com inteligência artificial, gratuitamente e sem cadastro.",
  },
  {
    icon: Briefcase,
    title: "Curadoria de Vagas",
    description:
      "Vagas nacionais e internacionais em tecnologia, curadas e compartilhadas pela comunidade de mentorados.",
  },
  {
    icon: BookOpen,
    title: "Biblioteca de Conteúdos",
    description:
      "Artigos, PDFs, vídeos e links sobre programação e carreira em tech, organizados por categoria.",
  },
  {
    icon: GraduationCap,
    title: "Trilhas de Recolocação",
    description:
      "Etapas estruturadas para quem busca transição de carreira ou recolocação no mercado de tecnologia.",
  },
]

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
        Sobre a MentoriasTech
      </h1>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Nossa Missão
          </h2>
          <p>
            A MentoriasTech nasceu com o propósito de democratizar o acesso a
            mentorias de qualidade em tecnologia. Acreditamos que orientação
            profissional não deve ser privilégio de poucos — por isso, oferecemos
            mentorias gratuitas, ferramentas de IA acessíveis e uma comunidade
            ativa de profissionais em transição de carreira.
          </p>
          <p className="mt-3">
            Nosso objetivo é ajudar desenvolvedores iniciantes, pessoas em
            transição de carreira e profissionais de tecnologia a conquistarem
            suas melhores oportunidades no mercado.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            O que Oferecemos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <feature.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Quem Somos
          </h2>
          <p>
            A MentoriasTech é uma iniciativa criada por{" "}
            <strong className="text-foreground">Adriano Monteiro</strong>,
            engenheiro de software e mentor de carreira em tecnologia. Com
            experiência em desenvolvimento web e automações RPA, Adriano
            compartilha conhecimento para ajudar outros profissionais a
            crescerem na área de tecnologia.
          </p>
          <div className="mt-4">
            <SocialLinks />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Contato
          </h2>
          <p>
            Tem dúvidas, sugestões ou quer saber mais? Entre em contato conosco:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">E-mail:</strong>{" "}
              contato@mentoriastech.com.br
            </li>
            <li>
              <strong className="text-foreground">LinkedIn:</strong>{" "}
              <a
                href="https://www.linkedin.com/company/mentoriastech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                /company/mentoriastech
              </a>
            </li>
            <li>
              <strong className="text-foreground">Instagram:</strong>{" "}
              <a
                href="https://www.instagram.com/mentoriastech/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                @mentoriastech
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/"
          className="text-sm text-primary hover:underline underline-offset-2"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </main>
  )
}
