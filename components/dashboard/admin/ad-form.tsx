"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Upload, ImageIcon } from "lucide-react"
import Image from "next/image"

interface AdFormProps {
  onSuccess?: () => void
}

export function AdForm({ onSuccess }: AdFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      let imageUrl = ""

      if (file) {
        const formData = new FormData()
        formData.append("file", file)

        const uploadRes = await fetch("/api/admin/ads/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const data = await uploadRes.json()
          throw new Error(data.error || "Erro no upload")
        }

        const uploadData = await uploadRes.json()
        imageUrl = uploadData.url
      }

      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl || undefined,
          whatsapp_number: whatsappNumber || undefined,
          link_url: linkUrl || undefined,
          sort_order: sortOrder,
          is_active: isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao criar anúncio")
      }

      setTitle("")
      setDescription("")
      setWhatsappNumber("")
      setLinkUrl("")
      setSortOrder(0)
      setIsActive(true)
      setFile(null)
      setPreview(null)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-title">Título</Label>
          <Input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-whatsapp">WhatsApp (com DDD)</Label>
          <Input
            id="ad-whatsapp"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="5585988139289"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-desc">Descrição</Label>
        <Textarea
          id="ad-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Breve descrição do serviço"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-image">Imagem (max 5MB)</Label>
        <Input
          id="ad-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
        />
        {preview && (
          <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-border">
            <Image src={preview} alt="Preview" fill className="object-cover" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-link">Link externo (opcional)</Label>
          <Input
            id="ad-link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-order">Ordem</Label>
          <Input
            id="ad-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="ad-active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="ad-active">Ativo</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
        {loading ? "Salvando..." : "Criar anúncio"}
      </Button>
    </form>
  )
}
