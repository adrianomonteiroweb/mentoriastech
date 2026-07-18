"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { TagInput } from "@/components/minhas-mentorias/shared/tag-input"
import { TagSelect } from "@/components/minhas-mentorias/shared/tag-select"
import { PillMultiSelect } from "@/components/minhas-mentorias/shared/pill-multi-select"
import {
  LEVEL_OPTIONS,
  SUGGESTED_POSITIONS,
  SUGGESTED_STACK,
  type AdminJobAlert,
} from "@/lib/db/job-alerts"

interface Props {
  subscription: AdminJobAlert
  onSuccess: () => void
}

export function JobAlertForm({ subscription, onSuccess }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [enabled, setEnabled] = useState(subscription.enabled)
  const [name, setName] = useState(subscription.name)
  const [whatsapp, setWhatsapp] = useState(subscription.whatsapp)
  const [positions, setPositions] = useState<string[]>(subscription.positions)
  const [stack, setStack] = useState<string[]>(subscription.stack)
  const [levels, setLevels] = useState<string[]>(subscription.levels)
  const [ignoreWords, setIgnoreWords] = useState<string[]>(subscription.ignore_words)
  const [isInternational, setIsInternational] = useState(subscription.is_international)
  const [dailyLimit, setDailyLimit] = useState(subscription.daily_limit)

  async function save() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/job-alerts/${subscription.id}`, {
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
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar a inscrição.")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Inscrição de <span className="font-medium text-foreground">{subscription.email}</span>
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Recebendo vagas</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Desligue para pausar os envios deste mentorado.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Recebendo vagas" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ja-name" className="text-sm font-medium text-foreground">
            Nome
          </label>
          <input
            id="ja-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do mentorado"
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
      <TagInput
        label="Palavras a ignorar"
        placeholder="Ex: java — Enter para adicionar"
        values={ignoreWords}
        onChange={setIgnoreWords}
      />

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

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="min-h-11">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          {saving ? "Salvando…" : "Salvar inscrição"}
        </Button>
      </div>
    </div>
  )
}
