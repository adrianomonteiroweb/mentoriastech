"use client"

import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { ToolsGrid } from "@/components/minhas-mentorias/tools-grid"
import { ProfileAssets } from "@/components/minhas-mentorias/profile-assets"
import { Separator } from "@/components/ui/separator"

interface Props {
  email: string
}

export function FerramentasClient({ email }: Props) {
  return (
    <MentoriasShell email={email} title="Ferramentas">
      <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
        <ToolsGrid />

        <Separator />

        <section aria-label="Dados opcionais do perfil">
          <h2 className="text-base font-semibold text-muted-foreground mb-3">
            Dados Opcionais
          </h2>
          <ProfileAssets />
        </section>
      </div>
    </MentoriasShell>
  )
}
