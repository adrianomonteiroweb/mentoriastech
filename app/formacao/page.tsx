import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Orbit, Users } from "lucide-react";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import {
  getActiveTurmaMembershipForEmail,
  getAnyTurmaMembershipForEmail,
} from "@/lib/db/formacao";

// Estado da tela inicial da Órbita conforme o vínculo do aluno.
// Turma ativa → redireciona direto para a home (/formacao/turma).
type Estado =
  | { tipo: "sem_sessao" }
  | { tipo: "sem_turma" }
  | { tipo: "aguardando"; turmaNome: string; dataInicio: string };

async function resolverEstado(): Promise<Estado> {
  const session = await getMenteeAccessSession();
  if (!session) return { tipo: "sem_sessao" };

  const ativa = await getActiveTurmaMembershipForEmail(session.email);
  if (ativa) redirect("/formacao/turma");

  const qualquer = await getAnyTurmaMembershipForEmail(session.email);
  if (qualquer) {
    return {
      tipo: "aguardando",
      turmaNome: qualquer.turma.nome,
      dataInicio: qualquer.turma.dataInicio,
    };
  }

  return { tipo: "sem_turma" };
}

export default async function FormacaoPage() {
  const estado = await resolverEstado();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Orbit className="h-8 w-8" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Órbita — Formação em Squad
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Uma squad, cinco alunos, dois certificados. Aqui você sempre sabe onde
          parou, o que fazer agora e por quê.
        </p>
      </div>

      <div className="w-full rounded-xl border border-border bg-card p-5 text-left">
        {estado.tipo === "sem_sessao" && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Entre com seu e-mail para acessar sua turma.
            </p>
            <Link
              href="/minhas-mentorias"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Acessar minha conta
            </Link>
          </div>
        )}

        {estado.tipo === "sem_turma" && (
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Você ainda não faz parte de uma turma
              </p>
              <p className="text-sm text-muted-foreground">
                Quando o instrutor adicionar você a uma squad, ela aparecerá
                aqui.
              </p>
            </div>
          </div>
        )}

        {estado.tipo === "aguardando" && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {estado.turmaNome}
              </p>
              <p className="text-sm text-muted-foreground">
                Sua turma ainda não começou. Início previsto para{" "}
                {estado.dataInicio}.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar para a página inicial
        </Link>
        <Link
          href="/formacao/instrutor"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Área do instrutor
        </Link>
      </div>
    </main>
  );
}
