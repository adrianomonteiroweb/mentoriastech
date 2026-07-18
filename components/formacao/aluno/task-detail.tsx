"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PartyPopper,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import type { TarefaDetalhe } from "@/lib/db/formacao";
import { roleColor } from "@/lib/formacao/role-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueada: "Bloqueada",
  em_revisao: "Em revisão",
  concluida: "Concluída",
};

const ENTREGA_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  correcao_solicitada: "Correção solicitada",
  aprovada: "Aprovada",
};

const TIPOS_ARQUIVO = new Set(["arquivo", "audio"]);
const TIPO_LABEL: Record<string, string> = {
  texto: "Texto",
  link: "Link",
  arquivo: "Arquivo",
  audio: "Áudio",
  produto: "Produto publicado",
  repositorio: "Repositório",
  pull_request: "Pull request",
};

export function TaskDetail({
  detalhe,
  membroId,
}: {
  detalhe: TarefaDetalhe;
  membroId: string;
}) {
  const router = useRouter();
  const { tarefa, criterios, entregas } = detalhe;
  const roleCls = roleColor(detalhe.papelCor);
  const concluida = tarefa.status === "concluida";

  const [busy, setBusy] = useState(false);

  async function toggleCriterio(criterioId: string, concluido: boolean) {
    try {
      const res = await fetch(
        `/api/formacao/tarefas/${tarefa.id}/criterios/${criterioId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concluido }),
        },
      );
      if (!res.ok) throw new Error("Falha ao atualizar critério");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function mudarStatus(status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/formacao/tarefas/${tarefa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao atualizar status");
      toast.success("Status atualizado");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/formacao/turma"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para a turma
      </Link>

      {concluida && <RewardBanner />}

      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={concluida ? "default" : "secondary"}>
            {STATUS_LABEL[tarefa.status] ?? tarefa.status}
          </Badge>
          {detalhe.papelNome && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${roleCls.border} ${roleCls.text}`}
            >
              {detalhe.papelNome}
            </span>
          )}
          {tarefa.prazo && (
            <span className="text-xs text-muted-foreground">
              Prazo: {new Date(tarefa.prazo).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight">{tarefa.titulo}</h1>
        {tarefa.contexto && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tarefa.contexto}
          </p>
        )}
      </div>

      {/* Por que importa */}
      {tarefa.motivo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Por que isso importa
          </p>
          <p className="mt-1 text-sm">{tarefa.motivo}</p>
        </div>
      )}

      {/* Política de IA */}
      {tarefa.politicaIa && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold">Política de IA</p>
            <p className="text-sm text-muted-foreground">{tarefa.politicaIa}</p>
          </div>
        </div>
      )}

      {/* Critérios de aceite */}
      {criterios.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-sm font-semibold">Critérios de aceite</p>
          <ul className="space-y-2">
            {criterios.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggleCriterio(c.id, !c.concluido)}
                  className="flex w-full items-start gap-2 text-left text-sm"
                >
                  {c.concluido ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={c.concluido ? "text-muted-foreground line-through" : ""}>
                    {c.texto}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status (o aluno controla até enviar a entrega) */}
      {!concluida && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Andamento:</span>
          {(["a_fazer", "em_andamento", "bloqueada"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={tarefa.status === s ? "default" : "outline"}
              disabled={busy}
              onClick={() => mudarStatus(s)}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      )}

      {/* Entrega */}
      {!concluida && <EntregaForm tarefaId={tarefa.id} />}

      {/* Histórico de entregas */}
      {entregas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Suas entregas</p>
          {entregas.map((e) => (
            <div key={e.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  v{e.versao} · {TIPO_LABEL[e.tipo] ?? e.tipo}
                </span>
                <Badge
                  variant={e.status === "aprovada" ? "default" : "outline"}
                >
                  {ENTREGA_STATUS_LABEL[e.status] ?? e.status}
                </Badge>
              </div>
              {e.arquivoUrl ? (
                <a
                  href={e.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm text-primary hover:underline"
                >
                  Abrir arquivo enviado
                </a>
              ) : e.conteudo && /^https?:\/\//.test(e.conteudo) ? (
                <a
                  href={e.conteudo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-sm text-primary hover:underline"
                >
                  {e.conteudo}
                </a>
              ) : (
                e.conteudo && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {e.conteudo}
                  </p>
                )
              )}
              {e.feedbacks.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  {e.feedbacks.map((f) => (
                    <p key={f.id} className="text-xs text-muted-foreground">
                      <span className="font-medium">Instrutor:</span>{" "}
                      {f.comentario}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RewardBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 duration-500 animate-in fade-in zoom-in">
      <PartyPopper className="h-6 w-6 animate-bounce text-emerald-500" />
      <div>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Tarefa concluída e aprovada!
        </p>
        <p className="text-xs text-muted-foreground">
          Ótimo trabalho — sua entrega foi validada pelo instrutor.
        </p>
      </div>
    </div>
  );
}

function EntregaForm({ tarefaId }: { tarefaId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("texto");
  const [conteudo, setConteudo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const isArquivo = TIPOS_ARQUIVO.has(tipo);

  async function enviar() {
    setBusy(true);
    try {
      let arquivoUrl = "";
      if (isArquivo) {
        if (!file) {
          toast.error("Selecione um arquivo");
          setBusy(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch(
          `/api/formacao/tarefas/${tarefaId}/entregas/upload`,
          { method: "POST", body: fd },
        );
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson.error || "Falha no upload");
        arquivoUrl = upJson.url;
      }

      const res = await fetch(`/api/formacao/tarefas/${tarefaId}/entregas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, conteudo, arquivoUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao enviar entrega");
      toast.success("Entrega enviada");
      setConteudo("");
      setFile(null);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const placeholders: Record<string, string> = {
    link: "https://...",
    produto: "https://link-do-produto-publicado",
    repositorio: "https://github.com/...",
    pull_request: "https://github.com/.../pull/1",
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="mb-3 text-sm font-semibold">Enviar entrega</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isArquivo ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Arquivo (máx 5MB)
            </Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : tipo === "texto" ? (
          <Textarea
            rows={3}
            placeholder="Descreva sua entrega..."
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        ) : (
          <Input
            placeholder={placeholders[tipo] ?? "https://..."}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        )}

        <Button onClick={enviar} disabled={busy} className="w-full sm:w-auto">
          {isArquivo ? (
            <Upload className="mr-1.5 h-4 w-4" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          {busy ? "Enviando..." : "Enviar entrega"}
        </Button>
      </div>
    </div>
  );
}
