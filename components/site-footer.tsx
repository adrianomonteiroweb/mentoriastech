import Link from "next/link";
import { Lock } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { ShareButton } from "@/components/share-button";
import { SocialLinks } from "@/components/social-links";

export function SiteFooter() {
  return (
    <footer className="mt-6 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6 lg:pb-8">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-6 text-center">
          <SiteLogo size="md" />
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Gostou? Compartilhe com quem também está buscando uma oportunidade em
            tecnologia.
          </p>
          <ShareButton
            path="/"
            title="MentoriasTech"
            text="Plataforma de mentorias em tecnologia. Conecte-se. Cresça. Transforme."
            label="Compartilhe com alguém"
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/10 px-5 text-primary hover:bg-primary/15"
            tracking={{ type: "page", path: "/", label: "Rodapé" }}
          />
          <SocialLinks />
        </div>

        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Links do site">
          <Link href="/sobre" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Sobre
          </Link>
          <Link href="/politica-de-privacidade" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link href="/termos-de-uso" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Termos de Uso
          </Link>
        </nav>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            MentoriasTech · {new Date().getFullYear()}
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <Lock className="h-3.5 w-3.5" />
            Área de admin
          </a>
        </div>
      </div>
    </footer>
  );
}
