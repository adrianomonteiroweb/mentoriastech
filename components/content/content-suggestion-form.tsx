"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Mode = "request" | "indication"

interface ContentSuggestionFormProps {
  onSuccess?: () => void
}

export function ContentSuggestionForm({ onSuccess }: ContentSuggestionFormProps) {
  const [mode, setMode] = useState<Mode>("request")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (mode === "request" && description.trim().length < 5) {
      setError("Descreva o que voce gostaria de ver (min. 5 caracteres).")
      return
    }
    if (mode === "indication" && !url.trim() && description.trim().length < 5) {
      setError("Informe um link e/ou uma descricao (min. 5 caracteres).")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/content/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          title: title.trim() || undefined,
          ...(mode === "indication" ? { url: url.trim() || undefined } : {}),
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao enviar")
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
        <p className="text-sm font-medium">
          {mode === "request" ? "Solicitacao enviada!" : "Indicacao enviada!"}
        </p>
        <p className="text-sm text-muted-foreground">
          Obrigado! A equipe vai revisar a sua sugestão.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(
          [
            { key: "request", label: "Solicitar" },
            { key: "indication", label: "Indicar" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setMode(opt.key)
              setError("")
            }}
            aria-pressed={mode === opt.key}
            className={cn(
              "min-h-9 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === opt.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {mode === "request"
          ? "Descreva um conteudo que voce gostaria de ver na biblioteca."
          : "Compartilhe um conteudo util que voce encontrou (link e/ou descricao)."}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-title">Titulo (opcional)</Label>
        <Input
          id="cs-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            mode === "request"
              ? "Ex: Guia de Git para iniciantes"
              : "Ex: Artigo sobre clean code"
          }
        />
      </div>

      {mode === "indication" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-url">Link</Label>
          <Input
            id="cs-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-desc">
          {mode === "request"
            ? "O que voce gostaria de ver?"
            : "Descricao / por que e util"}
        </Label>
        <Textarea
          id="cs-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required={mode === "request"}
          placeholder={
            mode === "request"
              ? "Conte o tema, o nivel e o que espera aprender."
              : "Resuma o conteudo e por que vale a pena."
          }
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-1 h-4 w-4" />
        )}
        {loading
          ? "Enviando..."
          : mode === "request"
            ? "Enviar solicitacao"
            : "Enviar indicacao"}
      </Button>
    </form>
  )
}
