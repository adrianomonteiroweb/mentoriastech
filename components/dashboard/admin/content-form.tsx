"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, Plus, Trash2 } from "lucide-react"
import type { ContentCategory, ContentItemWithCategory, ContentLink } from "@/lib/types/database"

interface ContentFormProps {
  content?: ContentItemWithCategory
  onSuccess?: () => void
}

export function ContentForm({ content, onSuccess }: ContentFormProps) {
  const isEditing = !!content
  const [title, setTitle] = useState(content?.title ?? "")
  const [description, setDescription] = useState(content?.description ?? "")
  const [contentType, setContentType] = useState<string>(content?.content_type ?? "pdf")
  const [categoryId, setCategoryId] = useState(content?.category_id ?? "")
  const [url, setUrl] = useState(content?.url ?? "")
  const [articleBody, setArticleBody] = useState(content?.article_body ?? "")
  const [links, setLinks] = useState<ContentLink[]>(
    content?.links && content.links.length > 0
      ? content.links
      : [{ url: "", label: "" }]
  )
  const [file, setFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const requiresUrl = contentType === "video" || contentType === "article"

  useEffect(() => {
    fetch("/api/admin/content/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data || []))
      .catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      let fileUrl = url
      let fileSize: number | undefined

      // Upload de PDF
      if (contentType === "pdf" && file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("category", categoryId)

        const uploadRes = await fetch("/api/admin/content/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const data = await uploadRes.json()
          throw new Error(data.error || "Erro no upload")
        }

        const uploadData = await uploadRes.json()
        fileUrl = uploadData.url
        fileSize = uploadData.size
      }

      // Criar ou atualizar conteúdo
      const endpoint = isEditing ? `/api/admin/content/${content!.id}` : "/api/admin/content"
      const method = isEditing ? "PUT" : "POST"

      // Filtrar links válidos (ambos url e label preenchidos)
      const validLinks = contentType === "link"
        ? links.filter((l) => l.url.trim() && l.label.trim())
        : undefined

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          content_type: contentType,
          category_id: categoryId,
          url: contentType !== "link" ? (fileUrl || undefined) : undefined,
          links: validLinks,
          article_body: contentType === "article" ? articleBody : undefined,
          ...(fileSize ? { file_size_bytes: fileSize } : {}),
          ...(!isEditing ? { is_published: true } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || (isEditing ? "Erro ao atualizar conteudo" : "Erro ao criar conteudo"))
      }

      if (!isEditing) {
        setTitle("")
        setDescription("")
        setUrl("")
        setLinks([{ url: "", label: "" }])
        setArticleBody("")
        setFile(null)
        setContentType("pdf")
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Titulo</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Categoria</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Descricao</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tipo de conteudo</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="video">Video (YouTube)</SelectItem>
            <SelectItem value="article">Artigo</SelectItem>
            <SelectItem value="link">Link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {contentType === "pdf" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Arquivo PDF (max 5MB)</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {requiresUrl && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url">
            {contentType === "video" ? "URL do YouTube" : "Link do artigo"}
          </Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              contentType === "video"
                ? "https://youtube.com/watch?v=..."
                : "https://..."
            }
            required={requiresUrl}
          />
        </div>
      )}

      {contentType === "link" && (
        <div className="flex flex-col gap-3">
          <Label>Links</Label>
          {links.map((link, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Texto do link"
                  value={link.label}
                  onChange={(e) => {
                    const updated = [...links]
                    updated[index] = { ...updated[index], label: e.target.value }
                    setLinks(updated)
                  }}
                  required
                />
                <Input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...links]
                    updated[index] = { ...updated[index], url: e.target.value }
                    setLinks(updated)
                  }}
                  required
                />
              </div>
              {links.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setLinks(links.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setLinks([...links, { url: "", label: "" }])}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar link
          </Button>
        </div>
      )}

      {contentType === "article" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="body">Conteudo do artigo</Label>
          <Textarea id="body" value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={8} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title || !categoryId || (requiresUrl && !url) || (contentType === "link" && !links.some(l => l.url.trim() && l.label.trim()))}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
        {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Publicar conteudo"}
      </Button>
    </form>
  )
}
