"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Briefcase,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react"
import { JobForm } from "@/components/dashboard/hr/job-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getJobCategoryLabel } from "@/lib/job-options"
import { parseResumeMarkdown, type ResumeBlock } from "@/lib/resume/markdown-blocks"
import type { Job } from "@/lib/types/database"

interface Props {
  email: string
  initialHasResume: boolean
}

type RequirementKind = "essential" | "differential"
type RequirementEvidence = "strong" | "weak" | "missing"

interface RequirementItem {
  skill: string
  kind: RequirementKind
  evidence: RequirementEvidence
}

interface GapQuestion {
  skill: string
  question: string
}

interface ResumeAnalysis {
  hasExperience: boolean
  requirements: RequirementItem[]
  questions: GapQuestion[]
  compatibility: number
}

interface TrajectoryTopic {
  id: string
  year: string
  text: string
}

const EVIDENCE_META: Record<
  RequirementEvidence,
  { label: string; className: string }
> = {
  strong: { label: "Forte", className: "bg-emerald-500/15 text-emerald-400" },
  weak: { label: "Parcial", className: "bg-amber-500/15 text-amber-400" },
  missing: { label: "Falta", className: "bg-destructive/15 text-destructive" },
}

type Phase = "input" | "analysis" | "trajectory" | "result"
type JobSourceMode = "existing" | "new"

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Hibrido",
  onsite: "Presencial",
}

const JOB_LEVEL_LABELS: Record<string, string> = {
  internship: "Estagio & Trainee",
  junior: "Junior",
  mid: "Pleno",
  senior: "Senior",
}

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  basic: "Basico",
  intermediate: "Intermediario",
  advanced: "Avancado",
  fluent: "Fluente",
}

function buildJobDescriptionFromJob(job: Job) {
  const lines = [
    `Titulo: ${job.title}`,
    job.company ? `Empresa: ${job.company}` : null,
    job.location ? `Localizacao: ${job.location}` : null,
    `Modelo: ${JOB_TYPE_LABELS[job.job_type] || job.job_type}`,
    `Nivel: ${JOB_LEVEL_LABELS[job.level] || job.level}`,
    job.category ? `Categoria: ${getJobCategoryLabel(job.category)}` : null,
    job.salary_range ? `Faixa salarial: ${job.salary_range}` : null,
    job.is_international ? "Vaga internacional: sim" : null,
    job.required_language
      ? `Idioma exigido: ${job.required_language}${
          job.language_level ? ` (${LANGUAGE_LEVEL_LABELS[job.language_level]})` : ""
        }`
      : null,
    job.application_url ? `Link: ${job.application_url}` : null,
    "",
    "Descricao:",
    job.description || "",
  ]

  return lines.filter((line) => line !== null).join("\n").trim()
}

function sourceButtonClass(active: boolean) {
  return `flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
  }`
}

function RenderedResume({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown)

  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block: ResumeBlock, i) => {
        switch (block.type) {
          case "h1":
            return (
              <h2 key={i} className="text-xl font-semibold text-foreground">
                {block.text}
              </h2>
            )
          case "h2":
            return (
              <h3
                key={i}
                className="mt-3 border-b border-primary/40 pb-1 text-xs font-semibold uppercase tracking-wider text-primary"
              >
                {block.text}
              </h3>
            )
          case "h3":
            return (
              <h4 key={i} className="mt-2 text-sm font-semibold text-foreground">
                {block.text}
              </h4>
            )
          case "bullet":
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm text-foreground">
                <span className="text-primary">•</span>
                <span className="flex-1">{block.text}</span>
              </div>
            )
          default:
            return (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {block.text}
              </p>
            )
        }
      })}
    </div>
  )
}

