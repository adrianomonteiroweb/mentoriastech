"use client"

import { useEffect, useState } from "react"
import {
  Eye,
  FileText,
  Youtube,
  BookOpen,
  Loader2,
  ArrowLeft,
  Tag,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { AdBanner } from "@/components/ad-banner"
import { ShareButton } from "@/components/share-button"

interface ContentCategory {
  id: string
  name: string
  slug: string
}

interface ContentItem {
  id: string
  title: string
  description: string | null
  content_type: "pdf" | "article" | "video" | "link"
  url: string | null
  view_count: number
  created_at: string
  content_categories: { name: string; slug: string } | null
}

const TYPE_CONFIG = {
  pdf: { icon: FileText, label: "PDF", color: "text-red-400" },
  video: { icon: Youtube, label: "Vídeo", color: "text-red-500" },
  article: { icon: BookOpen, label: "Artigo", color: "text-blue-400" },
  link: { icon: ExternalLink, label: "Link", color: "text-primary" },
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/content")
      .then((res) => res.json())
      .then((json) => {
        if (json.error || !json.data) {
          setItems([])
          setCategories([])
        } else {
          setItems(json.data || [])
          setCategories(json.categories || [])
        }
      })
      .catch(() => {
        setItems([])
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeCategory
    ? items.filter(
        (item) => item.content_categories?.slug === activeCategory,
      )
    : items

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Biblioteca de Conteúdos
          </h1>
          <p className="text-sm text-muted-foreground">
            PDFs, artigos, links e vídeos sobre programação e carreira em tech.
          </p>
        </div>

        <AdBanner />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Tag className="h-3 w-3" />
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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

        <div className="flex flex-col gap-3">
          {filtered.map((item) => {
            const config = TYPE_CONFIG[item.content_type]
            const Icon = config.icon
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
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
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-semibold text-foreground truncate">
                          {item.title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {config.label}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {item.content_categories && (
                          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {item.content_categories.name}
                          </span>
                        )}
                        {item.view_count > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
                    label="Compartilhar"
                    variant="ghost"
                    size="sm"
                    tracking={{ type: "content", id: item.id }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  />
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum conteúdo disponível
              {activeCategory ? " nesta categoria" : ""}.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
