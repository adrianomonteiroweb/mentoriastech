"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BellRing, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { TagInput } from "@/components/minhas-mentorias/shared/tag-input"
import { TagSelect } from "@/components/minhas-mentorias/shared/tag-select"
import { PillMultiSelect } from "@/components/minhas-mentorias/shared/pill-multi-select"
import { LEVEL_OPTIONS, SUGGESTED_POSITIONS, SUGGESTED_STACK } from "@/lib/db/job-alerts"

interface Props {
  email: string
}

export function JobAlertsPanel({ email }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const [enabled, setEnabled] = useState(true)
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [positions, setPositions] = useState<string[]>([])
  const [stack, setStack] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [ignoreWords, setIgnoreWords] = useState<string[]>([])
  const [isInternational, setIsInternational] = useState(true)
  const [dailyLimit, setDailyLimit] = useState(10)

  useEffect(() => {
    fetch("/api/minhas-mentorias/job-alerts")
      .then((r) => r.json())
      .then((json) => {
        const d = json.data
        if (!d) return
        setEnabled(d.enabled)
        setName(d.name || "")
        setWhatsapp(d.whatsapp || "")
        setPositions(d.positions || [])
        setStack(d.stack || [])
        setLevels(d.levels || [])
        setIgnoreWords(d.ignore_words || [])
        setIsInternational(d.is_international)
        setDailyLimit(d.daily_limit ?? 10)
      })
      .catch(() => setError("Erro ao carregar suas preferências."))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/minhas-mentorias/job-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          name,
          whatsapp,
          positions,
          stack,
          levels,
          ignore_words: ignoreWords,
          is_international: isInternational,
          daily_limit: dailyLimit,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar suas preferências.")
      // Reflete os valores normalizados pelo servidor (minúsculas, dígitos, dedupe).
      const d = json.data
      setPositions(d.positions)
      setStack(d.stack)
      setLevels(d.levels)
      setIgnoreWords(d.ignore_words)
      setWhatsapp(d.whatsapp)
      setName(d.name)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <Link
            href="/minhas-mentorias/ferramentas"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Ferramentas
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <BellRing className="h-6 w-6 text-primary" />
            Receber Vagas
          </h1>
          <p className="text-sm text-muted-foreground">
            Nosso robô encontra vagas no LinkedIn e envia no seu WhatsApp as que combinam com o seu perfil.
          </p>
          <p className="text-xs text-muted-foreground">Acesso via {email}</p>
        </header>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {/* Ativação + canal */}
            <Card>
              <CardContent className="flex flex-col gap-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Receber vagas no WhatsApp</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Desligue quando quiser pausar os envios. Suas preferências ficam salvas.
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Receber vagas no WhatsApp" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ja-name" className="text-sm font-medium text-foreground">
                    Nome
                  </label>
                  <input
                    id="ja-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="min-h-11 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ja-whatsapp" className="text-sm font-medium text-foreground">
                    WhatsApp
                  </label>
                  <PhoneNumberInput
                    id="ja-whatsapp"
                    value={whatsapp}
                    onChange={setWhatsapp}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filtros de match */}
            <Card>
              <CardContent className="flex flex-col gap-5 py-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">O que você quer receber</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marque as sugestões e/ou digite as suas. O robô compara essas palavras com o <strong className="text-foreground">título</strong> da vaga.
                  </p>
                </div>
                <TagSelect
                  label="Posições / cargos"
                  placeholder="Ex: desenvolvedor — Enter para adicionar"
                  suggestions={SUGGESTED_POSITIONS}
                  values={positions}
                  onChange={setPositions}
                />
                <TagSelect
                  label="Stack / tecnologias"
                  placeholder="Ex: react — Enter para adicionar"
                  suggestions={SUGGESTED_STACK}
                  values={stack}
                  onChange={setStack}
                />
                <PillMultiSelect
                  legend="Níveis (pode marcar mais de um)"
                  options={LEVEL_OPTIONS}
                  values={levels}
                  onChange={setLevels}
                />
              </CardContent>
            </Card>

            {/* Preferências */}
            <Card>
              <CardContent className="flex flex-col gap-5 py-5">
                <TagInput
                  label="Palavras a ignorar"
                  placeholder="Ex: java — Enter para adicionar"
                  values={ignoreWords}
                  onChange={setIgnoreWords}
                />
                <p className="-mt-3 text-xs text-muted-foreground">
                  Se alguma dessas palavras estiver no título, a vaga é descartada.
                </p>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ver vagas internacionais</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Inclui vagas fora do Brasil.</p>
                  </div>
                  <Switch
                    checked={isInternational}
                    onCheckedChange={setIsInternational}
                    aria-label="Ver vagas internacionais"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label htmlFor="ja-limit" className="text-sm font-medium text-foreground">
                      Limite de vagas por dia
                    </label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Entre 1 e 50.</p>
                  </div>
                  <input
                    id="ja-limit"
                    type="number"
                    min={1}
                    max={50}
                    value={dailyLimit}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      if (!Number.isNaN(n)) setDailyLimit(Math.min(50, Math.max(1, n)))
                    }}
                    className="min-h-11 w-20 rounded-lg border border-border bg-secondary px-3 py-2 text-center text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={saving} className="min-h-11">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {saving ? "Salvando…" : "Salvar preferências"}
              </Button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Salvo
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
