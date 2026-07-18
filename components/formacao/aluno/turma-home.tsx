import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flag,
  Lock,
  Orbit,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { TurmaHome } from "@/lib/db/formacao";
import { formatarFortaleza } from "@/lib/formacao/schedule";
import { roleColor } from "@/lib/formacao/role-colors";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Índice do dia atual (0=Seg … 6=Dom) no fuso de Fortaleza.
function hojeIndexFortaleza(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[wd] ?? 0;
}

function diasAte(data: Date | string): number {
  const alvo = new Date(data).getTime();
  const agora = Date.now();
  return Math.max(0, Math.ceil((alvo - agora) / 86_400_000));
}

export function TurmaHome({ home }: { home: TurmaHome }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <TopBar home={home} />
      <div className="mt-4 space-y-4">
        <Header home={home} />
        <ContinuityLine home={home} />
        <SequenceTrack home={home} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <RoleCard home={home} />
            <ProjectProgress home={home} />
          </div>
          <div className="space-y-4">
            <MeetingCard home={home} />
            <SquadPanel home={home} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ home }: { home: TurmaHome }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Orbit className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{home.turma.nome}</p>
          <p className="text-[11px] text-muted-foreground">
            {home.turma.empresaFicticia
              ? `${home.turma.empresaFicticia} · `
              : ""}
            empresa fictícia · ambiente de simulação
          </p>
        </div>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
        {home.membro.iniciais || "?"}
      </span>
    </div>
  );
}

