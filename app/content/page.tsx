"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  FileText,
  Youtube,
  BookOpen,
  Loader2,
  ArrowLeft,
  Tag,
  ExternalLink,
  Lightbulb,
  Plus,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { AdBanner } from "@/components/ad-banner";
import { ContentSuggestionForm } from "@/components/content/content-suggestion-form";
import { RandomTipCard } from "@/components/random-tip";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPreferences } from "@/hooks/use-user-preferences";

interface ContentCategory {
  id: string;
  name: string;
  slug: string;
}

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: "pdf" | "article" | "video" | "link";
  url: string | null;
  view_count: number;
  created_at: string;
  content_categories: { name: string; slug: string } | null;
}

const TYPE_CONFIG = {
  pdf: { icon: FileText, label: "PDF", color: "text-red-400" },
  video: { icon: Youtube, label: "Vídeo", color: "text-red-500" },
  article: { icon: BookOpen, label: "Artigo", color: "text-blue-400" },
  link: { icon: ExternalLink, label: "Link", color: "text-primary" },
};

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { hydrated, preferences, updatePreference } = useUserPreferences();

  useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((json) => {
        if (json.error || !json.data) {
          setItems([]);
          setCategories([]);
        } else {
          setItems(json.data || []);
          setCategories(json.categories || []);
        }
      })
      .catch(() => {
        setItems([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory
    ? items.filter((item) => item.content_categories?.slug === activeCategory)
    : items;

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Carregando conteúdos</span>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 md:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-10 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Biblioteca de Conteúdos
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                PDFs, artigos, links e vídeos sobre programação e carreira em tech.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setSuggestOpen(true)}
              className="min-h-10 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Sugerir conteúdo
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="#conteudos"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Ir direto para a lista de conteúdos"
          >
            Ir para os conteúdos
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </a>
          <AdBanner />
        </div>

        {hydrated && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                updatePreference("showTips", !preferences.showTips)
              }
              className="min-h-10"
            >
              <Lightbulb className="h-4 w-4" />
              {preferences.showTips
                ? "Ocultar dicas extras"
                : "Mostrar dicas extras"}
            </Button>
          </div>
        )}

        <RandomTipCard placement="content" />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              aria-pressed={activeCategory === null}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Tag className="h-4 w-4" />
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                aria-pressed={activeCategory === cat.slug}
                className={`min-h-10 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div id="conteudos" className="scroll-mt-6 flex flex-col gap-3">
          {filtered.map((item) => {
            const config = TYPE_CONFIG[item.content_type];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/content/${item.id}`}
                    className="flex min-w-0 flex-1 items-start gap-3"
                  >
                    <div className="mt-0.5">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-start gap-2">
                        <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-foreground">
                          {item.title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {config.label}
                        </span>
                      </div>
                      {item.description && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.content_categories && (
                          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {item.content_categories.name}
                          </span>
                        )}
                        {item.view_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {item.view_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <ShareButton
                    path={`/content/${item.id}`}
                    title={item.title}
                    text={
                      item.description ||
                      "Veja este conteúdo da biblioteca do Adriano Monteiro."
                    }
                    label="Compartilhe com alguém"
                    labelVisibility="desktop"
                    variant="ghost"
                    size="sm"
                    tracking={{ type: "content", id: item.id }}
                    className="min-h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                  />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-base text-muted-foreground">
              Nenhum conteúdo disponível
              {activeCategory ? " nesta categoria" : ""}.
            </p>
          )}
        </div>
      </div>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar ou indicar conteúdo</DialogTitle>
            <DialogDescription>
              Peça um conteúdo que gostaria de ver ou indique um material útil
              que encontrou. O Adriano revisa as sugestões.
            </DialogDescription>
          </DialogHeader>
          <ContentSuggestionForm onSuccess={() => {}} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
