"use client";

import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  Loader2,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  XCircle,
  Globe,
  Languages,
} from "lucide-react";
import Link from "next/link";
import { AdBanner } from "@/components/ad-banner";
import { JobTips } from "@/components/job-tips";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string | null;
  job_type: "remote" | "hybrid" | "onsite";
  level: "internship" | "junior" | "mid" | "senior";
  category: "dados" | "ia" | "desenvolvimento" | "po" | "pm" | "qa" | "cyber_security" | "devops" | "design" | "other";
  salary_range: string | null;
  application_url: string | null;
  is_international: boolean;
  required_language: string | null;
  language_level: "basic" | "intermediate" | "advanced" | "fluent" | null;
  created_at: string;
  profiles: { full_name: string } | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  remote: "bg-green-500/10 text-green-400",
  hybrid: "bg-yellow-500/10 text-yellow-400",
  onsite: "bg-blue-500/10 text-blue-400",
};

const JOB_CATEGORY_LABELS: Record<string, string> = {
  dados: "Dados",
  ia: "IA",
  desenvolvimento: "Desenvolvimento",
  po: "PO",
  pm: "PM",
  qa: "QA",
  cyber_security: "Cyber Security",
  devops: "DevOps",
  design: "Design",
  other: "Outra",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
};

const LEVEL_TABS = [
  { key: "all", label: "Todas" },
  { key: "internship", label: "Estágio & Trainee" },
  { key: "junior", label: "Júnior" },
  { key: "mid", label: "Pleno" },
  { key: "senior", label: "Sênior" },
] as const;

const TYPE_TABS = [
  { key: "all", label: "Todos" },
  { key: "remote", label: "Remoto" },
  { key: "hybrid", label: "Híbrido" },
  { key: "onsite", label: "Presencial" },
] as const;

const SCOPE_TABS = [
  { key: "all", label: "Todas" },
  { key: "national", label: "Nacional" },
  { key: "international", label: "Internacional" },
] as const;

const CATEGORY_TABS = [
  { key: "all", label: "Todas" },
  { key: "dados", label: "Dados" },
  { key: "ia", label: "IA" },
  { key: "desenvolvimento", label: "Dev" },
  { key: "po", label: "PO" },
  { key: "pm", label: "PM" },
  { key: "qa", label: "QA" },
  { key: "cyber_security", label: "Cyber Security" },
  { key: "devops", label: "DevOps" },
  { key: "design", label: "Design" },
  { key: "other", label: "Outra" },
] as const;

