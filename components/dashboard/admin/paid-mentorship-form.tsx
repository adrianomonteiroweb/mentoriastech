"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CreditCard, ImageIcon, Loader2, Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { PaidMentorship } from "@/lib/types/database"

interface PaidMentorshipFormProps {
  mentorship?: PaidMentorship
  onSuccess?: () => void
}

function amountToInput(amountCents: number | undefined) {
  if (!amountCents) return ""
  return (amountCents / 100).toFixed(2)
}

function secondsToHours(seconds: number | undefined) {
  if (!seconds) return 24
  return Math.max(1, Math.round(seconds / 3600))
}

export function PaidMentorshipForm({ mentorship, onSuccess }: PaidMentorshipFormProps) {
  const isEditing = Boolean(mentorship)
  const [title, setTitle] = useState(mentorship?.title ?? "")
  const [description, setDescription] = useState(mentorship?.description ?? "")
  const [amount, setAmount] = useState(amountToInput(mentorship?.amount_cents))
  const [mentorEmail, setMentorEmail] = useState(mentorship?.mentor_email ?? "")
  const [imageAlt, setImageAlt] = useState(mentorship?.image_alt ?? "")
  const [sortOrder, setSortOrder] = useState(mentorship?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(mentorship?.is_active ?? true)
  const [pixExpirationHours, setPixExpirationHours] = useState(
    secondsToHours(mentorship?.pix_expires_after_seconds),
  )
  const [pixAmountIncludesIof, setPixAmountIncludesIof] = useState<"never" | "always">(
    mentorship?.pix_amount_includes_iof ?? "never",
  )
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(mentorship?.image_url ?? null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null
    setFile(selectedFile)

    if (selectedFile) {
      setPreview(URL.createObjectURL(selectedFile))
    } else {
      setPreview(mentorship?.image_url ?? null)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const amountCents = Math.round(Number(amount) * 100)
      if (!Number.isFinite(amountCents) || amountCents < 50) {
        throw new Error("Informe um valor de pelo menos R$ 0,50")
      }

      let imageUrl = isEditing ? (mentorship?.image_url ?? "") : ""

      if (file) {
        const formData = new FormData()
        formData.append("file", file)

        const uploadResponse = await fetch("/api/admin/paid-mentorships/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json()
          throw new Error(data.error || "Erro no upload")
        }

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
      }

      const endpoint = isEditing
        ? `/api/admin/paid-mentorships/${mentorship!.id}`
        : "/api/admin/paid-mentorships"

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl || undefined,
          image_alt: imageAlt || title,
          amount_cents: amountCents,
          currency: "BRL",
          pix_expires_after_seconds: Math.max(1, pixExpirationHours) * 3600,
          pix_amount_includes_iof: pixAmountIncludesIof,
          mentor_email: mentorEmail,
          sort_order: sortOrder,
          is_active: isActive,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar mentoria paga")
      }

      if (!isEditing) {
        setTitle("")
        setDescription("")
        setAmount("")
        setMentorEmail("")
        setImageAlt("")
        setSortOrder(0)
        setIsActive(true)
        setPixExpirationHours(24)
        setPixAmountIncludesIof("never")
        setFile(null)
        setPreview(null)
      }

      setMessage(
        data.mentor_admin_granted
          ? "Mentoria salva e acesso admin concedido ao mentor responsavel."
          : "Mentoria salva. Se o mentor ainda nao tem conta, o acesso admin sera aplicado quando ele se cadastrar com esse email.",
      )
      onSuccess?.()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-title">Titulo</Label>
          <Input
            id="paid-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-mentor-email">Email do mentor responsavel</Label>
          <Input
            id="paid-mentor-email"
            type="email"
            value={mentorEmail}
            onChange={(event) => setMentorEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paid-description">Descricao</Label>
        <Textarea
          id="paid-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Explique objetivo, formato e o que o mentorado pode esperar."
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-amount">Valor em BRL</Label>
          <Input
            id="paid-amount"
            type="number"
            min="0.50"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="150.00"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-expiration">Expiracao Pix (horas)</Label>
          <Input
            id="paid-expiration"
            type="number"
            min={1}
            max={336}
            value={pixExpirationHours}
            onChange={(event) => setPixExpirationHours(Number(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>IOF no valor</Label>
          <Select value={pixAmountIncludesIof} onValueChange={(value) => setPixAmountIncludesIof(value as "never" | "always")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Nao incluso</SelectItem>
              <SelectItem value="always">Incluso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paid-order">Ordem</Label>
          <Input
            id="paid-order"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Imagem opcional da mentoria</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/75">
              PNG, JPG ou WebP de ate 5MB.
            </p>
          </div>
        </div>
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="min-h-12 bg-background text-base"
        />
      </div>

      {preview && (
        <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="relative aspect-square overflow-hidden rounded-md border bg-black">
            <Image
              src={preview}
              alt={imageAlt || title || "Previa da imagem"}
              fill
              sizes="160px"
              className="object-contain"
              unoptimized={preview.startsWith("blob:")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paid-image-alt">Texto alternativo</Label>
            <Textarea
              id="paid-image-alt"
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              rows={4}
              required
              placeholder="Descreva a imagem para acessibilidade."
            />
          </div>
        </div>
      )}

      <div className="flex min-h-11 items-center gap-3">
        <Switch id="paid-active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="paid-active">Mentoria ativa</Label>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title || !mentorEmail || !amount} className="min-h-12 text-base">
        {loading ? (
          <Loader2 className="mr-1 h-5 w-5 animate-spin" aria-hidden="true" />
        ) : isEditing ? (
          <Save className="mr-1 h-5 w-5" aria-hidden="true" />
        ) : (
          <Upload className="mr-1 h-5 w-5" aria-hidden="true" />
        )}
        {loading ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Criar mentoria"}
      </Button>

      <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/75">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        O QR Code e o Pix copia e cola sao gerados pela Stripe quando o mentorado solicita a mentoria.
      </p>
    </form>
  )
}
