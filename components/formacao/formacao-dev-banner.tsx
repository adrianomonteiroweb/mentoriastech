import Link from "next/link";
import { ArrowUpRight, FlaskConical, Orbit } from "lucide-react";

/**
 * Banner discreto exibido na tela pública apenas em desenvolvimento
 * (NEXT_PUBLIC_FORMACAO_PREVIEW=true). Ponto de entrada para a Órbita
 * enquanto a formação está sendo construída.
 */
export function FormacaoDevBanner() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 sm:px-6">
      <Link
        href="/formacao"
        className="group flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Orbit className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            Órbita — Formação em Squad
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-500">
              <FlaskConical className="h-3 w-3" />
              em dev
            </span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Prévia interna da nova plataforma de formação
          </span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}
