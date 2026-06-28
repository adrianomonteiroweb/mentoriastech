"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Info,
  Linkedin,
  Loader2,
  MinusCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  TrajectoryCapture,
  type TrajectoryTopic,
} from "@/components/minhas-mentorias/trajectory-capture";
import {
  parseResumeMarkdown,
  type ResumeBlock,
} from "@/lib/resume/markdown-blocks";
import {
  sortBySeverity,
  type ChecklistSeverity,
  type ChecklistStatus,
  type LinkedInChecklistItem,
} from "@/lib/linkedin/checklist";

interface Props {
  email: string;
  initialHasLinkedinPdf: boolean;
}

type Phase = "upload" | "positioning" | "result";

interface PositioningData {
  careerGoal: string;
  profileLanguage: string;
  recommendations: string;
  publishingFrequency: string;
  connections: string;
  mainSkills: string;
}

interface ChecklistResult {
  score: number;
  checklist: LinkedInChecklistItem[];
}

const SEVERITY_META: Record<
  ChecklistSeverity,
  { label: string; accent: string; badge: string }
> = {
  critical: {
    label: "Crítico",
    accent: "border-l-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  important: {
    label: "Importante",
    accent: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-400",
  },
  bonus: {
    label: "Bônus",
    accent: "border-l-border",
    badge: "bg-secondary text-muted-foreground",
  },
};

const STATUS_META: Record<
  ChecklistStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ok: { label: "OK", className: "text-emerald-400", icon: CheckCircle2 },
  partial: { label: "Parcial", className: "text-amber-400", icon: MinusCircle },
  missing: { label: "Falta", className: "text-destructive", icon: AlertCircle },
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-destructive";
}

function ScoreMeter({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>
          {score}%
        </span>
      </div>
      <Progress value={score} />
    </div>
  );
}

