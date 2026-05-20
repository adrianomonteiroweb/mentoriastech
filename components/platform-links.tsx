import Link from "next/link"
import { BookOpen, Briefcase } from "lucide-react"

const links = [
  {
    label: "Conteúdos",
    description: "Artigos, vídeos e PDFs",
    href: "/content",
    icon: BookOpen,
  },
  {
    label: "Quadro de Vagas",
    description: "Oportunidades em tech",
    href: "/jobs",
    icon: Briefcase,
  },
]

export function PlatformLinks() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm font-medium text-card-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
        >
          <link.icon className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <span>{link.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{link.description}</span>
          </div>
          <svg
            className="ml-auto h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
