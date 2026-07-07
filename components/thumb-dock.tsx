"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Route, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { trackPageEvent } from "@/lib/track-page";

/**
 * Dock de ações fixo na base (mobile/tablet), na zona de alcance do polegar.
 * Traz as 4 ações principais em 1 toque, sem rolar: Vagas, Ferramentas e
 * Trilhas como navegação, e "Solicitar" como CTA primário destacado à direita
 * (posição mais confortável para o polegar direito — Fitts + thumb zone).
 * Some quando a seção de agendamento (#booking) está em vista, para não cobrir
 * o formulário. Oculto em telas grandes (lg:hidden), onde não há polegar.
 */
const NAV = [
  { label: "Vagas", href: "/jobs", icon: Briefcase },
  { label: "Ferramentas", href: "/ferramentas", icon: Wrench },
  { label: "Trilhas", href: "/trilhas", icon: Route },
];

export function ThumbDock() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("booking");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -55% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 transition-all duration-300 lg:hidden",
        hidden
          ? "pointer-events-none translate-y-full opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <div className="mx-auto max-w-lg px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2">
        <nav
          aria-label="Ações rápidas"
          className="flex items-stretch gap-1.5 rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg shadow-black/20 backdrop-blur-md"
        >
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => trackPageEvent("click", "dock_nav")}
              className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          ))}
          <a
            href="#booking"
            onClick={() => trackPageEvent("click", "dock_cta")}
            className="flex min-h-12 flex-[2.2] items-center justify-center gap-1.5 rounded-xl bg-primary px-2.5 text-center text-sm font-semibold leading-tight text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Solicitar Mentoria
            <ArrowRight className="h-4 w-4 shrink-0" />
          </a>
        </nav>
      </div>
    </div>
  );
}
