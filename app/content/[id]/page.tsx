"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  Eye,
  FileText,
  Youtube,
  BookOpen,
  Loader2,
  ArrowLeft,
  Download,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

interface ContentLink {
  url: string
  label: string
}

interface ContentItem {
  id: string
  title: string
  description: string | null
  content_type: "pdf" | "article" | "video" | "link"
  url: string | null
  links: ContentLink[] | null
  article_body: string | null
  file_size_bytes: number | null
  created_at: string
  content_categories: { name: string; slug: string } | null
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/,
  )
  return match ? match[1] : null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ContentDetailPage() {
  const params = useParams()
  const [item, setItem] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [viewCount, setViewCount] = useState<number | null>(null)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/content/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
        } else {
          setItem(json.data)
          setViewCount(json.data.view_count ?? 0)
          fetch(`/api/content/${params.id}/view`, { method: "POST" })
            .then((r) => r.json())
            .then((v) => { if (v.view_count != null) setViewCount(v.view_count) })
            .catch(() => {})
        }
      })
      .catch(() => setError("Erro ao carregar conteudo"))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  if (error || !item) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-sm text-destructive">
          {error || "Conteudo nao encontrado"}
        </p>
        <Link
          href="/content"
          className="mt-4 text-xs text-primary hover:underline"
        >
          Voltar para a biblioteca
        </Link>
      </main>
    )
  }

  const videoId =
    item.content_type === "video" && item.url
      ? extractYouTubeId(item.url)
      : null

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/content"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar para a biblioteca
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            {item.content_type === "pdf" && (
              <FileText className="h-5 w-5 text-red-400" />
            )}
            {item.content_type === "video" && (
              <Youtube className="h-5 w-5 text-red-500" />
            )}
            {item.content_type === "article" && (
              <BookOpen className="h-5 w-5 text-blue-400" />
            )}
            {item.content_type === "link" && (
              <ExternalLink className="h-5 w-5 text-primary" />
            )}
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.content_type === "pdf"
                ? "PDF"
                : item.content_type === "video"
                  ? "Video"
                  : item.content_type === "article"
                    ? "Artigo"
                    : "Link"}
            </span>
            {item.content_categories && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {item.content_categories.name}
              </span>
            )}
          </div>

          <h1 className="text-lg font-semibold text-foreground mb-2">
            {item.title}
          </h1>

          {item.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {item.description}
            </p>
          )}

          {/* PDF: download button */}
          {item.content_type === "pdf" && item.url && (
            <div className="flex flex-col gap-3">
              {item.file_size_bytes && (
                <p className="text-xs text-muted-foreground">
                  Tamanho: {formatFileSize(item.file_size_bytes)}
                </p>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-fit"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            </div>
          )}

          {/* Video: YouTube embed */}
          {item.content_type === "video" && videoId && (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}

          {/* Video without embed: external link */}
          {item.content_type === "video" && !videoId && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-fit"
            >
              <ExternalLink className="h-4 w-4" />
              Assistir video
            </a>
          )}

          {/* Link: multiple external resources */}
          {item.content_type === "link" && item.links && item.links.length > 0 && (
            <div className="flex flex-col gap-2">
              {item.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:border-primary/30 w-full"
                >
                  <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          )}

          {/* Link: fallback single url (legacy) */}
          {item.content_type === "link" && (!item.links || item.links.length === 0) && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-fit"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir link
            </a>
          )}

          {/* Article external link */}
          {item.content_type === "article" && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-fit"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir artigo
            </a>
          )}

          {/* Article: render body */}
          {item.content_type === "article" && item.article_body && (
            <div className="prose prose-invert prose-sm max-w-none mt-4">
              {item.article_body.split("\n").map((paragraph, i) => (
                <p key={i} className="text-sm text-foreground/90 mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        <p className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground text-center">
          {viewCount != null && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewCount} {viewCount === 1 ? "visualização" : "visualizações"}
            </span>
          )}
          <span>·</span>
          <span>
            Publicado em{" "}
            {new Date(item.created_at).toLocaleDateString("pt-BR")}
          </span>
        </p>
      </div>
    </main>
  )
}
