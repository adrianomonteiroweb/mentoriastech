"use client"

import { useState } from "react"
import { MentoriasHeader } from "./mentorias-header"
import { BottomNav } from "./bottom-nav"
import { ProfileAssets } from "@/components/minhas-mentorias/profile-assets"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface MentoriasShellProps {
  email: string
  title?: string
  children: React.ReactNode
}

export function MentoriasShell({ email, title, children }: MentoriasShellProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/minhas-mentorias/logout", { method: "POST" })
    router.push("/minhas-mentorias")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>

      <MentoriasHeader email={email} title={title} />

      <main id="conteudo-principal" className="pb-20 md:pb-0">
        {children}
      </main>

      <BottomNav onProfileClick={() => setProfileOpen(true)} />

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-4">
            <ProfileAssets />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 min-h-[48px] text-base font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
