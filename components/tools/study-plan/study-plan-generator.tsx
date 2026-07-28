"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  Download,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { JobPicker, type PickedJob } from "@/components/tools/study-plan/job-picker"
import { cn } from "@/lib/utils"
import type {
  JobRequirementsPreview,
  NivelUsuario,
  StudyPlanData,
} from "@/lib/study-plan-xlsx/types"

type RequisitoPreview = JobRequirementsPreview["requisitos"][number]

const NIVEL_OPTIONS: { value: NivelUsuario; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "fluente", label: "Fluente" },
]

const EXAMPLE = `Desenvolvedor de Sistemas Jr — PHP/Laravel
FitBank / Fits — Fortaleza-CE — Presencial, período integral, PJ

Requisitos:
- PHP e Laravel
- MySQL
- JavaScript
- Git
- Docker (diferencial)
- Elasticsearch (diferencial)
- Testes automatizados (diferencial)

Sobre a vaga: buscamos alguém em início de carreira com fundamentos sólidos de lógica e vontade de aprender.`

type Status = "idle" | "extracting" | "assessing" | "analyzing" | "ready" | "error"

const STEPS = [
  "Analisando seus níveis",
  "Selecionando materiais de estudo",
  "Montando o plano semanal",
  "Preparando a planilha",
]

const MIN_CHARS = 40

