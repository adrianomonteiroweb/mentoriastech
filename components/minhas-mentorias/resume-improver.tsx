"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Upload,
} from "lucide-react"
import { JobForm } from "@/components/dashboard/hr/job-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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

interface AnalysisItem {
  title: string
  where: string
  period: string
  relevance: string
  question: string
}

interface ResumeAnalysis {
  experiences: AnalysisItem[]
  formations: AnalysisItem[]
  hasExperience: boolean
}

interface ProjectAnswer {
  title: string
  where: string
  answer: string
}

type Phase = "input" | "analysis" | "result"
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

function AnalysisCard({
  item,
  type,
  answer,
  onAnswer,
}: {
  item: AnalysisItem
  type: "experience" | "formation"
  answer: string
  onAnswer: (value: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
          {type === "experience" ? "Experiência" : "Formação"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.where} · {item.period}
          </p>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground italic">
        {item.relevance}
      </p>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        <MessageSquare className="mr-1 inline h-3.5 w-3.5 text-primary" />
        {item.question}
      </label>
      <Textarea
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        rows={3}
        placeholder="Descreva projetos, tecnologias utilizadas, resultados alcançados..."
        className="text-sm"
      />
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

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
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

  function handleUseExistingJob() {
    if (!selectedJob) return
    setJobDescription(buildJobDescriptionFromJob(selectedJob))
    setCreatedJob(null)
    setError("")
    setNotice("Descricao copiada da vaga selecionada.")
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
      setNotice("Currículo enviado com sucesso!")
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

  function allItems(): AnalysisItem[] {
    if (!analysis) return []
    return [...analysis.experiences, ...analysis.formations]
  }

  function answerKey(item: AnalysisItem) {
    return `${item.title}::${item.where}`
  }

  function buildProjectAnswers(): ProjectAnswer[] {
    return allItems()
      .filter((item) => (answers[answerKey(item)] || "").trim().length > 0)
      .map((item) => ({
        title: item.title,
        where: item.where,
        answer: answers[answerKey(item)].trim(),
      }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError("")
    setNotice("")
    setResult(null)

    try {
      const res = await fetch("/api/minhas-mentorias/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          projectAnswers: buildProjectAnswers(),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar currículo")
      }

      setResult(data.markdown as string)
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
    setResult(null)
    setError("")
  }

  const filledCount = allItems().filter(
    (item) => (answers[answerKey(item)] || "").trim().length > 0,
  ).length

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
        <div className="flex items-center gap-2 text-xs">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "input" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <FileText className="h-3 w-3" /> 1. Dados
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "analysis" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Search className="h-3 w-3" /> 2. Projetos
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "result" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Sparkles className="h-3 w-3" /> 3. Resultado
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
                    Ver currículo atual
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
                      {uploading ? "Enviando…" : hasResume ? "Substituir" : "Enviar"}
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
                        onValueChange={(value) => {
                          setSelectedJobId(value)
                          setJobDescription("")
                          setNotice("")
                          setError("")
                        }}
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

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedJob}
                      onClick={handleUseExistingJob}
                      className="w-fit"
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Usar esta vaga
                    </Button>
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
                    Identificamos o que mais combina com a vaga
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analysis.hasExperience
                      ? "Conte-nos sobre projetos que você realizou nessas experiências e formações. Quanto mais detalhes, melhor ficará o currículo."
                      : "Você ainda está no início da carreira — foque em projetos práticos, exercícios, trabalhos acadêmicos ou projetos pessoais que demonstrem suas habilidades."}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {analysis.experiences.map((item, i) => (
                    <AnalysisCard
                      key={`exp-${i}`}
                      item={item}
                      type="experience"
                      answer={answers[answerKey(item)] || ""}
                      onAnswer={(v) =>
                        setAnswers((prev) => ({ ...prev, [answerKey(item)]: v }))
                      }
                    />
                  ))}
                  {analysis.formations.map((item, i) => (
                    <AnalysisCard
                      key={`form-${i}`}
                      item={item}
                      type="formation"
                      answer={answers[answerKey(item)] || ""}
                      onAnswer={(v) =>
                        setAnswers((prev) => ({ ...prev, [answerKey(item)]: v }))
                      }
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={generating || filledCount === 0}
                    onClick={handleGenerate}
                    className="w-fit"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {generating ? "Gerando…" : "Gerar currículo otimizado"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRestart}
                    disabled={generating}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {filledCount}/{allItems().length} respondidas
                  </span>
                </div>

                {filledCount === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Responda pelo menos uma pergunta para gerar o currículo.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
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
                <div className="flex gap-2">
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

              <div className="rounded-lg border border-border bg-background/50 p-4">
                <RenderedResume markdown={result} />
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
