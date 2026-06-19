"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, Unlink } from "lucide-react"

interface CalendarStatus {
  connected: boolean
  email: string | null
  connected_at: string | null
  redirect_uri: string | null
}

export function GoogleCalendarSettings() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar/status")
      const data = await res.json()
      if (res.ok) {
        setStatus({
          connected: !!data.connected,
          email: data.email ?? null,
          connected_at: data.connected_at ?? null,
          redirect_uri: data.redirect_uri ?? null,
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Lê o resultado do callback OAuth (?calendar=...) e limpa o parâmetro da URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("calendar")
    if (!result) return

    if (result === "connected") {
      setMessage("Google Calendar conectado com sucesso.")
      setIsError(false)
      loadStatus()
    } else if (result === "norefresh") {
      setMessage(
        "Conexão incompleta: revogue o acesso em myaccount.google.com e tente reconectar.",
      )
      setIsError(true)
    } else if (result === "error") {
      setMessage(
        "Não foi possível conectar o Google Calendar. Confira se a URI de redirecionamento abaixo está cadastrada no Google Cloud Console.",
      )
      setIsError(true)
    }

    const url = new URL(window.location.href)
    url.searchParams.delete("calendar")
    window.history.replaceState({}, "", url.pathname + url.search)
  }, [loadStatus])

  async function connect() {
    setConnecting(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/calendar/auth")
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      throw new Error(data.error || "Erro ao iniciar conexão")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao conectar")
      setIsError(true)
      setConnecting(false)
    }
  }

  async function disconnect() {
    setDisconnecting(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/calendar/auth", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao desconectar")
      }
      setStatus((prev) => ({
        connected: false,
        email: null,
        connected_at: null,
        redirect_uri: prev?.redirect_uri ?? null,
      }))
      setMessage("Google Calendar desconectado.")
      setIsError(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao desconectar")
      setIsError(true)
    } finally {
      setDisconnecting(false)
    }
  }

  async function copyRedirectUri() {
    if (!status?.redirect_uri) return
    try {
      await navigator.clipboard.writeText(status.redirect_uri)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const connected = status?.connected

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Google Calendar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : connected ? (
          <p className="flex items-center gap-2 text-sm text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            Conectado{status?.email ? ` como ${status.email}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Conecte sua conta Google para criar eventos automaticamente ao agendar mentorias.
          </p>
        )}

        {message && (
          <p className={`text-sm ${isError ? "text-destructive" : "text-green-500"}`}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={connect} disabled={connecting || loading}>
            {connecting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-1" />
            )}
            {connected ? "Reconectar" : "Conectar Google Calendar"}
          </Button>
          {connected && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={disconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4 mr-1" />
              )}
              Desconectar
            </Button>
          )}
        </div>

        {status?.redirect_uri && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <p className="mb-2 text-muted-foreground">
              No <span className="font-medium text-foreground">Google Cloud Console</span> → APIs e
              serviços → Credenciais → seu Client OAuth, adicione esta URI em{" "}
              <span className="font-medium text-foreground">URIs de redirecionamento autorizados</span>:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-background px-2 py-1 font-mono">
                {status.redirect_uri}
              </code>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={copyRedirectUri}
                aria-label="Copiar URI de redirecionamento"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
