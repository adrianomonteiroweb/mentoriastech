"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload } from "lucide-react"
import type { ContentCategory } from "@/lib/types/database"

interface ContentFormProps {
  onSuccess?: () => void
}

export function ContentForm({ onSuccess }: ContentFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contentType, setContentType] = useState<string>("pdf")
  const [categoryId, setCategoryId] = useState("")
  const [url, setUrl] = useState("")
  const [articleBody, setArticleBody] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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

      // Criar conteúdo
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          content_type: contentType,
          category_id: categoryId,
          url: fileUrl || undefined,
          article_body: contentType === "article" ? articleBody : undefined,
          file_size_bytes: fileSize,
          is_published: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao criar conteudo")
      }

      // Reset form
      setTitle("")
      setDescription("")
      setUrl("")
      setArticleBody("")
      setFile(null)
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

      {contentType === "video" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url">URL do YouTube</Label>
          <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
      )}

      {contentType === "article" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="body">Conteudo do artigo</Label>
          <Textarea id="body" value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={8} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title || !categoryId}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
        {loading ? "Salvando..." : "Publicar conteudo"}
      </Button>
    </form>
  )
}
