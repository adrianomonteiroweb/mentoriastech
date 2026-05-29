"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { parseResumeMarkdown, type ResumeBlock } from "@/lib/resume/markdown-blocks"

interface Props {
  email: string
  initialHasResume: boolean
}

function RenderedResume({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown)

  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block: ResumeBlock, i) => {
        switch (block.type) {
          case "h1":
            return (
              <h2 key={i} className="text-xl font-semibold text-foreground">
                {block.text}
              </h2>
            )
          case "h2":
            return (
              <h3
                key={i}
                className="mt-3 border-b border-primary/40 pb-1 text-xs font-semibold uppercase tracking-wider text-primary"
              >
                {block.text}
              </h3>
            )
          case "h3":
            return (
              <h4 key={i} className="mt-2 text-sm font-semibold text-foreground">
                {block.text}
              </h4>
            )
          case "bullet":
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm text-foreground">
                <span className="text-primary">•</span>
                <span className="flex-1">{block.text}</span>
              </div>
            )
          default:
            return (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {block.text}
              </p>
            )
        }
      })}
    </div>
  )
}

export function ResumeImprover({ email, initialHasResume }: Props) {
  const [hasResume, setHasResume] = useState(initialHasResume)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [jobDescription, setJobDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError("")
    setNotice("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/minhas-mentorias/resume", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Erro ao enviar currículo")
      }

      setHasResume(true)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setNotice("Currículo enviado com sucesso!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar currículo")
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError("")
    setNotice("")
    setResult(null)

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar currículo")
      }

      setResult(data.markdown as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar currículo")
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!result) return
    setDownloading(true)
    setError("")

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: result }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Erro ao gerar PDF")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "curriculo-otimizado.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PDF")
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar.")
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <Link
            href="/minhas-mentorias/historico"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Minhas Mentorias
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Melhorar currículo com IA
          </h1>
          <p className="text-xs text-muted-foreground">Acesso via {email}</p>
        </header>

        {/* Passo 1: currículo */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                1. Seu currículo (PDF)
              </span>
            </div>

            {hasResume ? (
              <a
                href="/api/minhas-mentorias/resume/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Ver currículo atual
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                Você ainda não enviou um currículo. Envie um PDF para começar.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  setError("")
                  setNotice("")
                  setFile(e.target.files?.[0] || null)
                }}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:text-foreground"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!file || uploading}
                onClick={handleUpload}
                className="shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">
                  {uploading ? "Enviando…" : hasResume ? "Substituir" : "Enviar"}
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Tamanho máximo: 5MB</p>
          </CardContent>
        </Card>

        {/* Passo 2: vaga */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                2. Descrição da vaga
              </span>
            </div>
            <Textarea
              value={jobDescription}
              onChange={(e) => {
                setError("")
                setJobDescription(e.target.value)
              }}
              rows={7}
              placeholder="Cole aqui a descrição completa da vaga (responsabilidades, requisitos, tecnologias…)."
            />
            <Button
              type="button"
              disabled={!hasResume || generating || jobDescription.trim().length < 20}
              onClick={handleGenerate}
              className="w-fit"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {generating ? "Gerando…" : "Gerar currículo otimizado"}
            </Button>
            {!hasResume && (
              <p className="text-xs text-muted-foreground">
                Envie um currículo no passo 1 para habilitar a geração.
              </p>
            )}
          </CardContent>
        </Card>

        {notice && (
          <p className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 className="h-4 w-4" /> {notice}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Resultado */}
        {result && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Currículo otimizado
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">{copied ? "Copiado" : "Copiar"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={downloading}
                    onClick={handleDownloadPdf}
                  >
                    {downloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">{downloading ? "Gerando…" : "Baixar PDF"}</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background/50 p-4">
                <RenderedResume markdown={result} />
              </div>

              <p className="text-xs text-muted-foreground">
                Revise com atenção: a IA pode cometer erros. Confira se todos os dados
                estão corretos antes de usar o currículo.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
