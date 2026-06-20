"use client"

import Link from "next/link"
import { Home, LogOut, Wrench } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const DESKTOP_NAV = [
  {
    href: "/minhas-mentorias/historico",
    label: "Início",
    icon: Home,
    matchPrefixes: ["/minhas-mentorias/historico"],
  },
  {
    href: "/minhas-mentorias/ferramentas",
    label: "Ferramentas",
    icon: Wrench,
    matchPrefixes: [
      "/minhas-mentorias/ferramentas",
      "/minhas-mentorias/curriculo",
      "/minhas-mentorias/linkedin",
      "/minhas-mentorias/oportunidades",
      "/minhas-mentorias/plano-de-estudos",
    ],
  },
]

interface MentoriasHeaderProps {
  email: string
  title?: string
}

export function MentoriasHeader({ email, title = "Minhas Mentorias" }: MentoriasHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await fetch("/api/minhas-mentorias/logout", { method: "POST" })
    router.push("/minhas-mentorias")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground leading-none">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 min-h-[44px] text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Sair da conta"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex gap-1 -mx-1"
        >
          {DESKTOP_NAV.map((item) => {
            const isActive = item.matchPrefixes.some((p) => pathname.startsWith(p))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
