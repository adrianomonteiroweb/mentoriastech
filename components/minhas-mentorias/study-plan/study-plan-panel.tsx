"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { parseResumeMarkdown, type ResumeBlock } from "@/lib/resume/markdown-blocks"

interface Props {
  email: string
}

interface Opportunity {
  id: string
  title: string | null
  company_name: string | null
  description: string | null
}

interface ProgressItem {
  id: string
  label: string
  checked: boolean
}

interface StudyPlan {
  id: string
  title: string | null
  role_type: string | null
  stack: string | null
  seniority: string | null
  languages: string[]
  frameworks: string[]
  minutes_per_day: number
  plan_markdown: string | null
  progress: ProgressItem[]
  status: string
  created_at: string
}

const ROLE_TYPES = [
  { value: "Desenvolvedor(a)", label: "Desenvolvedor(a)" },
  { value: "Engenheiro(a) de Software", label: "Engenheiro(a)" },
  { value: "Analista", label: "Analista" },
  { value: "Tech Lead", label: "Tech Lead" },
  { value: "Outro", label: "Outro" },
]
const STACKS = [
  { value: "fullstack", label: "Full Stack" },
  { value: "backend", label: "Back-end" },
  { value: "frontend", label: "Front-end" },
  { value: "mobile", label: "Mobile" },
  { value: "data", label: "Dados" },
  { value: "devops", label: "DevOps" },
  { value: "outro", label: "Outro" },
]
const SENIORITIES = [
  { value: "internship", label: "Estágio" },
  { value: "trainee", label: "Trainee" },
  { value: "junior", label: "Júnior" },
  { value: "mid", label: "Pleno" },
  { value: "senior", label: "Sênior" },
]

function RenderedMarkdown({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown)
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block: ResumeBlock, i) => {
        switch (block.type) {
          case "h1":
            return <h2 key={i} className="text-xl font-semibold text-foreground">{block.text}</h2>
          case "h2":
            return <h3 key={i} className="mt-3 border-b border-primary/40 pb-1 text-xs font-semibold uppercase tracking-wider text-primary">{block.text}</h3>
          case "h3":
            return <h4 key={i} className="mt-2 text-sm font-semibold text-foreground">{block.text}</h4>
          case "bullet":
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm text-foreground">
                <span className="text-primary">•</span>
                <span className="flex-1">{block.text}</span>
              </div>
            )
          default:
            return <p key={i} className="text-sm leading-relaxed text-foreground">{block.text}</p>
        }
      })}
    </div>
  )
}

/** Botão de seleção única acessível (aria-pressed, alvo ≥44px). */
function ToggleGroup({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : opt.value)}
              className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground hover:border-primary/60"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Entrada de tags (linguagens/frameworks) com chips removíveis. */
