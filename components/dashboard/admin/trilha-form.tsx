"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  LearningTrack,
  LearningTrackPhaseWithContent,
} from "@/lib/types/database"

interface Option {
  id: string
  title: string
}

interface TrilhaFormProps {
  track?: LearningTrack
  onSuccess: () => void
}

export function TrilhaForm({ track, onSuccess }: TrilhaFormProps) {
  const isEdit = Boolean(track)
  const [title, setTitle] = useState(track?.title || "")
  const [description, setDescription] = useState(track?.description || "")
  const [coverImageUrl, setCoverImageUrl] = useState(track?.cover_image_url || "")
  const [supportsEnglish, setSupportsEnglish] = useState(
    track?.supports_english ?? false,
  )
  const [englishMentorshipId, setEnglishMentorshipId] = useState(
    track?.english_paid_mentorship_id || "",
  )
  const [isActive, setIsActive] = useState(track?.is_active ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(track?.cover_image_url ?? null)

  const [mentorships, setMentorships] = useState<Option[]>([])
  const [contentItems, setContentItems] = useState<Option[]>([])
  const [phases, setPhases] = useState<LearningTrackPhaseWithContent[]>([])
  const [contentByPhase, setContentByPhase] = useState<Record<string, string[]>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/paid-mentorships")
      .then((res) => res.json())
      .then((json) =>
        setMentorships(
          (json.data || []).map((m: { id: string; title: string }) => ({
            id: m.id,
            title: m.title,
          })),
        ),
      )
      .catch(() => setMentorships([]))

    fetch("/api/admin/content")
      .then((res) => res.json())
      .then((json) =>
        setContentItems(
          (json.data || []).map((c: { id: string; title: string }) => ({
            id: c.id,
            title: c.title,
          })),
        ),
      )
      .catch(() => setContentItems([]))
  }, [])

  useEffect(() => {
    if (!track) return
    fetch(`/api/admin/trilhas/${track.id}`)
      .then((res) => res.json())
      .then((json) => {
        const detail = json.data as
          | { phases: LearningTrackPhaseWithContent[] }
          | undefined
        if (!detail?.phases) return
        setPhases(detail.phases)
        const map: Record<string, string[]> = {}
        for (const phase of detail.phases) {
          map[phase.phase_key] = phase.content.map((c) => c.id)
        }
        setContentByPhase(map)
      })
      .catch(() => {})
  }, [track])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    setPreview(selected ? URL.createObjectURL(selected) : track?.cover_image_url ?? null)
  }

  function toggleContent(phaseKey: string, contentId: string) {
    setContentByPhase((prev) => {
      const current = prev[phaseKey] || []
      const next = current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [...current, contentId]
      return { ...prev, [phaseKey]: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (title.trim().length < 2) {
      setError("Informe um título.")
      return
    }
    setSaving(true)

    try {
      let imageUrl = coverImageUrl.trim()
      if (file) {
        const fd = new FormData()
        fd.append("file", file)
        const up = await fetch("/api/admin/trilhas/upload", {
          method: "POST",
          body: fd,
        })
        const upData = await up.json().catch(() => null)
        if (!up.ok) {
          setError(upData?.error || "Erro no upload da imagem.")
          setSaving(false)
          return
        }
        imageUrl = upData.url
      }

      const basePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image_url: imageUrl || "",
        supports_english: supportsEnglish,
        english_paid_mentorship_id: englishMentorshipId || null,
        is_active: isActive,
      }

      if (!isEdit) {
        const res = await fetch("/api/admin/trilhas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setError(data?.error || "Erro ao criar trilha.")
          setSaving(false)
          return
        }
      } else {
        const phaseContent = phases.map((phase) => ({
          phase_key: phase.phase_key,
          content_ids: contentByPhase[phase.phase_key] || [],
        }))
        const res = await fetch(`/api/admin/trilhas/${track!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, phase_content: phaseContent }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setError(data?.error || "Erro ao salvar trilha.")
          setSaving(false)
          return
        }
      }

      onSuccess()
    } catch {
      setError("Erro ao salvar trilha.")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Ex.: Recolocação Internacional"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Imagem de capa</label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pré-visualização da capa"
            className="h-32 w-full rounded-md border border-border object-cover"
          />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm focus:border-primary focus:outline-none"
        />
        <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP (até 5MB).</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={supportsEnglish}
          onChange={(e) => setSupportsEnglish(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Suporta fase de Inglês (A1) / alvo internacional
      </label>

      {supportsEnglish && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Mentoria paga de inglês (indicação na Fase 2)
          </label>
          <select
            value={englishMentorshipId}
            onChange={(e) => setEnglishMentorshipId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Nenhuma</option>
            {mentorships.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Ativa (visível para mentorados)
      </label>

      {/* Conteúdos por fase (apenas em edição) */}
      {isEdit && phases.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Conteúdos por fase</p>
          {phases.map((phase) => (
            <div key={phase.id} className="rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-semibold text-foreground">
                {phase.title}
              </p>
              {contentItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum conteúdo cadastrado.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contentItems.map((item) => {
                    const selected = (
                      contentByPhase[phase.phase_key] || []
                    ).includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleContent(phase.phase_key, item.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {item.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          Após criar a trilha, edite-a para vincular conteúdos a cada fase.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving} className="w-fit">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {isEdit ? "Salvar alterações" : "Criar trilha"}
      </Button>
    </form>
  )
}
