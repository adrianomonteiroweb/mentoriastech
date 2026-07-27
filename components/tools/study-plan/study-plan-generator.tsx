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
import type { StudyPlanData } from "@/lib/study-plan-xlsx/types"

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

type Status = "idle" | "analyzing" | "ready" | "error"

const STEPS = [
  "Lendo a descrição da vaga",
  "Extraindo requisitos",
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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (jobDescription.trim().length < MIN_CHARS) {
      setError(`Cole uma descrição de vaga com pelo menos ${MIN_CHARS} caracteres.`)
      setStatus("error")
      return
    }
    setError(null)
    setStatus("analyzing")
    try {
      const res = await fetch("/api/tools/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          hoursPerWeek,
          candidateName: candidateName.trim() || undefined,
          level: level !== "auto" ? level : undefined,
          jobUrl: jobUrl || undefined,
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
      setStatus("error")
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
              disabled={status === "analyzing"}
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
              disabled={status === "analyzing" || jobDescription.trim().length < MIN_CHARS}
              className="w-full gap-2 sm:w-auto"
            >
              {status === "analyzing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar plano de estudos
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Dica:{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                ⌘/Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                Enter
              </kbd>{" "}
              para gerar.
            </p>
          </div>

          {status === "analyzing" && (
            <div
              aria-live="polite"
              className="rounded-lg border border-border bg-card p-5"
            >
              <p className="mb-3 text-sm font-medium text-foreground">Analisando com IA…</p>
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
          )}
        </form>
      )}
    </main>
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
                {r.competencia}
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
                {r.competencia}
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
    </div>
  )
}
