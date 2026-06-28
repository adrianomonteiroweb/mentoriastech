import Link from "next/link"
import { ArrowRight, Sparkles, Linkedin, Briefcase, BookOpenCheck, Route } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const TOOLS = [
  {
    href: "/minhas-mentorias/trilha",
    icon: Route,
    title: "Minha Trilha",
    description: "Acompanhe seu percurso de recolocação fase a fase e seus conteúdos",
    badge: "Novo",
  },
  {
    href: "/minhas-mentorias/curriculo",
    icon: Sparkles,
    title: "Melhorar Currículo",
    description: "Otimize seu currículo com inteligência artificial e destaque-se nas seleções",
    badge: "IA",
  },
  {
    href: "/minhas-mentorias/linkedin",
    icon: Linkedin,
    title: "Melhorar LinkedIn",
    description: "Fortaleça seu perfil profissional e atraia mais recrutadores",
    badge: "IA",
  },
  {
    href: "/minhas-mentorias/oportunidades",
    icon: Briefcase,
    title: "Painel de Oportunidades",
    description: "Gerencie suas candidaturas e acompanhe cada processo seletivo",
    badge: undefined,
  },
  {
    href: "/minhas-mentorias/plano-de-estudos",
    icon: BookOpenCheck,
    title: "Plano de Estudos",
    description: "Trilha de aprendizado personalizada para acelerar sua evolução",
    badge: "IA",
  },
] as const

export function ToolsGrid() {
  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Ferramentas disponíveis">
      {TOOLS.map((tool) => (
        <Link key={tool.href} href={tool.href} className="block group" role="listitem">
          <Card className="transition-colors group-hover:border-primary/40 group-active:scale-[0.98] transition-transform">
            <CardContent className="flex items-center gap-4 py-4 px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <tool.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base font-semibold text-foreground">
                    {tool.title}
                  </h3>
                  {tool.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
