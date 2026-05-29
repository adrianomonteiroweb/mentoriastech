"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface JobShareFormProps {
  onSuccess?: () => void
}

export function JobShareForm({ onSuccess }: JobShareFormProps) {
  const [title, setTitle] = useState("")
  const [applicationUrl, setApplicationUrl] = useState("")
  const [company, setCompany] = useState("")
  const [recommendationNote, setRecommendationNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/jobs/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          application_url: applicationUrl,
          recommendation_note: recommendationNote,
          company: company || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao enviar indicacao")
      }

      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-sm font-medium">Indicacao enviada!</p>
        <p className="text-sm text-muted-foreground">
          Ela aparecera no quadro de vagas apos a aprovacao do Adriano.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-title">Titulo da vaga</Label>
        <Input
          id="share-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          placeholder="Ex: Desenvolvedor Front-end Junior"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-url">Link da vaga</Label>
        <Input
          id="share-url"
          type="url"
          value={applicationUrl}
          onChange={(e) => setApplicationUrl(e.target.value)}
          required
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          Link do LinkedIn, site da empresa ou portal de vagas.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-company">Empresa (opcional)</Label>
        <Input
          id="share-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Ex: Acme Tech"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-note">Por que achou interessante?</Label>
        <Textarea
          id="share-note"
          value={recommendationNote}
          onChange={(e) => setRecommendationNote(e.target.value)}
          required
          minLength={10}
          rows={4}
          placeholder="Conte por que essa vaga e uma boa oportunidade para a comunidade."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-1 h-4 w-4" />
        )}
        {loading ? "Enviando..." : "Enviar indicacao"}
      </Button>
    </form>
  )
}
