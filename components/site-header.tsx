import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { ShareButton } from "@/components/share-button";

/**
 * Header fixo da landing pública. Logo à esquerda e compartilhar à direita.
 * O botão de tema é o flutuante global (app/layout.tsx); por isso o grupo de
 * ações reserva espaço à direita (pr-12) para não se sobrepor a ele.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="MentoriasTech — início" className="shrink-0">
          <SiteLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2 pr-12">
          <ShareButton
            path="/"
            title="MentoriasTech"
            text="Plataforma de mentorias em tecnologia. Conecte-se. Cresça. Transforme."
            labelVisibility="sr-only"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            tracking={{ type: "page", path: "/", label: "Header" }}
          />
        </div>
      </div>
    </header>
  );
}