function Header({ home }: { home: TurmaHome }) {
  const dias = home.proximoEncontro ? diasAte(home.proximoEncontro.data) : null;
  const hoje = hojeIndexFortaleza();

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {home.projetoAtual && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Target className="h-3.5 w-3.5" />
            Projeto {home.projetoAtual.numero} · {home.projetoAtual.nome}
          </span>
        )}
        {dias !== null && (
          <span className="text-xs text-muted-foreground">
            {dias === 0 ? "Encontro hoje" : `${dias} dia(s) até o encontro`}
          </span>
        )}
      </div>

      <h1 className="mt-3 text-balance text-2xl font-bold leading-tight tracking-tight">
        {home.etapaAtual?.nome ?? "Sua formação em squad"}
      </h1>
      {home.etapaAtual?.oQueE && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {home.etapaAtual.oQueE}
        </p>
      )}

      {/* day-track Seg–Dom */}
      <div className="mt-5 flex items-end gap-1.5">
        {DIAS.map((d, i) => {
          const estado =
            i < hoje ? "done" : i === hoje ? "hoje" : "futuro";
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={
                  "h-2 w-full rounded-full " +
                  (estado === "done"
                    ? "bg-primary"
                    : estado === "hoje"
                      ? "bg-amber-500"
                      : "bg-border")
                }
              />
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                {i === 6 && <Flag className="h-2.5 w-2.5" />}
                {d}
              </span>
            </div>
          );
        })}
      </div>

      {/* progresso do projeto */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do projeto</span>
          <span>{home.progresso.percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${home.progresso.percent}%` }}
          />
        </div>
      </div>

      {home.tarefaAtual && (
        <Link
          href={`/formacao/turma/tarefa/${home.tarefaAtual.id}`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Abrir minha tarefa
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

function ContinuityLine({ home }: { home: TurmaHome }) {
  const { continuidade } = home;
  const blocos = [
    {
      titulo: "Onde você parou",
      texto: continuidade.parou ?? "Você está começando agora.",
      cls: "border-emerald-500/30 bg-emerald-500/5",
    },
    {
      titulo: "Onde você está",
      texto: continuidade.agora ?? "Aguardando a definição da etapa atual.",
      cls: "border-blue-500/30 bg-blue-500/5",
    },
    {
      titulo: "Por que isso importa",
      texto:
        continuidade.importa ??
        "Cada etapa tem um propósito que o instrutor vai detalhar.",
      cls: "border-amber-500/30 bg-amber-500/5",
    },
    {
      titulo: "Próxima ação",
      texto: continuidade.proximaAcao ?? "Nenhuma ação pendente no momento.",
      cls: "border-primary/30 bg-primary/5",
    },
  ];

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        Continue de onde você parou
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {blocos.map((b) => (
          <div key={b.titulo} className={"rounded-xl border p-4 " + b.cls}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {b.titulo}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{b.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SequenceTrack({ home }: { home: TurmaHome }) {
  if (home.sequencia.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold">Sua sequência</h2>
      <ol className="flex flex-wrap items-center gap-2">
        {home.sequencia.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium " +
                (s.estado === "concluida"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : s.estado === "atual"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground")
              }
            >
              {s.estado === "concluida" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : s.estado === "bloqueada" ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {s.nome}
            </span>
            {i < home.sequencia.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </li>
        ))}
      </ol>

      {home.etapaAtual && (
        <div className="mt-4 grid gap-3 rounded-xl bg-secondary/40 p-4 sm:grid-cols-2">
          <DetailField label="O que é" value={home.etapaAtual.oQueE} />
          <DetailField
            label="Por que existe"
            value={home.etapaAtual.porQueExiste}
          />
          <DetailField
            label="O que precisa entregar"
            value={home.etapaAtual.oQueEntregar}
          />
          <DetailField
            label="O que desbloqueia"
            value={home.etapaAtual.oQueDesbloqueia}
          />
        </div>
      )}
    </section>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">
        {value || <span className="text-muted-foreground">A definir</span>}
      </p>
    </div>
  );
}

function RoleCard({ home }: { home: TurmaHome }) {
  const c = roleColor(home.papelAtual?.cor);
  return (
    <section className={"rounded-2xl border p-5 " + c.border}>
      <div className="flex items-center gap-2">
        <span className={"flex h-8 w-8 items-center justify-center rounded-lg " + c.bg + " " + c.text}>
          <Users className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Seu papel nesta semana</p>
          <p className={"text-sm font-semibold " + c.text}>
            {home.papelAtual?.nome ?? "Papel ainda não definido"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Uma responsabilidade de aprendizagem durante este ciclo — não é um cargo
        fixo.
      </p>
      {home.papelAtual && home.papelAtual.responsabilidades.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {home.papelAtual.responsabilidades.map((r) => (
            <li key={r} className="flex items-center gap-2 text-sm">
              <span className={"h-1.5 w-1.5 rounded-full " + c.dot} />
              {r}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MeetingCard({ home }: { home: TurmaHome }) {
  const e = home.proximoEncontro;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Próximo encontro</p>
      </div>
      {e ? (
        <>
          <p className="mt-2 text-sm">{formatarFortaleza(e.data)}</p>
          <p className="text-xs text-muted-foreground">
            Encontro #{e.numero} · domingo, 10h (Fortaleza)
          </p>
          {e.pauta && e.pauta.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {e.pauta.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  {p}
                </li>
              ))}
            </ul>
          )}
          {e.linkMeet && (
            <a
              href={e.linkMeet}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Abrir Google Meet
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            href="/formacao/turma/daily"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Preparar minha daily
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum encontro agendado ainda.
        </p>
      )}
    </section>
  );
}

function ProjectProgress({ home }: { home: TurmaHome }) {
  if (!home.projetoAtual) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Projeto {home.projetoAtual.numero} · {home.projetoAtual.nome}
        </p>
        <span className="text-xs text-muted-foreground">
          {home.progresso.percent}%
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {home.progresso.entregas.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            {d.estado === "concluida" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : d.estado === "atual" ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )}
            <span
              className={
                d.estado === "bloqueada" ? "text-muted-foreground" : ""
              }
            >
              {d.nome}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SquadPanel({ home }: { home: TurmaHome }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Squad</p>
      </div>
      <ul className="mt-3 space-y-2">
        {home.squad.map((m) => (
          <li
            key={m.id}
            className={
              "flex items-center gap-2 rounded-lg p-2 " +
              (m.isMe ? "bg-primary/5" : "")
            }
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold">
              {m.iniciais || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {m.nome || "—"}
                {m.isMe && (
                  <span className="ml-1 text-xs text-primary">(você)</span>
                )}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {m.papel ?? "sem papel definido"}
              </p>
            </div>
            <div className="flex items-center gap-1" aria-label="status">
              <span
                title="Daily"
                className={
                  "h-2 w-2 rounded-full " +
                  (m.dailyOk ? "bg-emerald-500" : "bg-border")
                }
              />
              <span
                title="Presença"
                className={
                  "h-2 w-2 rounded-full " +
                  (m.presencaOk ? "bg-primary" : "bg-border")
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
