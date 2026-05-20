"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Send, CheckCircle2 } from "lucide-react"

interface JobFormProps {
  onSuccess?: () => void
}

export function JobForm({ onSuccess }: JobFormProps) {
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("remote")
  const [level, setLevel] = useState("junior")
  const [salaryRange, setSalaryRange] = useState("")
  const [applicationUrl, setApplicationUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          location: location || undefined,
          job_type: jobType,
          level,
          salary_range: salaryRange || undefined,
          application_url: applicationUrl || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao publicar vaga")
      }

      setSuccess(true)
      setTitle("")
      setCompany("")
      setDescription("")
      setLocation("")
      setSalaryRange("")
      setApplicationUrl("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-sm font-medium">Vaga publicada com sucesso!</p>
        <Button variant="outline" onClick={() => setSuccess(false)}>
          Publicar outra vaga
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Titulo da vaga</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Dev Full-Stack" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Descricao</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Requisitos, responsabilidades, beneficios..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Localizacao</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Fortaleza, CE" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Modelo</Label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remoto</SelectItem>
              <SelectItem value="hybrid">Hibrido</SelectItem>
              <SelectItem value="onsite">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Nivel</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="internship">Estagio & Trainee</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Pleno</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salary">Faixa salarial</Label>
        <Input id="salary" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="R$ 5.000 - R$ 8.000" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="appUrl">Link para candidatura (LinkedIn ou site)</Label>
        <Input id="appUrl" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://linkedin.com/jobs/..." />
        <p className="text-xs text-muted-foreground">Link direto para o LinkedIn ou site da empresa</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
        {loading ? "Publicando..." : "Publicar vaga"}
      </Button>
    </form>
  )
}
