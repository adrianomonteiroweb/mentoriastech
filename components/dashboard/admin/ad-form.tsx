"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ImageIcon, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { DEFAULT_AD_WHATSAPP_MESSAGE } from "@/lib/ad-whatsapp"
import type { Ad } from "@/lib/types/database"

interface AdFormProps {
  ad?: Ad
  onSuccess?: () => void
}

export function AdForm({ ad, onSuccess }: AdFormProps) {
  const isEditing = Boolean(ad)
  const [title, setTitle] = useState(ad?.title ?? "")
  const [description, setDescription] = useState(ad?.description ?? "")
  const [imageAlt, setImageAlt] = useState(ad?.image_alt ?? "")
  const [whatsappNumber, setWhatsappNumber] = useState(ad?.whatsapp_number ?? "")
  const [whatsappMessage, setWhatsappMessage] = useState(
    ad?.whatsapp_message ?? DEFAULT_AD_WHATSAPP_MESSAGE,
  )
  const [linkUrl, setLinkUrl] = useState(ad?.link_url ?? "")
  const [sortOrder, setSortOrder] = useState(ad?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(ad?.is_active ?? true)
  const [hasMaxClicks, setHasMaxClicks] = useState(ad?.max_clicks != null)
  const [maxClicks, setMaxClicks] = useState(ad?.max_clicks ?? 100)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(ad?.image_url ?? null)
  const [loading, setLoading] = useState(false)
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
      setPreview(ad?.image_url ?? null)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      let imageUrl = isEditing ? (ad?.image_url ?? "") : ""

      if (file) {
        const formData = new FormData()
        formData.append("file", file)

        const uploadResponse = await fetch("/api/admin/ads/upload", {
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

      const endpoint = isEditing ? `/api/admin/ads/${ad!.id}` : "/api/admin/ads"
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl || undefined,
          image_alt: imageAlt || title,
          whatsapp_number: whatsappNumber || undefined,
          whatsapp_message: whatsappMessage,
          link_url: linkUrl || undefined,
          sort_order: sortOrder,
          is_active: isActive,
          max_clicks: hasMaxClicks ? maxClicks : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(
          data.error || (isEditing ? "Erro ao atualizar anúncio" : "Erro ao criar anúncio"),
        )
      }

      if (!isEditing) {
        setTitle("")
        setDescription("")
        setImageAlt("")
        setWhatsappNumber("")
        setWhatsappMessage(DEFAULT_AD_WHATSAPP_MESSAGE)
        setLinkUrl("")
        setSortOrder(0)
        setIsActive(true)
        setFile(null)
        setPreview(null)
      }

      onSuccess?.()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-title">Título</Label>
          <Input
            id="ad-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-whatsapp">WhatsApp com país e DDD</Label>
          <PhoneNumberInput
            id="ad-whatsapp"
            value={whatsappNumber}
            onChange={setWhatsappNumber}
            aria-describedby="ad-whatsapp-help"
            showHint={false}
          />
          <p id="ad-whatsapp-help" className="text-sm leading-relaxed text-foreground/75">
            Selecione o país ou cole o número completo com +. O botão abrirá a conversa nesse WhatsApp.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-whatsapp-message">Mensagem inicial do WhatsApp</Label>
        <Textarea
          id="ad-whatsapp-message"
          value={whatsappMessage}
          onChange={(event) => setWhatsappMessage(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={DEFAULT_AD_WHATSAPP_MESSAGE}
          aria-describedby="ad-whatsapp-message-help"
        />
        <p id="ad-whatsapp-message-help" className="text-sm leading-relaxed text-foreground/75">
          A mensagem será preenchida automaticamente ao abrir a conversa do anúncio.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-desc">Descrição acessível do serviço</Label>
        <Textarea
          id="ad-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Explique o serviço e os principais benefícios em poucas frases."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-image">Imagem do anúncio</Label>
        <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Envie uma arte completa para destacar o serviço
              </p>
              <p id="ad-image-help" className="mt-1 text-sm leading-relaxed text-foreground/75">
                PNG, JPG ou WebP de até 5MB. Imagens quadradas funcionam melhor no celular.
              </p>
            </div>
          </div>
          <Input
            id="ad-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="ad-image-help"
            onChange={handleFileChange}
            className="min-h-12 bg-background text-base"
          />
          {file && (
            <p className="mt-2 text-sm font-medium text-foreground/80">
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ad-image-alt">Texto alternativo da imagem</Label>
        <Textarea
          id="ad-image-alt"
          value={imageAlt}
          onChange={(event) => setImageAlt(event.target.value)}
          required={Boolean(preview)}
          maxLength={500}
          rows={3}
          placeholder="Ex: Anúncio de aulas de inglês para profissionais de tecnologia, com preparação para entrevistas e reuniões."
          aria-describedby="ad-image-alt-help"
        />
        <p id="ad-image-alt-help" className="text-sm leading-relaxed text-foreground/75">
          Descreva as informações importantes da arte para pessoas que usam leitor de tela
          ou não conseguem enxergar todos os detalhes.
        </p>
      </div>

      {preview && (
        <section
          aria-labelledby="ad-preview-title"
          className="overflow-hidden rounded-2xl border border-primary/40 bg-card"
        >
          <div className="border-b border-primary/20 px-4 py-3">
            <h3 id="ad-preview-title" className="text-base font-semibold text-foreground">
              Prévia do anúncio
            </h3>
            <p className="text-sm text-foreground/75">
              A arte será exibida inteira e poderá ser ampliada.
            </p>
          </div>
          <div className="grid sm:grid-cols-[minmax(0,1.25fr)_minmax(14rem,0.75fr)]">
            <div className="relative aspect-square overflow-hidden border-b border-primary/20 bg-black sm:border-b-0 sm:border-r">
              <Image
                src={preview}
                alt={imageAlt || title || "Prévia da imagem do anúncio"}
                fill
                sizes="(max-width: 639px) calc(100vw - 3rem), 420px"
                className="object-contain"
                unoptimized={preview.startsWith("blob:")}
              />
            </div>
            <div className="flex flex-col justify-center gap-3 bg-gradient-to-br from-card to-primary/10 p-4">
              <span className="w-fit rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                Serviço recomendado
              </span>
              <p className="text-xl font-bold leading-tight text-foreground">
                {title || "Título do anúncio"}
              </p>
              <p className="text-base leading-relaxed text-foreground/85">
                {description || "A descrição do serviço aparecerá aqui."}
              </p>
              <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-base font-bold text-white">
                Falar no WhatsApp
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-link">Link externo alternativo</Label>
          <Input
            id="ad-link"
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://..."
          />
          <p className="text-sm leading-relaxed text-foreground/75">
            Usado somente quando nenhum WhatsApp for informado.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-order">Ordem</Label>
          <Input
            id="ad-order"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center gap-3">
          <Switch id="ad-max-clicks" checked={hasMaxClicks} onCheckedChange={setHasMaxClicks} />
          <Label htmlFor="ad-max-clicks">Limite de cliques</Label>
        </div>
        {hasMaxClicks && (
          <div className="flex flex-col gap-1.5 rounded-xl border bg-secondary/40 p-4">
            <Label htmlFor="ad-max-clicks-value">Máximo de cliques permitidos</Label>
            <Input
              id="ad-max-clicks-value"
              type="number"
              min={1}
              value={maxClicks}
              onChange={(event) => setMaxClicks(Number(event.target.value))}
              placeholder="Ex: 100"
              className="max-w-[200px]"
            />
            <p className="text-sm leading-relaxed text-foreground/75">
              O anúncio será desativado automaticamente ao atingir este limite.
            </p>
          </div>
        )}
      </div>

      <div className="flex min-h-11 items-center gap-3">
        <Switch id="ad-active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="ad-active">Anúncio ativo</Label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || !title} className="min-h-12 text-base">
        {loading ? (
          <Loader2 className="mr-1 h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="mr-1 h-5 w-5" aria-hidden="true" />
        )}
        {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar anúncio"}
      </Button>
    </form>
  )
}
