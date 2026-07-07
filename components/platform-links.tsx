"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  NotebookPen,
  Route,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackPageEvent } from "@/lib/track-page";

type PlatformLink = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  featured?: boolean;
};

const links: PlatformLink[] = [
  {
    label: "Vagas",
    description: "Oportunidades em tecnologia para seu próximo passo",
    href: "/jobs",
    icon: Briefcase,
    featured: true,
  },
  {
    label: "Conteúdos",
    description: "Guias, artigos e materiais para estudar com foco",
    href: "/content",
    icon: BookOpen,
  },
  {
    label: "Ferramentas",
    description: "Ferramentas de IA grátis para currículo e carreira",
    href: "/ferramentas",
    icon: Wrench,
    badge: "Grátis",
  },
  {
    label: "Trilhas",
    description: "Percurso guiado do posicionamento à contratação",
    href: "/trilhas",
    icon: Route,
  },
  {
    label: "Minhas Mentorias",
    description: "Veja e baixe as anotações das suas mentorias",
    href: "/minhas-mentorias",
    icon: NotebookPen,
  },
];

export function PlatformLinks() {
  return (
    <section
      aria-label="Atalhos da plataforma"
      className="mx-auto w-full max-w-3xl px-4 py-2 sm:px-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={() => trackPageEvent("click", "platform_link")}
            className={cn(
              "group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md",
              link.featured && "sm:col-span-2",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.12] text-primary">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="flex items-center gap-2">
                {link.badge ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {link.badge}
                  </span>
                ) : null}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">
                {link.label}
              </h3>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