export function StudyPlanGenerator() {
  const [jobDescription, setJobDescription] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [pickedTitle, setPickedTitle] = useState("")
  const [hoursPerWeek, setHoursPerWeek] = useState(15)
  const [candidateName, setCandidateName] = useState("")
  const [level, setLevel] = useState("auto")
  const [showOptions, setShowOptions] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [xlsxBase64, setXlsxBase64] = useState<string | null>(null)
  const [vagaPreview, setVagaPreview] = useState<JobRequirementsPreview["vaga"] | null>(null)
  const [requisitosPreview, setRequisitosPreview] = useState<RequisitoPreview[]>([])
  const [niveis, setNiveis] = useState<Record<string, NivelUsuario>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (status !== "analyzing") return
    setStepIdx(0)
    const iv = setInterval(() => {
      setStepIdx((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, 4000)
    return () => clearInterval(iv)
  }, [status])

  function handlePick(job: PickedJob) {
    setJobDescription(job.description)
    setJobUrl(job.jobUrl)
    setPickedTitle(job.title)
    if (job.level && ["internship", "junior", "mid", "senior"].includes(job.level)) {
      setLevel(job.level)
    }
    setError(null)
  }

  function clearPicked() {
    setJobUrl("")
    setPickedTitle("")
  }

  // Passo 1: extrai os requisitos da vaga para o usuário marcar o nível de cada um.
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (jobDescription.trim().length < MIN_CHARS) {
      setError(`Cole uma descrição de vaga com pelo menos ${MIN_CHARS} caracteres.`)
      setStatus("error")
      return
    }
    setError(null)
    setStatus("extracting")
    try {
      const res = await fetch("/api/tools/study-plan/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl || undefined,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível ler a vaga. Tente novamente.")
      }
      const preview = json as JobRequirementsPreview
      setVagaPreview(preview.vaga)
      setRequisitosPreview(preview.requisitos)
      setNiveis(
        Object.fromEntries(
          preview.requisitos.map((r) => [r.competencia, "iniciante" as NivelUsuario]),
        ),
      )
      setStatus("assessing")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ler a vaga.")
      setStatus("error")
    }
  }

  function setNivel(competencia: string, nivel: NivelUsuario) {
    setNiveis((prev) => ({ ...prev, [competencia]: nivel }))
  }

  function backToForm() {
    setStatus("idle")
    setError(null)
    setRequisitosPreview([])
    setVagaPreview(null)
    setNiveis({})
  }

  // Passo 2: gera o plano completo já com o nível marcado em cada requisito.
  async function handleGenerate() {
    setError(null)
    setStatus("analyzing")
    try {
      const niveisArr = requisitosPreview.map((r) => ({
        competencia: r.competencia,
        nivel: niveis[r.competencia] ?? ("iniciante" as NivelUsuario),
      }))
      const res = await fetch("/api/tools/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          hoursPerWeek,
          candidateName: candidateName.trim() || undefined,
          level: level !== "auto" ? level : undefined,
          jobUrl: jobUrl || undefined,
          niveis: niveisArr,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível gerar o plano. Tente novamente.")
      }
      setPlan(json.plan as StudyPlanData)
      setXlsxBase64(json.xlsxBase64 as string)
      setStatus("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o plano.")
      // Volta para a tela de avaliação para o usuário tentar de novo sem perder os níveis.
      setStatus("assessing")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit()
  }

  function downloadXlsx() {
    if (!xlsxBase64 || !plan) return
    const bin = atob(xlsxBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const slug =
      plan.vaga.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "plano-de-estudos"
    a.download = `plano-estudos-${slug}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setStatus("idle")
    setPlan(null)
    setXlsxBase64(null)
    setError(null)
    setJobDescription("")
    setVagaPreview(null)
    setRequisitosPreview([])
    setNiveis({})
    clearPicked()
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <Link
          href="/ferramentas"
          className="flex min-h-10 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ferramentas
        </Link>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Plano de estudos por vaga
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Cole uma vaga, receba seu plano de estudos.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Analisamos os requisitos e montamos uma planilha semana a semana, com
          projeto final e rotina — pronta para baixar em{" "}
          <span className="font-medium text-foreground">.xlsx</span>.
        </p>
      </div>

      {status === "ready" && plan ? (
        <ReadyView plan={plan} onDownload={downloadXlsx} onReset={reset} />
      ) : status === "analyzing" ? (
        <AnalyzingCard stepIdx={stepIdx} />
      ) : status === "assessing" ? (
        <AssessView
          vaga={vagaPreview}
          requisitos={requisitosPreview}
          niveis={niveis}
          onChangeNivel={setNivel}
          onBack={backToForm}
          onGenerate={handleGenerate}
          error={error}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="job">Descrição da vaga</Label>
              <JobPicker onPick={handlePick} />
            </div>

            {pickedTitle && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  Vaga: {pickedTitle}
                  {jobUrl && <span className="text-muted-foreground">· link anexado</span>}
                  <button
                    type="button"
                    onClick={clearPicked}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                    aria-label="Remover vaga selecionada"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              id="job"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === "extracting"}
              placeholder="Cole aqui o texto completo da vaga (requisitos, tecnologias, senioridade, empresa, local…) ou escolha uma vaga da plataforma."
              rows={10}
              className="resize-y leading-relaxed"
              aria-describedby="job-help"
            />
            <div
              id="job-help"
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{jobDescription.length} caracteres</span>
              <button
                type="button"
                onClick={() => setJobDescription(EXAMPLE)}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Ver exemplo
              </button>
            </div>
          </div>

          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={`h-4 w-4 transition ${showOptions ? "rotate-180" : ""}`}
                />
                Ajustar detalhes (opcional)
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-xs text-muted-foreground">
                    Seu nome (opcional)
                  </Label>
                  <Input
                    id="name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Aparece no plano"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="level" className="text-xs text-muted-foreground">
                    Nível-alvo
                  </Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (inferir da vaga)</SelectItem>
                      <SelectItem value="internship">Estágio / Trainee</SelectItem>
                      <SelectItem value="junior">Júnior</SelectItem>
                      <SelectItem value="mid">Pleno</SelectItem>
                      <SelectItem value="senior">Sênior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="hours" className="text-xs text-muted-foreground">
                    Horas disponíveis por semana:{" "}
                    <span className="font-semibold text-foreground">{hoursPerWeek}h</span>
                  </Label>
                  <Slider
                    id="hours"
                    min={5}
                    max={40}
                    step={1}
                    value={[hoursPerWeek]}
                    onValueChange={([v]) => setHoursPerWeek(v)}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5h</span>
                    <span>15h (padrão)</span>
                    <span>40h</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && status === "error" && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              size="lg"
              disabled={status === "extracting" || jobDescription.trim().length < MIN_CHARS}
              className="w-full gap-2 sm:w-auto"
            >
              {status === "extracting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lendo a vaga…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar requisitos
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Próximo passo: você marca seu nível em cada requisito antes de gerar o
              plano. Dica:{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                ⌘/Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                Enter
              </kbd>
              .
            </p>
          </div>

          {status === "extracting" && (
            <div
              aria-live="polite"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground"
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
              Lendo a vaga e extraindo os requisitos…
            </div>
          )}
        </form>
      )}
    </main>
  )
}

function AnalyzingCard({ stepIdx }: { stepIdx: number }) {
  return (
    <div aria-live="polite" className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 text-sm font-medium text-foreground">Montando seu plano com IA…</p>
      <ol className="flex flex-col gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {i < stepIdx ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                ✓
              </span>
            ) : i === stepIdx ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <span className="h-5 w-5 rounded-full border border-border" />
            )}
            <span className={i <= stepIdx ? "text-foreground" : "text-muted-foreground"}>
              {s}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Isso costuma levar entre 15 e 40 segundos.
      </p>
    </div>
  )
}

function NivelToggle({
  value,
  onChange,
}: {
  value: NivelUsuario
  onChange: (n: NivelUsuario) => void
}) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-border bg-background p-0.5">
      {NIVEL_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AssessView({
  vaga,
  requisitos,
  niveis,
  onChangeNivel,
  onBack,
  onGenerate,
  error,
}: {
  vaga: JobRequirementsPreview["vaga"] | null
  requisitos: RequisitoPreview[]
  niveis: Record<string, NivelUsuario>
  onChangeNivel: (competencia: string, nivel: NivelUsuario) => void
  onBack: () => void
  onGenerate: () => void
  error: string | null
}) {
  const obrigatorios = requisitos.filter((r) => r.tipo === "Obrigatório")
  const outros = requisitos.filter((r) => r.tipo !== "Obrigatório")

  function Group({ title, items }: { title: string; items: RequisitoPreview[] }) {
    if (items.length === 0) return null
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {title} ({items.length})
          </h3>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((r) => (
              <li
                key={r.competencia}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-foreground">{r.competencia}</span>
                <NivelToggle
                  value={niveis[r.competencia] ?? "iniciante"}
                  onChange={(n) => onChangeNivel(r.competencia, n)}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Requisitos identificados
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {vaga?.titulo || "Vaga"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque seu nível em cada requisito. A IA usa isso para calibrar a
            profundidade do plano — mais fundamentos onde você é iniciante, revisão
            rápida onde já é fluente.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Group title="Requisitos obrigatórios" items={obrigatorios} />
      <Group title="Diferenciais e bônus" items={outros} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={onGenerate} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Gerar plano de estudos
        </Button>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Button>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
        {children}
      </CardContent>
    </Card>
  )
}

function ReadyView({
  plan,
  onDownload,
  onReset,
}: {
  plan: StudyPlanData
  onDownload: () => void
  onReset: () => void
}) {
  const obrigatorios = plan.requisitos.filter((r) => r.tipo === "Obrigatório")
  const diferenciais = plan.requisitos.filter((r) => r.tipo !== "Obrigatório")
  const materiais = plan.requisitos.flatMap((r) =>
    r.recursos.map((rec) => ({ competencia: r.competencia, ...rec })),
  )
  const totalRecursos = materiais.length

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Plano pronto
          </div>
          <h2 className="text-xl font-semibold text-foreground">{plan.vaga.titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[plan.vaga.empresa, plan.vaga.local, plan.vaga.modelo]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<Calendar className="h-4 w-4" />}
              label="Semanas"
              value={plan.indicadores.semanas}
            />
            <Stat
              icon={<BookOpen className="h-4 w-4" />}
              label="Carga total"
              value={`${plan.indicadores.cargaTotalHoras}h`}
            />
            <Stat
              icon={<Target className="h-4 w-4" />}
              label="Requisitos"
              value={plan.requisitos.length}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar planilha (.xlsx)
            </Button>
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Gerar outro
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <PreviewCard title={`Requisitos obrigatórios (${obrigatorios.length})`}>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground">
            {obrigatorios.slice(0, 8).map((r) => (
              <li key={r.competencia} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{r.competencia}</span>
                {r.nivelUsuario && <NivelBadge nivel={r.nivelUsuario} />}
              </li>
            ))}
            {obrigatorios.length === 0 && (
              <li className="text-muted-foreground">Nenhum requisito obrigatório identificado.</li>
            )}
          </ul>
        </PreviewCard>
        <PreviewCard title={`Diferenciais e bônus (${diferenciais.length})`}>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {diferenciais.slice(0, 8).map((r) => (
              <li key={r.competencia} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                <span>{r.competencia}</span>
                {r.nivelUsuario && <NivelBadge nivel={r.nivelUsuario} />}
              </li>
            ))}
            {diferenciais.length === 0 && <li>Nenhum diferencial identificado.</li>}
          </ul>
        </PreviewCard>
      </div>

      <PreviewCard title="Primeiras semanas">
        <ol className="flex flex-col gap-2 text-sm">
          {plan.planoSemanal.slice(0, 5).map((w) => (
            <li key={w.semana} className="flex gap-3">
              <span className="w-8 shrink-0 font-semibold text-muted-foreground">
                S{w.semana}
              </span>
              <span className="text-foreground">
                <span className="font-medium">{w.foco || w.etapa}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {w.horas}h · {w.etapa}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          A planilha traz todas as {plan.indicadores.semanas} semanas com detalhes,
          entregáveis e colunas de progresso.
        </p>
      </PreviewCard>

      {materiais.length > 0 && (
        <PreviewCard title={`Materiais de estudo (${totalRecursos})`}>
          <ul className="flex flex-col gap-2 text-sm">
            {materiais.slice(0, 6).map((m, i) => (
              <li key={`${m.competencia}-${i}`} className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {m.tipo}
                </span>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {m.titulo}
                </a>
                <span className="text-xs text-muted-foreground">· {m.competencia}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            A aba <span className="font-medium text-foreground">Materiais de estudo</span> da
            planilha traz todos os {totalRecursos} materiais com links de busca por
            competência.
          </p>
        </PreviewCard>
      )}
    </div>
  )
}

const NIVEL_BADGE_LABEL: Record<NivelUsuario, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  fluente: "Fluente",
}

function NivelBadge({ nivel }: { nivel: NivelUsuario }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
      {NIVEL_BADGE_LABEL[nivel]}
    </span>
  )
}