function RequirementRow({ req }: { req: RequirementItem }) {
  const meta = EVIDENCE_META[req.evidence]
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="min-w-0 flex-1 text-sm text-foreground">{req.skill}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.className}`}
      >
        {meta.label}
      </span>
    </div>
  )
}

function RequirementsPanel({
  requirements,
  title = "Requisitos da vaga",
}: {
  requirements: RequirementItem[]
  title?: string
}) {
  const essentials = requirements.filter((r) => r.kind === "essential")
  const differentials = requirements.filter((r) => r.kind === "differential")
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
      {essentials.length > 0 && (
        <div className="mb-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Essenciais (dia a dia)
          </p>
          <div className="divide-y divide-border/60">
            {essentials.map((req) => (
              <RequirementRow key={`e-${req.skill}`} req={req} />
            ))}
          </div>
        </div>
      )}
      {differentials.length > 0 && (
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Diferenciais
          </p>
          <div className="divide-y divide-border/60">
            {differentials.map((req) => (
              <RequirementRow key={`d-${req.skill}`} req={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GapQuestionCard({
  question,
  answer,
  onAnswer,
  result,
  onResult,
}: {
  question: GapQuestion
  answer: string
  onAnswer: (value: string) => void
  result: string
  onResult: (value: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
          {question.skill}
        </span>
      </div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        <MessageSquare className="mr-1 inline h-3.5 w-3.5 text-primary" />
        {question.question}
      </label>
      <Textarea
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        rows={3}
        placeholder="Descreva um projeto/atividade concreto (em experiência, curso, bootcamp, trabalho acadêmico ou projeto pessoal) e as tecnologias usadas."
        className="text-sm"
      />
      <label className="mb-1.5 mt-3 block text-sm font-medium text-foreground">
        <Trophy className="mr-1 inline h-3.5 w-3.5 text-primary" />
        Quais resultados esse projeto gerou?
      </label>
      <Textarea
        value={result}
        onChange={(e) => onResult(e.target.value)}
        rows={2}
        placeholder="Impacto e números: ex. reduziu o tempo de X em 30%, atendeu 500 usuários, automatizou Y. É o que o gestor avalia."
        className="text-sm"
      />
    </div>
  )
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-destructive"
}

function CompatibilityMeter({
  label,
  score,
}: {
  label: string
  score: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}%</span>
      </div>
      <Progress value={score} />
    </div>
  )
}

export function ResumeImprover({ email, initialHasResume }: Props) {
  const [hasResume, setHasResume] = useState(initialHasResume)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [jobSourceMode, setJobSourceMode] = useState<JobSourceMode>("existing")
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [createdJob, setCreatedJob] = useState<Job | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [phase, setPhase] = useState<Phase>("input")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [extraEvidence, setExtraEvidence] = useState<
    { id: string; skill: string; answer: string; results: string }[]
  >([])
  const [extraSkill, setExtraSkill] = useState("")
  const [extraAnswer, setExtraAnswer] = useState("")
  const [extraResults, setExtraResults] = useState("")

  const [trajectory, setTrajectory] = useState<TrajectoryTopic[]>([])
  const [trajYear, setTrajYear] = useState("")
  const [trajText, setTrajText] = useState("")

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [originalResult, setOriginalResult] = useState<string | null>(null)
  const [editingResume, setEditingResume] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [compatibilityAfter, setCompatibilityAfter] = useState<number | null>(null)
  const [requirementsAfter, setRequirementsAfter] = useState<RequirementItem[] | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const selectedJob = useMemo(
    () => availableJobs.find((job) => job.id === selectedJobId) || null,
    [availableJobs, selectedJobId],
  )

  useEffect(() => {
    let active = true

    setJobsLoading(true)
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        setAvailableJobs((json.data || []) as Job[])
      })
      .catch(() => {
        if (!active) return
        setAvailableJobs([])
      })
      .finally(() => {
        if (active) setJobsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function handleSourceModeChange(mode: JobSourceMode) {
    setJobSourceMode(mode)
    setJobDescription("")
    setCreatedJob(null)
    setSelectedJobId("")
    setError("")
    setNotice("")
  }

  function handleSelectExistingJob(jobId: string) {
    setSelectedJobId(jobId)
    setError("")
    const job = availableJobs.find((j) => j.id === jobId)
    if (job) {
      // Selecionar já aplica a vaga (sem clique extra de confirmação).
      setJobDescription(buildJobDescriptionFromJob(job))
      setCreatedJob(null)
      setNotice("Descricao preenchida a partir da vaga selecionada.")
    } else {
      setJobDescription("")
      setNotice("")
    }
  }

  function handleCreatedJob(job?: Job) {
    if (!job) return
    setCreatedJob(job)
    setJobDescription(buildJobDescriptionFromJob(job))
    setError("")
    setNotice("Vaga enviada para analise do admin e preparada para esta ferramenta.")
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError("")
    setNotice("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/minhas-mentorias/resume", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Erro ao enviar currículo")
      }

      setHasResume(true)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setNotice("Curriculo enviado com sucesso e definido como padrao.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar currículo")
    } finally {
      setUploading(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError("")
    setNotice("")
    setAnalysis(null)
    setAnswers({})
    setResults({})
    setExtraEvidence([])
    setExtraSkill("")
    setExtraAnswer("")
    setExtraResults("")

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao analisar currículo")
      }

      setAnalysis(data.analysis as ResumeAnalysis)
      setPhase("analysis")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar currículo")
    } finally {
      setAnalyzing(false)
    }
  }

  function questionKey(question: GapQuestion, index: number) {
    return `${index}::${question.skill}`
  }

  function addExtraEvidence() {
    if (!extraSkill.trim() || !extraAnswer.trim()) return
    setExtraEvidence((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        skill: extraSkill.trim(),
        answer: extraAnswer.trim(),
        results: extraResults.trim(),
      },
    ])
    setExtraSkill("")
    setExtraAnswer("")
    setExtraResults("")
  }

  function removeExtraEvidence(id: string) {
    setExtraEvidence((prev) => prev.filter((e) => e.id !== id))
  }

  function buildEvidenceAnswers(): {
    skill: string
    answer: string
    results?: string
  }[] {
    const fromQuestions = analysis
      ? analysis.questions
          .map((q, i) => ({
            skill: q.skill,
            answer: (answers[questionKey(q, i)] || "").trim(),
            results: (results[questionKey(q, i)] || "").trim() || undefined,
          }))
          .filter((e) => e.answer.length > 0)
      : []

    const fromExtras = extraEvidence.map((e) => ({
      skill: e.skill,
      answer: e.answer,
      results: e.results || undefined,
    }))

    return [...fromQuestions, ...fromExtras]
  }

  function addTrajectoryTopic() {
    if (!trajText.trim()) return
    setTrajectory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        year: trajYear.trim(),
        text: trajText.trim(),
      },
    ])
    setTrajYear("")
    setTrajText("")
  }

  function removeTrajectoryTopic(id: string) {
    setTrajectory((prev) => prev.filter((t) => t.id !== id))
  }

  function moveTrajectoryTopic(index: number, direction: -1 | 1) {
    setTrajectory((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError("")
    setNotice("")
    setResult(null)
    setOriginalResult(null)
    setEditingResume(false)
    setSuggestions([])
    setCompatibilityAfter(null)
    setRequirementsAfter(null)

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          requirements: analysis?.requirements ?? [],
          evidenceAnswers: buildEvidenceAnswers(),
          trajectory: trajectory.map(({ year, text }) => ({ year, text })),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar currículo")
      }

      setResult(data.markdown as string)
      setOriginalResult(data.markdown as string)
      setSuggestions(Array.isArray(data.suggestions) ? (data.suggestions as string[]) : [])
      setCompatibilityAfter(
        typeof data.compatibilityAfter === "number" ? data.compatibilityAfter : null,
      )
      setRequirementsAfter(
        Array.isArray(data.requirementsAfter)
          ? (data.requirementsAfter as RequirementItem[])
          : null,
      )
      setPhase("result")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar currículo")
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!result) return
    setDownloading(true)
    setError("")

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: result }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Erro ao gerar PDF")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "curriculo-otimizado.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PDF")
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar.")
    }
  }

  function handleRestart() {
    setPhase("input")
    setAnalysis(null)
    setAnswers({})
    setResults({})
    setExtraEvidence([])
    setExtraSkill("")
    setExtraAnswer("")
    setExtraResults("")
    setTrajectory([])
    setTrajYear("")
    setTrajText("")
    setResult(null)
    setOriginalResult(null)
    setEditingResume(false)
    setSuggestions([])
    setCompatibilityAfter(null)
    setRequirementsAfter(null)
    setError("")
  }

  const totalQuestions = analysis?.questions.length ?? 0
  const filledCount = analysis
    ? analysis.questions.filter(
        (q, i) => (answers[questionKey(q, i)] || "").trim().length > 0,
      ).length
    : 0

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <Link
            href="/minhas-mentorias/historico"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Minhas Mentorias
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Melhorar currículo com IA
          </h1>
          <p className="text-xs text-muted-foreground">Acesso via {email}</p>
        </header>

        {/* Steps indicator */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "input" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <FileText className="h-3 w-3" /> 1. Dados
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "analysis" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Search className="h-3 w-3" /> 2. Projetos
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "trajectory" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Route className="h-3 w-3" /> 3. Trajetória
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "result" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Sparkles className="h-3 w-3" /> 4. Resultado
          </span>
        </div>

        {/* Phase 1: Input */}
        {phase === "input" && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Seu currículo (PDF)
                  </span>
                </div>

                {hasResume ? (
                  <a
                    href="/api/minhas-mentorias/resume/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Ver curriculo padrao
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Você ainda não enviou um currículo. Envie um PDF para começar.
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      setError("")
                      setNotice("")
                      setFile(e.target.files?.[0] || null)
                    }}
                    className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:text-foreground"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!file || uploading}
                    onClick={handleUpload}
                    className="shrink-0"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">
                      {uploading ? "Enviando…" : hasResume ? "Adicionar" : "Enviar"}
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Tamanho máximo: 5MB</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Descrição da vaga
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSourceModeChange("existing")}
                    className={sourceButtonClass(jobSourceMode === "existing")}
                  >
                    <Search className="h-4 w-4" />
                    Vaga da plataforma
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSourceModeChange("new")}
                    className={sourceButtonClass(jobSourceMode === "new")}
                  >
                    <Briefcase className="h-4 w-4" />
                    Nova vaga
                  </button>
                </div>

                {jobSourceMode === "existing" ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3">
                    <div className="flex flex-col gap-1.5">
                      <Label>Escolha uma vaga aprovada</Label>
                      <Select
                        value={selectedJobId}
                        onValueChange={handleSelectExistingJob}
                        disabled={jobsLoading || availableJobs.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              jobsLoading ? "Carregando vagas..." : "Selecionar vaga"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableJobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.company ? `${job.title} - ${job.company}` : job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedJob && (
                      <div className="flex items-start gap-2 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{selectedJob.title}</p>
                          <p>
                            {selectedJob.company || "Empresa nao informada"}
                            {selectedJob.location ? ` - ${selectedJob.location}` : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    {availableJobs.length === 0 && !jobsLoading && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma vaga aprovada disponivel no momento. Cadastre uma nova
                        vaga para usar nesta analise.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Preencha os dados da nova vaga. Ela sera criada como pendente
                      para analise do admin e tambem usada nesta melhoria de curriculo.
                    </p>
                    <JobForm
                      submitEndpoint="/api/minhas-mentorias/resume/jobs"
                      categorySourceEndpoint="/api/jobs"
                      submitLabel="Salvar vaga e usar"
                      loadingLabel="Salvando vaga..."
                      successMessage="Vaga enviada para analise!"
                      successDescription="Ela ja esta pendente para o admin e pronta para orientar a melhoria do curriculo."
                      createAnotherLabel="Cadastrar outra vaga"
                      className="max-w-none"
                      onSuccess={handleCreatedJob}
                    />
                  </div>
                )}

                <Label htmlFor="job-description-for-analysis">
                  Descricao usada na analise
                </Label>
                <Textarea
                  id="job-description-for-analysis"
                  readOnly={!jobDescription}
                  value={jobDescription}
                  onChange={(e) => {
                    setError("")
                    setJobDescription(e.target.value)
                  }}
                  rows={7}
                  placeholder="Cole aqui a descrição completa da vaga (responsabilidades, requisitos, tecnologias…)."
                />
                <Button
                  type="button"
                  disabled={
                    !hasResume ||
                    analyzing ||
                    jobDescription.trim().length < 20 ||
                    (jobSourceMode === "new" && !createdJob)
                  }
                  onClick={handleAnalyze}
                  className="w-fit"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Search className="h-4 w-4 mr-1" />
                  )}
                  {analyzing ? "Analisando…" : "Analisar currículo"}
                </Button>
                {!hasResume && (
                  <p className="text-xs text-muted-foreground">
                    Envie um currículo acima para habilitar a análise.
                  </p>
                )}
                {jobSourceMode === "new" && !createdJob && (
                  <p className="text-xs text-muted-foreground">
                    Salve a nova vaga para que ela fique pendente de analise do admin.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Phase 2: Analysis + Project Questions */}
        {phase === "analysis" && analysis && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Requisitos da vaga e suas evidências
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Veja o que é essencial no dia a dia e o que é diferencial, e o
                    quanto seu currículo já comprova cada ponto. Reforce as lacunas
                    com fatos concretos para aumentar o match.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <CompatibilityMeter
                    label="Compatibilidade atual com a vaga"
                    score={analysis.compatibility}
                  />
                </div>

                <RequirementsPanel requirements={analysis.requirements} />

                {analysis.questions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-medium text-foreground">
                      Preencha as lacunas (evidência concreta para os pontos abaixo):
                    </p>
                    {analysis.questions.map((q, i) => (
                      <GapQuestionCard
                        key={questionKey(q, i)}
                        question={q}
                        answer={answers[questionKey(q, i)] || ""}
                        onAnswer={(v) =>
                          setAnswers((prev) => ({ ...prev, [questionKey(q, i)]: v }))
                        }
                        result={results[questionKey(q, i)] || ""}
                        onResult={(v) =>
                          setResults((prev) => ({ ...prev, [questionKey(q, i)]: v }))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sem lacunas essenciais a preencher — siga para a trajetória.
                  </p>
                )}

                {/* Evidências extras: citar projetos para diferenciais/skills que faltaram */}
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-card/30 p-3">
                  <p className="text-xs font-medium text-foreground">
                    Citar um projeto extra
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Faltou um diferencial ou uma skill acima? Adicione um projeto/atividade
                    real para reforçá-lo.
                  </p>
                  <Input
                    value={extraSkill}
                    onChange={(e) => setExtraSkill(e.target.value)}
                    placeholder="Skill / diferencial (ex.: ASP.NET)"
                    aria-label="Skill ou diferencial"
                  />
                  <Textarea
                    value={extraAnswer}
                    onChange={(e) => setExtraAnswer(e.target.value)}
                    rows={2}
                    placeholder="Projeto/atividade concreto onde você usou essa skill e as tecnologias."
                    className="text-sm"
                    aria-label="Projeto ou atividade"
                  />
                  <Textarea
                    value={extraResults}
                    onChange={(e) => setExtraResults(e.target.value)}
                    rows={2}
                    placeholder="Resultados/impacto (opcional): números, ganhos, o que melhorou."
                    className="text-sm"
                    aria-label="Resultados"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addExtraEvidence}
                    disabled={!extraSkill.trim() || !extraAnswer.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar evidência
                  </Button>

                  {extraEvidence.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {extraEvidence.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start gap-2 rounded-lg border border-border bg-card/50 p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {e.skill}
                            </span>
                            <span className="text-sm text-foreground">{e.answer}</span>
                            {e.results && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Resultados: {e.results}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExtraEvidence(e.id)}
                            aria-label="Remover evidência"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={
                      totalQuestions > 0 &&
                      filledCount === 0 &&
                      extraEvidence.length === 0
                    }
                    onClick={() => setPhase("trajectory")}
                    className="w-full sm:w-fit"
                  >
                    Avançar para trajetória
                    <ArrowDown className="ml-1 h-4 w-4 sm:hidden" />
                    <Route className="ml-1 hidden h-4 w-4 sm:inline" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRestart}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar
                  </Button>
                  {totalQuestions > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filledCount}/{totalQuestions} respondidas
                    </span>
                  )}
                </div>

                {totalQuestions > 0 &&
                  filledCount === 0 &&
                  extraEvidence.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Responda pelo menos uma lacuna ou cite um projeto extra para continuar.
                    </p>
                  )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Phase 3: Trajectory */}
        {phase === "trajectory" && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Route className="h-4 w-4 text-primary" />
                  Sua trajetória
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Em tópicos e em ordem cronológica, conte como você chegou até aqui.
                  A IA usa isso para escrever o &ldquo;Resumo&rdquo; (sobre) do seu currículo.
                </p>
              </div>

              {analysis && (
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <CompatibilityMeter
                    label="Compatibilidade atual com a vaga"
                    score={analysis.compatibility}
                  />
                </div>
              )}

              {/* Linha de adição */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={trajYear}
                  onChange={(e) => setTrajYear(e.target.value)}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="Ano"
                  aria-label="Ano"
                  className="sm:w-24"
                />
                <Input
                  value={trajText}
                  onChange={(e) => setTrajText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTrajectoryTopic()
                    }
                  }}
                  placeholder="Ex.: comecei a estudar programação por conta própria"
                  aria-label="Descrição do tópico"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTrajectoryTopic}
                  disabled={!trajText.trim()}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {/* Lista de tópicos */}
              {trajectory.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {trajectory.map((topic, index) => (
                    <li
                      key={topic.id}
                      className="flex items-start gap-2 rounded-lg border border-border bg-card/50 p-2.5"
                    >
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          onClick={() => moveTrajectoryTopic(index, -1)}
                          disabled={index === 0}
                          aria-label="Mover para cima"
                          className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTrajectoryTopic(index, 1)}
                          disabled={index === trajectory.length - 1}
                          aria-label="Mover para baixo"
                          className="flex h-5 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        {topic.year && (
                          <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {topic.year}
                          </span>
                        )}
                        <span className="text-sm text-foreground">{topic.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTrajectoryTopic(topic.id)}
                        aria-label="Remover tópico"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum tópico ainda. Adicione marcos da sua jornada (opcional, mas
                  deixa o &ldquo;Resumo&rdquo; bem mais forte).
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={generating}
                  onClick={handleGenerate}
                  className="w-full sm:w-fit"
                >
                  {generating ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  {generating ? "Gerando…" : "Gerar currículo otimizado"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase("analysis")}
                  disabled={generating}
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {notice && (
          <p className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 className="h-4 w-4" /> {notice}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Phase 3: Result */}
        {phase === "result" && result && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Currículo otimizado
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPhase("analysis")}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Revisar respostas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRestart}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Nova análise
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">{copied ? "Copiado" : "Copiar"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={downloading}
                    onClick={handleDownloadPdf}
                  >
                    {downloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">{downloading ? "Gerando…" : "Baixar PDF"}</span>
                  </Button>
                </div>
              </div>

              {analysis && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CompatibilityMeter label="Antes" score={analysis.compatibility} />
                    {compatibilityAfter !== null ? (
                      <CompatibilityMeter label="Depois" score={compatibilityAfter} />
                    ) : (
                      <p className="self-center text-xs text-muted-foreground">
                        Não foi possível calcular a compatibilidade depois desta vez.
                      </p>
                    )}
                  </div>
                  {compatibilityAfter !== null &&
                    (() => {
                      const delta = compatibilityAfter - analysis.compatibility
                      if (delta > 0) {
                        return (
                          <p className="mt-3 text-sm font-medium text-emerald-400">
                            ▲ +{delta} pontos — ganho real com as evidências que você forneceu.
                          </p>
                        )
                      }
                      return (
                        <p className="mt-3 text-xs text-muted-foreground">
                          O match não subiu porque ainda faltam evidências concretas
                          dos requisitos essenciais. A pontuação não é forçada: ela só
                          sobe com fatos reais.
                        </p>
                      )
                    })()}
                </div>
              )}

              {/* Cobertura por requisito e lacunas para chegar a 80% */}
              {(() => {
                const reqs = requirementsAfter ?? analysis?.requirements ?? []
                if (reqs.length === 0) return null
                const missingEssentials = reqs.filter(
                  (r) => r.kind === "essential" && r.evidence !== "strong",
                )
                const missingDifferentials = reqs.filter(
                  (r) => r.kind === "differential" && r.evidence !== "strong",
                )
                const score = compatibilityAfter ?? analysis?.compatibility ?? 0
                const showEssentials = score < 80 && missingEssentials.length > 0
                const showDifferentials = missingDifferentials.length > 0
                return (
                  <div className="flex flex-col gap-3">
                    <RequirementsPanel
                      requirements={reqs}
                      title="Cobertura do novo currículo"
                    />
                    {showEssentials && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="text-sm font-medium text-amber-300">
                          Para chegar a 80%, reforce com fatos concretos:
                        </p>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {missingEssentials.map((r) => (
                            <li
                              key={`miss-${r.skill}`}
                              className="text-xs text-muted-foreground"
                            >
                              • {r.skill}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {showDifferentials && (
                      <div className="rounded-lg border border-border bg-card/50 p-3">
                        <p className="text-sm font-medium text-foreground">
                          Diferenciais que podem te destacar:
                        </p>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {missingDifferentials.map((r) => (
                            <li
                              key={`diff-${r.skill}`}
                              className="text-xs text-muted-foreground"
                            >
                              • {r.skill}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Cite um projeto extra falando sobre esses pontos para somar
                          pontos com o gestor.
                        </p>
                      </div>
                    )}
                    {(showEssentials || showDifferentials) && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setPhase("analysis")}
                      >
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        Reforçar respostas e citar projetos
                      </Button>
                    )}
                  </div>
                )
              })()}

              {/* Sugestões — apenas em tela, fora do currículo baixado */}
              {suggestions.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Sugestões de melhoria
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Apenas em tela — não entram no currículo baixado.
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-primary">•</span>
                        <span className="flex-1">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Currículo — pré-visualização e edição */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {editingResume
                      ? "Editando — suas alterações serão copiadas e baixadas."
                      : "Pré-visualização do currículo"}
                  </span>
                  <div className="flex gap-2">
                    {editingResume && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={result === originalResult}
                        onClick={() => originalResult && setResult(originalResult)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Restaurar original
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingResume((v) => !v)}
                    >
                      {editingResume ? (
                        <>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Pré-visualizar
                        </>
                      ) : (
                        <>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {editingResume ? (
                  <Textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    rows={20}
                    className="font-mono text-xs leading-relaxed"
                    aria-label="Editar currículo em Markdown"
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-background/50 p-4">
                    <RenderedResume markdown={result} />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Revise com atenção: a IA pode cometer erros. Confira se todos os dados
                estão corretos antes de usar o currículo.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
