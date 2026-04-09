"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Upload, CheckCircle2 } from "lucide-react"
import type { Profile } from "@/lib/types/database"

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [fullName, setFullName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [bio, setBio] = useState("")

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setProfile(json.data)
          setFullName(json.data.full_name || "")
          setWhatsapp(json.data.whatsapp || "")
          setLinkedinUrl(json.data.linkedin_url || "")
          setBio(json.data.bio || "")
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          whatsapp,
          linkedin_url: linkedinUrl || "",
          bio,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setMessage("Perfil atualizado com sucesso!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      const data = await res.json()
      setProfile((prev) => prev ? { ...prev, resume_url: data.url } : prev)
      setMessage("Curriculo enviado com sucesso!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile?.email || ""} disabled className="opacity-60" />
        <p className="text-xs text-muted-foreground">O email nao pode ser alterado</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(85) 99999-9999" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="linkedin">LinkedIn</Label>
        <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/seu-perfil" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Conte um pouco sobre voce..." />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Curriculo (PDF)</Label>
        {profile?.resume_url && (
          <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mb-1">
            Ver curriculo atual
          </a>
        )}
        <div className="flex items-center gap-2">
          <Input type="file" accept=".pdf" onChange={handleResumeUpload} disabled={uploading} />
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <p className="text-xs text-muted-foreground">Tamanho maximo: 5MB</p>
      </div>

      {message && (
        <p className="flex items-center gap-1 text-sm text-green-500">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        {saving ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  )
}
