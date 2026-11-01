"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react"

type TokenSource = "db" | "env" | "none"

const SOURCE_LABELS: Record<TokenSource, string> = {
  db: "Configurado no painel",
  env: "Env (legado)",
  none: "Não configurado",
}

// 32 bytes aleatórios em base64url: 43 caracteres, seguros para header HTTP e .env.
function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function JobsBotTokenSettings() {
  const [token, setToken] = useState("")
  const [savedToken, setSavedToken] = useState("")
  const [source, setSource] = useState<TokenSource>("none")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings/bot-token")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || {}
        setToken(data.token || "")
        setSavedToken(data.token || "")
        setSource(data.source || "none")
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleGenerate() {
    setToken(generateToken())
    setVisible(true)
    setIsError(false)
    setMessage("Novo token gerado. Salve para ativá-lo.")
  }

  async function handleCopy() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setIsError(true)
      setMessage("Não foi possível copiar o token.")
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch("/api/admin/settings/bot-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || "Erro ao salvar token")

      setToken(json.data.token)
      setSavedToken(json.data.token)
      setSource("db")
      setIsError(false)
      setMessage("Token salvo. Atualize o JOBS_SHARE_BOT_TOKEN dos bots com este valor.")
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "Erro ao salvar token")
    } finally {
      setSaving(false)
    }
  }

  const unsaved = token.trim() !== savedToken

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">Token do bot de vagas</CardTitle>
          {!loading && (
            <Badge variant={source === "db" ? "default" : "secondary"}>
              {SOURCE_LABELS[source]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Token Bearer usado pelos bots de vagas (search-jobs-linkedin, Glassdoor e
          verificação de status) para cadastrar e consultar vagas. Copie o valor e
          configure-o como <code className="text-xs">JOBS_SHARE_BOT_TOKEN</code> no
          Manager dos bots. Gere um novo ou cole um token existente; ao salvar, o
          token anterior deixa de funcionar imediatamente.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="jobs-bot-token">Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="jobs-bot-token"
                  type={visible ? "text" : "password"}
                  value={token}
                  onChange={(e) => {
                    setMessage("")
                    setToken(e.target.value)
                  }}
                  placeholder="Cole um token existente ou gere um novo"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Ocultar token" : "Mostrar token"}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={handleCopy}
                  disabled={!token}
                  aria-label="Copiar token"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {message && (
              <p className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}>
                {message}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleGenerate}>
                <KeyRound className="h-4 w-4 mr-1" />
                Gerar token
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !token.trim() || (!unsaved && source === "db")}
                className="sm:flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar token
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
