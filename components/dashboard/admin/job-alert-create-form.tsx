"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, UserPlus } from "lucide-react"
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
} from "@/lib/db/job-alerts"

interface Mentee {
  id: string
  email: string
  full_name: string | null
  whatsapp: string | null
}

interface Props {
  onSuccess: () => void
}

export function JobAlertCreateForm({ onSuccess }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [results, setResults] = useState<Mentee[]>([])
  const [searchingMentees, setSearchingMentees] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Novo mentorado (não existe no sistema)
  const [isNewMentee, setIsNewMentee] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newWhatsapp, setNewWhatsapp] = useState("")

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
    if (searchTimer.current) clearTimeout(searchTimer.current)

    const q = search.trim()
    if (!q) {
      setResults([])
      setSearchingMentees(false)
      return
    }

    setSearchingMentees(true)
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams({ search: q, pageSize: "20" })
      fetch(`/api/admin/mentees?${params}`)
        .then((r) => r.json())
        .then((json) => {
          const list = (json.data || []).map((m: Record<string, unknown>) => ({
            id: m.id as string,
            email: m.email as string,
            full_name: m.full_name as string | null,
            whatsapp: m.whatsapp as string | null,
          }))
          setResults(list)
        })
        .catch(() => setResults([]))
        .finally(() => setSearchingMentees(false))
    }, 300)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  function selectMentee(m: Mentee) {
    setSelectedMentee(m)
    setIsNewMentee(false)
    setName(m.full_name || "")
    setWhatsapp(m.whatsapp || "")
    setSearch("")
    setResults([])
  }

  function startNewMentee() {
    setIsNewMentee(true)
    setSelectedMentee(null)
    setSearch("")
    setResults([])
  }

  function resetSelection() {
    setSelectedMentee(null)
    setIsNewMentee(false)
    setNewName("")
    setNewEmail("")
    setNewWhatsapp("")
    setName("")
    setWhatsapp("")
  }

  const canSave = isNewMentee
    ? newName.trim() && newEmail.trim() && newWhatsapp.trim()
    : !!selectedMentee

  async function save() {
    if (!canSave) {
      setError(isNewMentee ? "Preencha nome, email e WhatsApp." : "Selecione um mentorado.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const alertFields = {
        enabled,
        name: isNewMentee ? newName : name,
        whatsapp: isNewMentee ? newWhatsapp : whatsapp,
        positions,
        stack,
        levels,
        ignore_words: ignoreWords,
        is_international: isInternational,
        daily_limit: dailyLimit,
      }

      const body = isNewMentee
        ? { new_mentee: { name: newName, email: newEmail, whatsapp: newWhatsapp }, ...alertFields }
        : { profile_id: selectedMentee!.id, ...alertFields }

      const res = await fetch("/api/admin/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "Erro ao criar inscrição.")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar inscrição")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Mentee selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Mentorado</label>
        {selectedMentee ? (
          <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedMentee.full_name || selectedMentee.email}
              </p>
              {selectedMentee.full_name && (
                <p className="text-xs text-muted-foreground">{selectedMentee.email}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetSelection}
            >
              Trocar
            </Button>
          </div>
        ) : isNewMentee ? (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/50 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Novo mentorado</p>
              <Button size="sm" variant="ghost" onClick={resetSelection}>
                Trocar
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-name" className="text-xs font-medium text-muted-foreground">Nome</label>
              <input
                id="new-name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setName(e.target.value) }}
                placeholder="Nome completo"
                className="min-h-10 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-email" className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="min-h-10 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-whatsapp" className="text-xs font-medium text-muted-foreground">WhatsApp</label>
              <PhoneNumberInput
                id="new-whatsapp"
                value={newWhatsapp}
                onChange={(value) => { setNewWhatsapp(value); setWhatsapp(value) }}
                showHint={false}
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou WhatsApp…"
              className="min-h-11 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchingMentees && search.trim() && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                <p className="text-xs text-muted-foreground">Buscando…</p>
              </div>
            )}
            {!searchingMentees && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                {results.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => selectMentee(m)}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-accent"
                    >
                      <span className="text-sm text-foreground">
                        {m.full_name || m.email}
                      </span>
                      {m.full_name && (
                        <span className="text-xs text-muted-foreground">{m.email}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {search.trim() && !searchingMentees && results.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhum mentorado encontrado.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startNewMentee}
              className="mt-2 gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar novo mentorado
            </Button>
          </div>
        )}
      </div>

      {/* Alert config fields */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Recebendo vagas</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Desligue para criar a inscrição pausada.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Recebendo vagas" />
      </div>

      {!isNewMentee && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="jac-name" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="jac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do mentorado"
              className="min-h-11 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="jac-whatsapp" className="text-sm font-medium text-foreground">
              WhatsApp
            </label>
            <PhoneNumberInput
              id="jac-whatsapp"
              value={whatsapp}
              onChange={setWhatsapp}
            />
          </div>
        </div>
      )}

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
          <label htmlFor="jac-limit" className="text-sm font-medium text-foreground">
            Limite de vagas por dia
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">Entre 1 e 50.</p>
        </div>
        <input
          id="jac-limit"
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
        <Button onClick={save} disabled={saving || !canSave} className="min-h-11">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          {saving ? "Inscrevendo…" : "Inscrever mentorado"}
        </Button>
      </div>
    </div>
  )
}
