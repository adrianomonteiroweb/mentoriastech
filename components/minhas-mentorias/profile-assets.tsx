"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Linkedin,
  Loader2,
  Upload,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ResumeItem {
  id: string | null
  label: string
  file_size_bytes: number | null
  is_default: boolean
  created_at: string
  download_url: string
}

function formatBytes(value: number | null) {
  if (!value) return null
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function ProfileAssets() {
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [resumes, setResumes] = useState<ResumeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLinkedin, setSavingLinkedin] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeLabel, setResumeLabel] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const [linkedinRes, resumeRes] = await Promise.all([
        fetch("/api/minhas-mentorias/linkedin"),
        fetch("/api/minhas-mentorias/resume"),
      ])

      const linkedinData = await linkedinRes.json().catch(() => null)
      const resumeData = await resumeRes.json().catch(() => null)

      if (!linkedinRes.ok) {
        throw new Error(linkedinData?.error || "Erro ao carregar LinkedIn")
      }
      if (!resumeRes.ok) {
        throw new Error(resumeData?.error || "Erro ao carregar curriculos")
      }

      setLinkedinUrl(linkedinData?.linkedin_url || "")
      setResumes((resumeData?.resumes || []) as ResumeItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  async function handleSaveLinkedin(e: React.FormEvent) {
    e.preventDefault()
    setSavingLinkedin(true)
    setNotice("")
    setError("")

    try {
      const res = await fetch("/api/minhas-mentorias/linkedin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_url: linkedinUrl.trim() }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar LinkedIn")
      }

      setLinkedinUrl(data.linkedin_url || "")
      setNotice("LinkedIn salvo.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar LinkedIn")
    } finally {
      setSavingLinkedin(false)
    }
  }

  async function handleResumeUpload() {
    if (!resumeFile) return
    setUploadingResume(true)
    setNotice("")
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", resumeFile)
      if (resumeLabel.trim()) {
        formData.append("label", resumeLabel.trim())
      }

      const res = await fetch("/api/minhas-mentorias/resume", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao enviar curriculo")
      }

      setResumeFile(null)
      setResumeLabel("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      setNotice("Curriculo enviado.")
      await loadAssets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar curriculo")
    } finally {
      setUploadingResume(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Dados opcionais
            </h2>
            <p className="text-xs text-muted-foreground">
              LinkedIn e curriculos ajudam o mentor a chegar na conversa com mais contexto.
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <form onSubmit={handleSaveLinkedin} className="flex flex-col gap-2">
          <Label htmlFor="mentee-linkedin-url" className="flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5 text-primary" />
            Link do LinkedIn
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="mentee-linkedin-url"
              type="url"
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value)
                setNotice("")
                setError("")
              }}
              placeholder="https://www.linkedin.com/in/seu-perfil"
              disabled={loading || savingLinkedin}
            />
            <Button type="submit" disabled={loading || savingLinkedin} className="shrink-0">
              {savingLinkedin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="ml-1">{savingLinkedin ? "Salvando..." : "Salvar"}</span>
            </Button>
          </div>
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir LinkedIn
            </a>
          )}
        </form>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Curriculos</span>
          </div>

          {resumes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum curriculo enviado. O envio e opcional.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id || resume.download_url}
                  className="flex flex-col gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {resume.label}
                      </span>
                      {resume.is_default && (
                        <Badge variant="outline" className="text-[10px]">
                          Padrao
                        </Badge>
                      )}
                    </div>
                    {formatBytes(resume.file_size_bytes) && (
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(resume.file_size_bytes)}
                      </p>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <a href={resume.download_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                      <span className="ml-1">Baixar</span>
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2 rounded-md border border-dashed border-border p-3">
            <Label htmlFor="resume-label">Adicionar curriculo em PDF</Label>
            <Input
              id="resume-label"
              value={resumeLabel}
              onChange={(e) => setResumeLabel(e.target.value)}
              placeholder="Nome opcional, ex.: Curriculo Backend"
              disabled={uploadingResume}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  setResumeFile(e.target.files?.[0] || null)
                  setNotice("")
                  setError("")
                }}
                className="text-xs"
                disabled={uploadingResume}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!resumeFile || uploadingResume}
                onClick={handleResumeUpload}
                className="shrink-0"
              >
                {uploadingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-1">{uploadingResume ? "Enviando..." : "Enviar"}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Opcional. Tamanho maximo: 5MB.</p>
          </div>
        </div>

        {notice && <p className="text-sm text-green-500">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