function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  function add() {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft("")
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {v}
              <button type="button" aria-label={`Remover ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type Phase = "list" | "wizard" | "view"

const STEP_LABELS = ["Vaga", "Posição-alvo", "Diagnóstico", "Foco diário"]

export function StudyPlanPanel({ email }: Props) {
  const [phase, setPhase] = useState<Phase>("list")
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [error, setError] = useState("")

  // Wizard state
  const [step, setStep] = useState(0)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [roleType, setRoleType] = useState("")
  const [stack, setStack] = useState("")
  const [seniority, setSeniority] = useState("")
  const [languages, setLanguages] = useState<string[]>([])
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [strengths, setStrengths] = useState("")
  const [weaknesses, setWeaknesses] = useState("")
  const [experience, setExperience] = useState("")
  const [minutesPerDay, setMinutesPerDay] = useState(30)
  const [generating, setGenerating] = useState(false)

  // New job inline form
  const [showNewJob, setShowNewJob] = useState(false)
  const [njCompany, setNjCompany] = useState("")
  const [njLinkedin, setNjLinkedin] = useState("")
  const [njTitle, setNjTitle] = useState("")
  const [njDesc, setNjDesc] = useState("")
  const [savingJob, setSavingJob] = useState(false)

  // View state
  const [active, setActive] = useState<StudyPlan | null>(null)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  function loadPlans() {
    setLoadingPlans(true)
    fetch("/api/minhas-mentorias/study-plans")
      .then((r) => r.json())
      .then((json) => setPlans(json.data || []))
      .catch(() => setError("Erro ao carregar seus planos."))
      .finally(() => setLoadingPlans(false))
  }

  function loadOpportunities() {
    fetch("/api/minhas-mentorias/opportunities")
      .then((r) => r.json())
      .then((json) => setOpportunities(json.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadPlans()
    loadOpportunities()
  }, [])

  function resetWizard() {
    setStep(0)
    setSelectedJobs([])
    setRoleType("")
    setStack("")
    setSeniority("")
    setLanguages([])
    setFrameworks([])
    setStrengths("")
    setWeaknesses("")
    setExperience("")
    setMinutesPerDay(30)
    setShowNewJob(false)
    setError("")
  }

  function startWizard() {
    resetWizard()
    setPhase("wizard")
  }

  async function saveNewJob() {
    if (!njCompany.trim() || !njLinkedin.trim()) return
    setSavingJob(true)
    setError("")
    try {
      const res = await fetch("/api/minhas-mentorias/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: njCompany,
          company_linkedin_url: njLinkedin,
          title: njTitle,
          description: njDesc,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "Erro ao adicionar vaga")
      const created: Opportunity = json.data
      setOpportunities((prev) => [created, ...prev])
      setSelectedJobs((prev) => [...prev, created.id])
      setShowNewJob(false)
      setNjCompany(""); setNjLinkedin(""); setNjTitle(""); setNjDesc("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar vaga")
    } finally {
      setSavingJob(false)
    }
  }

  function canAdvance() {
    if (step === 1) return roleType.trim().length > 0
    return true
  }

  async function generate() {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/minhas-mentorias/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_type: roleType,
          stack: stack || undefined,
          seniority: seniority || undefined,
          languages,
          frameworks,
          strengths,
          weaknesses,
          experience,
          minutes_per_day: minutesPerDay,
          linked_opportunity_ids: selectedJobs,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "Erro ao gerar o plano de estudos")
      setActive(json.data)
      setPlans((prev) => [json.data, ...prev])
      setPhase("view")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o plano")
    } finally {
      setGenerating(false)
    }
  }

  async function toggleProgress(itemId: string) {
    if (!active) return
    const next = active.progress.map((p) => (p.id === itemId ? { ...p, checked: !p.checked } : p))
    setActive({ ...active, progress: next })
    await fetch(`/api/minhas-mentorias/study-plans/${active.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: next }),
    })
    setPlans((prev) => prev.map((p) => (p.id === active.id ? { ...p, progress: next } : p)))
  }

  async function regenerate() {
    if (!active) return
    setRegenerating(true)
    setError("")
    try {
      const res = await fetch(`/api/minhas-mentorias/study-plans/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || "Erro ao regenerar")
      setActive(json.data)
      setPlans((prev) => prev.map((p) => (p.id === json.data.id ? json.data : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao regenerar")
    } finally {
      setRegenerating(false)
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Remover este plano de estudos?")) return
    await fetch(`/api/minhas-mentorias/study-plans/${id}`, { method: "DELETE" })
    setPlans((prev) => prev.filter((p) => p.id !== id))
    if (active?.id === id) { setActive(null); setPhase("list") }
  }

  async function copyPlan() {
    if (!active?.plan_markdown) return
    try {
      await navigator.clipboard.writeText(active.plan_markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar.")
    }
  }

  function openPlan(plan: StudyPlan) {
    setActive(plan)
    setCopied(false)
    setPhase("view")
  }

  const progressPct = active && active.progress.length > 0
    ? Math.round((active.progress.filter((p) => p.checked).length / active.progress.length) * 100)
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
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            Plano de Estudos
          </h1>
          <p className="text-xs text-muted-foreground">Acesso via {email}</p>
        </header>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        {/* ---------------- LIST ---------------- */}
        {phase === "list" && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Crie um plano focado na sua próxima vaga</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A IA monta um cronograma realista respeitando seus minutos por dia.
                  </p>
                </div>
                <Button onClick={startWizard} className="min-h-11 shrink-0">
                  <Plus className="mr-1 h-4 w-4" /> Novo plano
                </Button>
              </CardContent>
            </Card>

            {loadingPlans ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Você ainda não criou nenhum plano de estudos.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((plan) => {
                  const total = plan.progress?.length || 0
                  const done = plan.progress?.filter((p) => p.checked).length || 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <Card key={plan.id}>
                      <CardContent className="flex flex-col gap-3 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <button onClick={() => openPlan(plan)} className="flex-1 text-left">
                            <p className="font-medium text-foreground">{plan.title || plan.role_type}</p>
                            <p className="text-xs text-muted-foreground">{plan.minutes_per_day} min/dia</p>
                          </button>
                          <Button variant="ghost" size="sm" onClick={() => deletePlan(plan.id)} aria-label="Remover plano">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2" />
                            <span className="shrink-0 text-xs text-muted-foreground">{done}/{total}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ---------------- WIZARD ---------------- */}
        {phase === "wizard" && (
          <>
            {/* progress indicator */}
            <div className="flex items-center gap-1.5" aria-label={`Passo ${step + 1} de ${STEP_LABELS.length}`}>
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-1 flex-col gap-1">
                  <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
                  <span className={`text-[10px] ${i === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{label}</span>
                </div>
              ))}
            </div>

            <Card>
              <CardContent className="flex flex-col gap-5 py-5">
                {/* STEP 0 — Vagas */}
                {step === 0 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Para qual vaga você quer se preparar?</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Selecione uma ou mais oportunidades, ou adicione uma nova. (Opcional — você pode seguir sem vaga.)</p>
                    </div>
                    {opportunities.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {opportunities.map((op) => {
                          const checked = selectedJobs.includes(op.id)
                          return (
                            <label
                              key={op.id}
                              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setSelectedJobs((prev) => checked ? prev.filter((x) => x !== op.id) : [...prev, op.id])
                                }
                              />
                              <span className="flex-1 text-sm text-foreground">
                                <span className="font-medium">{op.title || "Vaga"}</span>
                                {op.company_name ? <span className="text-muted-foreground"> · {op.company_name}</span> : null}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {showNewJob ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                        <input value={njCompany} onChange={(e) => setNjCompany(e.target.value)} placeholder="Empresa *" className="min-h-11 rounded-lg border border-border bg-secondary px-3 py-2 text-sm" />
                        <input value={njLinkedin} onChange={(e) => setNjLinkedin(e.target.value)} placeholder="LinkedIn da empresa *" className="min-h-11 rounded-lg border border-border bg-secondary px-3 py-2 text-sm" />
                        <input value={njTitle} onChange={(e) => setNjTitle(e.target.value)} placeholder="Título da vaga" className="min-h-11 rounded-lg border border-border bg-secondary px-3 py-2 text-sm" />
                        <Textarea value={njDesc} onChange={(e) => setNjDesc(e.target.value)} rows={3} placeholder="Descrição / requisitos da vaga" className="text-sm" />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={saveNewJob} disabled={savingJob || !njCompany.trim() || !njLinkedin.trim()}>
                            {savingJob ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar vaga"}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewJob(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShowNewJob(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Adicionar nova vaga
                      </Button>
                    )}
                  </div>
                )}

                {/* STEP 1 — Posição-alvo */}
                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-primary" /> Qual é a sua posição-alvo?</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Combine as opções que descrevem a próxima posição que você busca.</p>
                    </div>
                    <ToggleGroup legend="Cargo" options={ROLE_TYPES} value={roleType} onChange={setRoleType} />
                    <ToggleGroup legend="Área" options={STACKS} value={stack} onChange={setStack} />
                    <ToggleGroup legend="Nível" options={SENIORITIES} value={seniority} onChange={setSeniority} />
                    <TagInput label="Linguagens (opcional)" placeholder="Ex: TypeScript — Enter para adicionar" values={languages} onChange={setLanguages} />
                    <TagInput label="Frameworks / tecnologias (opcional)" placeholder="Ex: React — Enter para adicionar" values={frameworks} onChange={setFrameworks} />
                  </div>
                )}

                {/* STEP 2 — Diagnóstico */}
                {step === 2 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Onde você está hoje?</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Isso ajuda a IA a calibrar o ponto de partida do plano.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="sp-strengths" className="text-sm font-medium text-foreground">Seus pontos fortes para essa vaga</label>
                      <Textarea id="sp-strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} placeholder='Ex: "Tenho boa lógica e já fiz vários projetos com JavaScript."' className="text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="sp-weak" className="text-sm font-medium text-foreground">Seus pontos fracos / lacunas</label>
                      <Textarea id="sp-weak" value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={3} placeholder='Ex: "Nunca trabalhei com testes automatizados nem com bancos SQL."' className="text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="sp-exp" className="text-sm font-medium text-foreground">Atividades e projetos que já fez (relacionados)</label>
                      <Textarea id="sp-exp" value={experience} onChange={(e) => setExperience(e.target.value)} rows={3} placeholder='Ex: "Criei um app de lista de tarefas com React e uma API em Node."' className="text-sm" />
                    </div>
                  </div>
                )}

                {/* STEP 3 — Minutos/dia */}
                {step === 3 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Quanto tempo por dia você pode estudar?</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Minutos <strong className="text-foreground">focados e com intensidade</strong> valem mais que horas com distração. Seja realista — o plano vai respeitar este tempo.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="text-center">
                        <span className="text-3xl font-bold text-primary">{minutesPerDay}</span>
                        <span className="ml-1 text-sm text-muted-foreground">min/dia</span>
                      </div>
                      <Slider
                        value={[minutesPerDay]}
                        min={10}
                        max={180}
                        step={5}
                        onValueChange={(v) => setMinutesPerDay(v[0])}
                        aria-label="Minutos por dia"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10 min</span>
                        <span>180 min</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* navigation */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => (step === 0 ? setPhase("list") : setStep((s) => s - 1))}
                    disabled={generating}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                  </Button>
                  {step < STEP_LABELS.length - 1 ? (
                    <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="min-h-11">
                      Próximo <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={generate} disabled={generating || !roleType} className="min-h-11">
                      {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                      {generating ? "Gerando plano…" : "Gerar plano com IA"}
                    </Button>
                  )}
                </div>
                {step === 1 && !roleType && (
                  <p className="text-xs text-muted-foreground">Selecione ao menos o cargo para continuar.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ---------------- VIEW ---------------- */}
        {phase === "view" && active && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setActive(null); setPhase("list") }}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Meus planos
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyPlan}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1">{copied ? "Copiado" : "Copiar"}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="ml-1">Regenerar</span>
                </Button>
              </div>
            </div>

            {active.progress.length > 0 && (
              <Card>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Seu progresso</span>
                    <span className="text-xs text-muted-foreground">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <div className="flex flex-col gap-1.5">
                    {active.progress.map((item) => (
                      <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 py-1 hover:bg-secondary/40">
                        <Checkbox checked={item.checked} onCheckedChange={() => toggleProgress(item.id)} />
                        <span className={`flex-1 text-sm ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="py-4">
                {active.plan_markdown
                  ? <RenderedMarkdown markdown={active.plan_markdown} />
                  : <p className="text-sm text-muted-foreground">Plano vazio.</p>}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Revise com atenção: a IA pode cometer erros. Ajuste o plano ao seu contexto antes de seguir.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
