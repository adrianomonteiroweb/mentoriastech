"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface MentoriasHeaderProps {
  email: string
  title?: string
}

export function MentoriasHeader({ email, title = "Minhas Mentorias" }: MentoriasHeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/minhas-mentorias/logout", { method: "POST" })
    router.push("/minhas-mentorias")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
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
    </header>
  )
}
