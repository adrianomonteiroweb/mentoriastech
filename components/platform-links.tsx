import Link from "next/link"
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  FileText,
} from "lucide-react"

const links = [
  {
    label: "Conteúdos",
    description: "Guias, artigos e materiais para estudar com foco",
    href: "/content",
    icon: BookOpenCheck,
  },
  {
    label: "Vagas",
    description: "Oportunidades em tecnologia para seu próximo passo",
    href: "/jobs",
    icon: BriefcaseBusiness,
  },
  {
    label: "Minhas Mentorias",
    description: "Veja e baixe as anotações das suas mentorias",
    href: "/minhas-mentorias",
    icon: FileText,
  },
]

export function PlatformLinks() {
  return (
    <section className="grid w-full gap-3" aria-label="Atalhos da plataforma">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="group flex min-h-20 items-center gap-3 rounded-lg border border-border bg-card px-4 py-4 text-sm font-medium text-card-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <link.icon className="h-5 w-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span>{link.label}</span>
            <span className="text-xs font-normal leading-relaxed text-muted-foreground">
              {link.description}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ))}
    </section>
  )
}
