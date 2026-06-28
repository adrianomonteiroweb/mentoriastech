"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Wrench, User } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    href: "/minhas-mentorias/historico",
    label: "Início",
    icon: Home,
    matchPrefix: "/minhas-mentorias/historico",
    extraPaths: [] as string[],
  },
  {
    href: "/minhas-mentorias/ferramentas",
    label: "Ferramentas",
    icon: Wrench,
    matchPrefix: "/minhas-mentorias/ferramentas",
    extraPaths: [
      "/minhas-mentorias/trilha",
      "/minhas-mentorias/curriculo",
      "/minhas-mentorias/linkedin",
      "/minhas-mentorias/oportunidades",
      "/minhas-mentorias/plano-de-estudos",
    ],
  },
]

interface BottomNavProps {
  onProfileClick: () => void
}

export function BottomNav({ onProfileClick }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive =
          pathname.startsWith(item.matchPrefix) ||
          item.extraPaths.some((p) => pathname.startsWith(p))
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] min-w-[48px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className={cn("text-xs", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onProfileClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] min-w-[48px] transition-colors",
            "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Abrir perfil e configurações"
        >
          <User className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs">Perfil</span>
        </button>
      </div>
    </nav>
  )
}
