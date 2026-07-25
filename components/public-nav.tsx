import Link from "next/link"
import { SiteLogo } from "@/components/site-logo"

const NAV_LINKS = [
  { href: "/jobs", label: "Vagas" },
  { href: "/content", label: "Conteúdos" },
  { href: "/ferramentas", label: "Ferramentas" },
  { href: "/trilhas", label: "Trilhas" },
]

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MentoriasTech — início" className="shrink-0">
          <SiteLogo size="sm" />
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
