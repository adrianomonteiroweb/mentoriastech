"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "email", label: "Email" },
  { value: "telegram", label: "Telegram" },
]

const MEDIUMS = [
  { value: "social", label: "Social" },
  { value: "cpc", label: "CPC (Pago)" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "organic", label: "Organico" },
  { value: "event", label: "Evento" },
  { value: "qrcode", label: "QR Code" },
]

interface TrackingLinkFormProps {
  onSuccess: () => void
}

export function TrackingLinkForm({ onSuccess }: TrackingLinkFormProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [utmSource, setUtmSource] = useState("")
  const [customSource, setCustomSource] = useState("")
  const [utmMedium, setUtmMedium] = useState("")
  const [customMedium, setCustomMedium] = useState("")
  const [utmCampaign, setUtmCampaign] = useState("")
  const [destinationPath, setDestinationPath] = useState("/")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const source = utmSource === "__custom" ? customSource : utmSource
    const medium = utmMedium === "__custom" ? customMedium : utmMedium

    try {
      const res = await fetch("/api/admin/tracking-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          utm_source: source,
          utm_medium: medium,
          utm_campaign: utmCampaign || undefined,
          destination_path: destinationPath,
        }),
      })

      if (res.ok) {
        onSuccess()
      }
    } finally {
      setLoading(false)
    }
  }

  const effectiveSource = utmSource === "__custom" ? customSource : utmSource
  const effectiveMedium = utmMedium === "__custom" ? customMedium : utmMedium
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://mentoriastech.com"
  const previewParams = new URLSearchParams()
  if (effectiveSource) previewParams.set("utm_source", effectiveSource)
  if (effectiveMedium) previewParams.set("utm_medium", effectiveMedium)
  if (utmCampaign) previewParams.set("utm_campaign", utmCampaign)
  const previewUrl = previewParams.toString()
    ? `${baseUrl}${destinationPath}?${previewParams.toString()}`
    : ""

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do link</Label>
          <Input
            id="name"
            placeholder="Ex: Stories Instagram - Evento React"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Pagina de destino</Label>
          <Input
            id="destination"
            placeholder="/"
            value={destinationPath}
            onChange={(e) => setDestinationPath(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Fonte (utm_source)</Label>
          <Select value={utmSource} onValueChange={setUtmSource}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a fonte" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom">Personalizado...</SelectItem>
            </SelectContent>
          </Select>
          {utmSource === "__custom" && (
            <Input
              placeholder="fonte personalizada"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              required
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Meio (utm_medium)</Label>
          <Select value={utmMedium} onValueChange={setUtmMedium}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o meio" />
            </SelectTrigger>
            <SelectContent>
              {MEDIUMS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom">Personalizado...</SelectItem>
            </SelectContent>
          </Select>
          {utmMedium === "__custom" && (
            <Input
              placeholder="meio personalizado"
              value={customMedium}
              onChange={(e) => setCustomMedium(e.target.value)}
              required
            />
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="campaign">Campanha (utm_campaign) — opcional</Label>
          <Input
            id="campaign"
            placeholder="Ex: evento-react-2025, curso-node, palestra-devfest"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
          />
        </div>
      </div>

      {previewUrl && (
        <div className="rounded-md bg-muted p-3 text-sm break-all">
          <span className="text-muted-foreground font-medium">Link gerado: </span>
          <span className="text-primary">{previewUrl}</span>
        </div>
      )}

      <Button type="submit" disabled={loading || !name || !effectiveSource || !effectiveMedium}>
        {loading ? "Criando..." : "Criar link de rastreamento"}
      </Button>
    </form>
  )
}
