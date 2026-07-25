import Link from "next/link"
import { SiteLogo } from "@/components/site-logo"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <SiteLogo size="md" />

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <p className="text-lg text-muted-foreground">
            Página não encontrada
          </p>
          <p className="text-sm text-muted-foreground">
            A página que você procura não existe ou foi movida.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-3" aria-label="Links úteis">
          <Link
            href="/"
            className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Início
          </Link>
          <Link
            href="/jobs"
            className="rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Vagas
          </Link>
          <Link
            href="/content"
            className="rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Conteúdos
          </Link>
          <Link
            href="/ferramentas"
            className="rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Ferramentas
          </Link>
        </nav>
      </div>
    </main>
  )
}