const FALLBACK_JOBS: Job[] = [
  {
    id: "fj1",
    title: "Estagiário(a) de Desenvolvimento Web",
    company: "TechStart",
    description:
      "Vaga de estágio para estudantes de TI. Você vai atuar no desenvolvimento de interfaces web com React e TypeScript, participar de code reviews e aprender boas práticas de desenvolvimento.",
    location: "Fortaleza, CE",
    job_type: "hybrid",
    level: "internship",
    category: "desenvolvimento",
    salary_range: "R$ 1.200 - R$ 1.800",
    application_url: "https://linkedin.com",
    is_international: false,
    required_language: null,
    language_level: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
  {
    id: "fj2",
    title: "Desenvolvedor(a) Front-end Júnior",
    company: "DigitalFlow",
    description:
      "Buscamos dev júnior com conhecimento em React, Next.js e Tailwind CSS. Experiência com TypeScript é um diferencial. Trabalho 100% remoto com squad ágil.",
    location: null,
    job_type: "remote",
    level: "junior",
    category: "desenvolvimento",
    salary_range: "R$ 3.000 - R$ 4.500",
    application_url: "https://linkedin.com",
    is_international: false,
    required_language: null,
    language_level: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
  {
    id: "fj3",
    title: "Pessoa Desenvolvedora Full-Stack Pleno",
    company: "Inovare Solutions",
    description:
      "Atuação em projetos de média e alta complexidade com Node.js, React e PostgreSQL. Experiência com APIs REST, testes automatizados e CI/CD. Metodologia ágil.",
    location: "São Paulo, SP",
    job_type: "remote",
    level: "mid",
    category: "desenvolvimento",
    salary_range: "R$ 8.000 - R$ 12.000",
    application_url: "https://linkedin.com",
    is_international: false,
    required_language: null,
    language_level: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
  {
    id: "fj4",
    title: "Dev Back-end Sênior (Node.js)",
    company: "ScaleTech",
    description:
      "Liderança técnica em arquitetura de microsserviços, mentoria de devs júnior, definição de padrões de código e revisão de PRs. Stack: Node.js, TypeScript, PostgreSQL, AWS.",
    location: null,
    job_type: "remote",
    level: "senior",
    category: "desenvolvimento",
    salary_range: "R$ 15.000 - R$ 22.000",
    application_url: "https://linkedin.com",
    is_international: false,
    required_language: null,
    language_level: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
  {
    id: "fj5",
    title: "Trainee de Automação RPA",
    company: "AutomateNow",
    description:
      "Programa de trainee focado em automação de processos com ferramentas de RPA. Treinamento completo oferecido pela empresa. Ideal para quem está migrando de carreira.",
    location: "Fortaleza, CE",
    job_type: "onsite",
    level: "internship",
    category: "ia",
    salary_range: "R$ 2.000 - R$ 2.800",
    application_url: "https://linkedin.com",
    is_international: false,
    required_language: null,
    language_level: null,
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
  {
    id: "fj6",
    title: "Software Engineer",
    company: "GlobalTech Inc.",
    description:
      "Join our distributed engineering team building scalable cloud solutions. Work with cutting-edge technologies including React, Node.js, and AWS. Competitive USD salary.",
    location: null,
    job_type: "remote",
    level: "mid",
    category: "desenvolvimento",
    salary_range: "USD 4.000 - USD 6.000",
    application_url: "https://linkedin.com",
    is_international: true,
    required_language: "Inglês",
    language_level: "advanced",
    created_at: new Date().toISOString(),
    profiles: { full_name: "Adriano Monteiro" },
  },
];

function trackJobEvent(jobId: string, event: "view" | "click") {
  if (jobId.startsWith("fj")) return; // não rastrear fallback
  fetch(`/api/jobs/${jobId}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {});
}

interface UserAction {
  job_id: string;
  action_type: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");
  const [activeScope, setActiveScope] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const viewedJobs = useRef<Set<string>>(new Set());

  function loadJobs() {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((json) => {
        if (json.error || !json.data) {
          setJobs(FALLBACK_JOBS);
        } else {
          setJobs(json.data.length > 0 ? json.data : FALLBACK_JOBS);
          setUserActions(json.user_actions || []);
          setIsAuthenticated(!!json.is_authenticated);
        }
      })
      .catch(() => {
        setJobs(FALLBACK_JOBS);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadJobs();
  }, []);

  // Rastrear visualização das vagas quando carregam
  useEffect(() => {
    jobs.forEach((job) => {
      if (!job.id.startsWith("fj") && !viewedJobs.current.has(job.id)) {
        viewedJobs.current.add(job.id);
        trackJobEvent(job.id, "view");
      }
    });
  }, [jobs]);

  function hasAction(jobId: string, actionType: string) {
    return userActions.some(
      (a) => a.job_id === jobId && a.action_type === actionType,
    );
  }

  async function toggleAction(jobId: string, actionType: string) {
    const key = `${jobId}:${actionType}`;
    setActionLoading(key);
    try {
      if (hasAction(jobId, actionType)) {
        await fetch(`/api/jobs/${jobId}/actions?action_type=${actionType}`, {
          method: "DELETE",
        });
        setUserActions((prev) =>
          prev.filter(
            (a) => !(a.job_id === jobId && a.action_type === actionType),
          ),
        );
      } else {
        const res = await fetch(`/api/jobs/${jobId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action_type: actionType }),
        });
        const json = await res.json();
        setUserActions((prev) => [
          ...prev,
          { job_id: jobId, action_type: actionType },
        ]);
        if (json.deactivated) {
          setJobs((prev) => prev.filter((j) => j.id !== jobId));
        }
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = jobs.filter((job) => {
    if (activeTab !== "all" && job.level !== activeTab) return false;
    if (activeType !== "all" && job.job_type !== activeType) return false;
    if (activeScope === "national" && job.is_international) return false;
    if (activeScope === "international" && !job.is_international) return false;
    if (activeCategory !== "all" && job.category !== activeCategory) return false;
    return true;
  });

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Quadro de Vagas
          </h1>
          <p className="text-sm text-muted-foreground">
            Vagas compartilhadas pela comunidade de mentorados.
          </p>
        </div>

        <AdBanner />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {LEVEL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeType === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="w-px bg-border mx-1" />
            {SCOPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveScope(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeScope === tab.key
                    ? tab.key === "international"
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tab.key === "international" && <Globe className="inline h-3 w-3 mr-1" />}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <JobTips />

        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    {job.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${JOB_TYPE_COLORS[job.job_type] || ""}`}
                  >
                    {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {job.level === "internship"
                      ? "Estágio"
                      : job.level === "junior"
                        ? "Júnior"
                        : job.level === "mid"
                          ? "Pleno"
                          : "Sênior"}
                  </span>
                  {job.category && job.category !== "other" && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                      {JOB_CATEGORY_LABELS[job.category] || job.category}
                    </span>
                  )}
                </div>
              </div>

              {job.is_international && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                    <Globe className="h-3 w-3" />
                    Internacional
                  </span>
                  {job.required_language && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                      <Languages className="h-3 w-3" />
                      {job.required_language}
                      {job.language_level && ` · ${LANGUAGE_LEVEL_LABELS[job.language_level]}`}
                    </span>
                  )}
                </div>
              )}

              <p className={`text-xs text-muted-foreground mb-1 whitespace-pre-line ${
                expandedJobs.has(job.id) ? "" : "line-clamp-3"
              }`}>
                {job.description}
              </p>
              {job.description && job.description.length > 150 && (
                <button
                  onClick={() => {
                    setExpandedJobs((prev) => {
                      const next = new Set(prev);
                      if (next.has(job.id)) {
                        next.delete(job.id);
                      } else {
                        next.add(job.id);
                      }
                      return next;
                    });
                  }}
                  className="text-[11px] font-medium text-primary hover:underline mb-3"
                >
                  {expandedJobs.has(job.id) ? "Ver menos" : "Ver mais"}
                </button>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {job.salary_range && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {job.salary_range}
                    </span>
                  )}
                </div>

                {job.application_url && (
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackJobEvent(job.id, "click")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Candidatar-se
                  </a>
                )}
              </div>

              {job.profiles?.full_name && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Publicado por {job.profiles.full_name}
                </p>
              )}

              {isAuthenticated && !job.id.startsWith("fj") && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => toggleAction(job.id, "applied")}
                    disabled={actionLoading === `${job.id}:applied`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      hasAction(job.id, "applied")
                        ? "bg-green-500/20 text-green-400"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Me candidatei
                  </button>
                  <button
                    onClick={() => toggleAction(job.id, "link_issue")}
                    disabled={
                      hasAction(job.id, "link_issue") ||
                      actionLoading === `${job.id}:link_issue`
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      hasAction(job.id, "link_issue")
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                    title={
                      hasAction(job.id, "link_issue")
                        ? "Já reportado"
                        : "Reportar link com problemas"
                    }
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Link com problemas
                  </button>
                  <button
                    onClick={() => toggleAction(job.id, "closed")}
                    disabled={
                      hasAction(job.id, "closed") ||
                      actionLoading === `${job.id}:closed`
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      hasAction(job.id, "closed")
                        ? "bg-red-500/20 text-red-400"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                    title={
                      hasAction(job.id, "closed")
                        ? "Já reportado"
                        : "Reportar que não aceita mais candidaturas"
                    }
                  >
                    <XCircle className="h-3 w-3" />
                    Não aceita mais candidaturas
                  </button>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma vaga disponível
              {activeTab !== "all" ? " neste nível" : " no momento"}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
