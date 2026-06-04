"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Send, CheckCircle2 } from "lucide-react"
import {
  CUSTOM_JOB_CATEGORY_VALUE,
  getJobCategoryLabel,
  isDefaultJobCategory,
  mergeJobCategoryOptions,
  normalizeJobCategory,
} from "@/lib/job-options"
import { getJobActiveHours, MAX_JOB_ACTIVE_HOURS } from "@/lib/job-active-time"
import type { Job } from "@/lib/types/database"

interface JobFormProps {
  onSuccess?: (job?: Job) => void
  job?: Job
  adminMode?: boolean
  submitEndpoint?: string
  categorySourceEndpoint?: string
  submitLabel?: string
  loadingLabel?: string
  successMessage?: string
  successDescription?: string
  createAnotherLabel?: string
  className?: string
}

export function JobForm({
  onSuccess,
  job,
  adminMode = false,
  submitEndpoint,
  categorySourceEndpoint,
  submitLabel = "Publicar vaga",
  loadingLabel = "Salvando...",
  successMessage,
  successDescription,
  createAnotherLabel = "Publicar outra vaga",
  className = "",
}: JobFormProps) {
  const isEditing = Boolean(job)
  const initialCategory = job?.category || "other"
  const initialUsesCustomCategory = initialCategory !== "other" && !isDefaultJobCategory(initialCategory)
  const [title, setTitle] = useState(job?.title || "")
  const [company, setCompany] = useState(job?.company || "")
  const [activeHours, setActiveHours] = useState(
    job?.source_posted_at ? String(getJobActiveHours(job.source_posted_at)) : "",
  )
  const [activeHoursChanged, setActiveHoursChanged] = useState(false)
  const [description, setDescription] = useState(job?.description || "")
  const [location, setLocation] = useState(job?.location || "")
  const [jobType, setJobType] = useState(job?.job_type || "remote")
  const [level, setLevel] = useState(job?.level || "junior")
  const [category, setCategory] = useState(initialCategory)
  const [usesCustomCategory, setUsesCustomCategory] = useState(initialUsesCustomCategory)
  const [customCategoryName, setCustomCategoryName] = useState(
    initialUsesCustomCategory ? getJobCategoryLabel(initialCategory) : "",
  )
  const [salaryRange, setSalaryRange] = useState(job?.salary_range || "")
  const [applicationUrl, setApplicationUrl] = useState(job?.application_url || "")
  const [isInternational, setIsInternational] = useState(job?.is_international || false)
  const [requiredLanguage, setRequiredLanguage] = useState(job?.required_language || "")
  const [languageLevel, setLanguageLevel] = useState(job?.language_level || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [savedCategories, setSavedCategories] = useState<string[]>([])
  const categoryOptions = useMemo(
    () => mergeJobCategoryOptions([category, ...savedCategories]),
    [category, savedCategories],
  )
  const selectedCategoryValue = usesCustomCategory ? CUSTOM_JOB_CATEGORY_VALUE : category

  useEffect(() => {
    const endpoint =
      categorySourceEndpoint || (adminMode ? "/api/admin/jobs" : "/api/jobs?mine=true")

    fetch(endpoint)
      .then((response) => response.json())
      .then((json) => {
        const categories = Array.from(
          new Set(
            ((json.data || []) as Job[])
              .map((item) => item.category)
              .filter(Boolean),
          ),
        )

        setSavedCategories(categories)
      })
      .catch(() => setSavedCategories([]))
  }, [adminMode, categorySourceEndpoint])

  function handleCategoryChange(value: string) {
    if (value === CUSTOM_JOB_CATEGORY_VALUE) {
      setUsesCustomCategory(true)
      return
    }

    setUsesCustomCategory(false)
    setCategory(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const categoryForSubmit = usesCustomCategory
        ? normalizeJobCategory(customCategoryName)
        : category

      if (!categoryForSubmit) {
        throw new Error("Informe uma categoria personalizada valida")
      }

      const endpoint =
        submitEndpoint ||
        (isEditing
          ? adminMode
            ? `/api/admin/jobs/${job!.id}`
            : `/api/jobs/${job!.id}`
          : "/api/jobs")

      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          location: location || undefined,
          job_type: jobType,
          level,
          category: categoryForSubmit,
          salary_range: salaryRange || undefined,
          application_url: applicationUrl || undefined,
          is_international: isInternational,
          required_language: isInternational && requiredLanguage ? requiredLanguage : undefined,
          language_level: isInternational && languageLevel ? languageLevel : undefined,
          ...(!isEditing || activeHoursChanged
            ? { active_hours: Number(activeHours) }
            : {}),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar vaga")
      }

      setSuccess(true)
      if (!isEditing) {
        setTitle("")
        setCompany("")
        setActiveHours("")
        setActiveHoursChanged(false)
        setDescription("")
        setLocation("")
        setSalaryRange("")
        setApplicationUrl("")
        setCategory("other")
        setUsesCustomCategory(false)
        setCustomCategoryName("")
      }
      onSuccess?.(data?.data as Job | undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-sm font-medium">
          {successMessage ||
            (isEditing ? "Vaga atualizada com sucesso!" : "Vaga publicada com sucesso!")}
        </p>
        {successDescription && (
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {successDescription}
          </p>
        )}
        {!isEditing && (
          <Button variant="outline" onClick={() => setSuccess(false)}>
            {createAnotherLabel}
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-4 max-w-lg ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Label htmlFor="active-hours">Há quantas horas a vaga está ativa?</Label>
        <Input
          id="active-hours"
          type="number"
          min={0}
          max={MAX_JOB_ACTIVE_HOURS}
          step={1}
          value={activeHours}
          onChange={(e) => {
            setActiveHours(e.target.value)
            setActiveHoursChanged(true)
          }}
          required
          placeholder="Ex: 6"
        />
        <p className="text-xs text-muted-foreground">
          A plataforma continuará contando as horas a partir desse número.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Descricao</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Requisitos, responsabilidades, beneficios..." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Localizacao</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Fortaleza, CE" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Modelo</Label>
          <Select value={jobType} onValueChange={(value) => setJobType(value as typeof jobType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remoto</SelectItem>
              <SelectItem value="hybrid">Hibrido</SelectItem>
              <SelectItem value="onsite">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Nivel</Label>
          <Select value={level} onValueChange={(value) => setLevel(value as typeof level)}>
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
          <Label>Categoria</Label>
          <Select value={selectedCategoryValue} onValueChange={handleCategoryChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_JOB_CATEGORY_VALUE}>Nova categoria</SelectItem>
            </SelectContent>
          </Select>
          {usesCustomCategory && (
            <Input
              id="custom-category"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              required
              placeholder="Ex: Produto e Growth"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salary">Faixa salarial</Label>
        <Input id="salary" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="R$ 5.000 - R$ 8.000" />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="international" checked={isInternational} onCheckedChange={setIsInternational} />
        <Label htmlFor="international">Vaga internacional</Label>
      </div>

      {isInternational && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lang">Idioma exigido</Label>
            <Input id="lang" value={requiredLanguage} onChange={(e) => setRequiredLanguage(e.target.value)} placeholder="Inglês" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nivel do idioma</Label>
            <Select value={languageLevel} onValueChange={setLanguageLevel}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basico</SelectItem>
                <SelectItem value="intermediate">Intermediario</SelectItem>
                <SelectItem value="advanced">Avancado</SelectItem>
                <SelectItem value="fluent">Fluente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="appUrl">Link para candidatura (LinkedIn ou site)</Label>
        <Input id="appUrl" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://linkedin.com/jobs/..." />
        <p className="text-xs text-muted-foreground">Link direto para o LinkedIn ou site da empresa</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
        {loading ? loadingLabel : isEditing ? "Salvar alteracoes" : submitLabel}
      </Button>
    </form>
  )
}