function RenderedMarkdown({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown);

  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block: ResumeBlock, i) => {
        switch (block.type) {
          case "h1":
            return (
              <h2 key={i} className="text-base font-semibold text-foreground">
                {block.text}
              </h2>
            );
          case "h2":
          case "h3":
            return (
              <h4 key={i} className="mt-1 text-sm font-semibold text-foreground">
                {block.text}
              </h4>
            );
          case "bullet":
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm text-foreground">
                <span className="text-primary">•</span>
                <span className="flex-1">{block.text}</span>
              </div>
            );
          default:
            return (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}

function ChecklistView({ items }: { items: LinkedInChecklistItem[] }) {
  const ordered = sortBySeverity(items);
  return (
    <div className="flex flex-col gap-3">
      {ordered.map((item) => {
        const severity = SEVERITY_META[item.severity];
        const status = STATUS_META[item.status];
        const StatusIcon = status.icon;
        return (
          <div
            key={item.id}
            className={`flex flex-col gap-2 rounded-lg border border-l-4 border-border bg-background/50 p-3 ${severity.accent}`}
          >
            <div className="flex items-start gap-2">
              <StatusIcon
                className={`mt-0.5 h-4 w-4 shrink-0 ${status.className}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${severity.badge}`}
                  >
                    {severity.label}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {item.section}
                  </span>
                </div>
              </div>
            </div>
            {item.recommendation && (
              <div className="pl-6">
                <RenderedMarkdown markdown={item.recommendation} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SeverityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Crítico
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Importante
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" /> Bônus
      </span>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const DISCLAIMER =
  "Tudo isso são recomendações — não são regras nem fórmula de sucesso. Adapte cada sugestão ao seu contexto e ao seu momento de carreira.";

export function LinkedInImprover({ email, initialHasLinkedinPdf }: Props) {
  const [hasLinkedinPdf, setHasLinkedinPdf] = useState(initialHasLinkedinPdf);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [positioning, setPositioning] = useState<PositioningData>({
    careerGoal: "",
    profileLanguage: "",
    recommendations: "",
    publishingFrequency: "",
    connections: "",
    mainSkills: "",
  });
  const [trajectory, setTrajectory] = useState<TrajectoryTopic[]>([]);

  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ChecklistResult | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ChecklistResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const autoScoredRef = useRef(false);

  async function runScore() {
    setScoring(true);
    setError("");
    try {
      const res = await fetch("/api/minhas-mentorias/linkedin/score", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao avaliar perfil");
      }
      setScoreResult({ score: data.score, checklist: data.checklist });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao avaliar perfil");
    } finally {
      setScoring(false);
    }
  }

  // Mostra o % "assim que carrega o profile" quando já existe um PDF enviado.
  useEffect(() => {
    if (hasLinkedinPdf && !autoScoredRef.current) {
      autoScoredRef.current = true;
      runScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLinkedinPdf]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/minhas-mentorias/linkedin", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao enviar PDF do LinkedIn");
      }

      setHasLinkedinPdf(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("PDF do LinkedIn enviado com sucesso!");
      setScoreResult(null);
      runScore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar PDF");
    } finally {
      setUploading(false);
    }
  }

  function handleGoToPositioning() {
    setPhase("positioning");
    setError("");
    setNotice("");
  }

  function isPositioningValid() {
    return (
      positioning.careerGoal.trim().length >= 10 &&
      positioning.profileLanguage !== "" &&
      positioning.recommendations !== "" &&
      positioning.publishingFrequency !== "" &&
      positioning.connections !== "" &&
      positioning.mainSkills.trim().length >= 3
    );
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError("");
    setNotice("");
    setResult(null);

    try {
      const res = await fetch("/api/minhas-mentorias/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...positioning,
          trajectory: trajectory.map(({ year, text }) => ({ year, text })),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao analisar perfil");
      }

      setResult({ score: data.score, checklist: data.checklist });
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar perfil");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const text = [
      `Análise do perfil LinkedIn — ${result.score}% segundo as recomendações`,
      "",
      ...sortBySeverity(result.checklist).map(
        (item) =>
          `## ${item.label} [${SEVERITY_META[item.severity].label} • ${STATUS_META[item.status].label}]\n${item.recommendation}`,
      ),
      "",
      DISCLAIMER,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar.");
    }
  }

  function handleRestart() {
    setPhase("positioning");
    setResult(null);
    setError("");
  }

  function updatePositioning<K extends keyof PositioningData>(
    key: K,
    value: PositioningData[K],
  ) {
    setError("");
    setPositioning((prev) => ({ ...prev, [key]: value }));
  }

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
            Melhorar perfil LinkedIn com IA
          </h1>
          <p className="text-xs text-muted-foreground">Acesso via {email}</p>
        </header>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <Upload className="h-3 w-3" /> 1. Upload
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "positioning" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <FileText className="h-3 w-3" /> 2. Posicionamento
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${phase === "result" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <Sparkles className="h-3 w-3" /> 3. Resultado
          </span>
        </div>

        {/* Phase 1: Upload + Tutorial */}
        {phase === "upload" && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Como exportar seu perfil LinkedIn
                  </span>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      1. Acesse seu perfil no LinkedIn
                    </p>
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-border">
                      <Image
                        src="/images/linkedin/step-profile.png"
                        alt="Acesse seu perfil no LinkedIn"
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 672px) 100vw, 672px"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      2. Clique em &quot;Recursos&quot; e selecione &quot;Salvar
                      como PDF&quot;
                    </p>
                    <div className="relative aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-md border border-border">
                      <Image
                        src="/images/linkedin/step-save-pdf.png"
                        alt="Selecione Salvar como PDF"
                        fill
                        className="object-contain"
                        sizes="280px"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Seu perfil LinkedIn (PDF)
                  </span>
                </div>

                {hasLinkedinPdf ? (
                  <a
                    href="/api/minhas-mentorias/linkedin/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Ver PDF atual
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Você ainda não enviou o PDF do seu perfil LinkedIn. Siga o
                    tutorial acima para exportar.
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      setError("");
                      setNotice("");
                      setFile(e.target.files?.[0] || null);
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
                      {uploading
                        ? "Enviando…"
                        : hasLinkedinPdf
                          ? "Substituir"
                          : "Enviar"}
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo: 5MB
                </p>
              </CardContent>
            </Card>

            {/* Score inicial do perfil (gancho assim que carrega) */}
            {hasLinkedinPdf && (scoring || scoreResult) && (
              <Card>
                <CardContent className="flex flex-col gap-4 py-4">
                  {scoring ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Avaliando seu perfil…
                    </div>
                  ) : (
                    scoreResult && (
                      <>
                        <ScoreMeter
                          label="Seu perfil hoje (base no PDF)"
                          score={scoreResult.score}
                        />
                        <p className="text-xs text-muted-foreground">
                          Esse é o quanto seu perfil já atende às nossas
                          recomendações com base no PDF. Responda o
                          posicionamento para a análise completa e os textos
                          prontos.
                        </p>
                        <SeverityLegend />
                        <ChecklistView items={scoreResult.checklist} />
                      </>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fallback quando a avaliação inicial falha (ex.: IA sobrecarregada) */}
            {hasLinkedinPdf && !scoring && !scoreResult && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runScore}
                className="w-fit"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                Avaliar meu perfil
              </Button>
            )}

            {hasLinkedinPdf && (
              <Button
                type="button"
                onClick={handleGoToPositioning}
                className="w-fit"
              >
                <ArrowRight className="mr-1 h-4 w-4" />
                Próximo: Posicionamento
              </Button>
            )}
          </>
        )}

        {/* Phase 2: Positioning + Trajectory */}
        {phase === "positioning" && (
          <Card>
            <CardContent className="flex flex-col gap-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Posicionamento profissional
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Responda as perguntas abaixo para que a IA gere uma análise
                  personalizada do seu perfil LinkedIn.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Qual é o seu foco para a próxima oportunidade?
                </label>
                <Textarea
                  value={positioning.careerGoal}
                  onChange={(e) =>
                    updatePositioning("careerGoal", e.target.value)
                  }
                  rows={3}
                  placeholder='Ex: "Desenvolvedor Full Stack Pleno em empresas de produto SaaS B2B" ou "Transição para Data Analytics em startups"'
                  className="text-sm"
                />
              </div>

              <SelectField
                label="Em qual idioma está o seu perfil atualmente?"
                value={positioning.profileLanguage}
                onChange={(v) => updatePositioning("profileLanguage", v)}
                options={[
                  { value: "portugues", label: "Português" },
                  { value: "ingles", label: "Inglês" },
                  { value: "espanhol", label: "Espanhol" },
                  { value: "outro", label: "Outro idioma" },
                ]}
              />

              <SelectField
                label="Quantas recomendações você tem no LinkedIn?"
                value={positioning.recommendations}
                onChange={(v) => updatePositioning("recommendations", v)}
                options={[
                  { value: "nenhuma", label: "Nenhuma" },
                  { value: "1-3", label: "1 a 3" },
                  { value: "4-10", label: "4 a 10" },
                  { value: "mais-de-10", label: "Mais de 10" },
                ]}
              />

              <SelectField
                label="Com que frequência você publica conteúdo no LinkedIn?"
                value={positioning.publishingFrequency}
                onChange={(v) => updatePositioning("publishingFrequency", v)}
                options={[
                  { value: "nunca", label: "Nunca publiquei" },
                  {
                    value: "raramente",
                    label: "Raramente (algumas vezes por ano)",
                  },
                  { value: "mensalmente", label: "Mensalmente" },
                  { value: "semanalmente", label: "Semanalmente ou mais" },
                ]}
              />

              <SelectField
                label="Quantas conexões você tem?"
                value={positioning.connections}
                onChange={(v) => updatePositioning("connections", v)}
                options={[
                  { value: "menos-de-100", label: "Menos de 100" },
                  { value: "100-500", label: "100 a 500" },
                  { value: "500-1000", label: "500 a 1.000" },
                  { value: "mais-de-1000", label: "Mais de 1.000" },
                ]}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Quais são suas principais áreas de atuação ou skills?
                </label>
                <Textarea
                  value={positioning.mainSkills}
                  onChange={(e) =>
                    updatePositioning("mainSkills", e.target.value)
                  }
                  rows={2}
                  placeholder="Ex: Desenvolvimento Full Stack, Data Analytics, Automação RPA, Python, JavaScript"
                  className="text-sm"
                />
              </div>

              <div className="border-t border-border pt-4">
                <TrajectoryCapture
                  topics={trajectory}
                  onChange={setTrajectory}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={analyzing || !isPositioningValid()}
                  onClick={handleAnalyze}
                  className="w-fit"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {analyzing ? "Analisando…" : "Analisar perfil"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhase("upload");
                    setError("");
                  }}
                  disabled={analyzing}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Voltar
                </Button>
              </div>

              {!isPositioningValid() && (
                <p className="text-xs text-muted-foreground">
                  Preencha todos os campos para habilitar a análise. A
                  trajetória é opcional, mas deixa o &ldquo;Sobre&rdquo; bem mais
                  forte.
                </p>
              )}
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
                  Análise do seu perfil LinkedIn
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
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background/50 p-4">
                <ScoreMeter
                  label="Seu perfil segundo as recomendações"
                  score={result.score}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Conforme você aplica os pontos abaixo, seu perfil fica mais
                  perto dos 100%.
                </p>
              </div>

              <SeverityLegend />

              <ChecklistView items={result.checklist} />

              <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
