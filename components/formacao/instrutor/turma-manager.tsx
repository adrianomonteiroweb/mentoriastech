"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  ListChecks,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { Referencia, TurmaDetalhe } from "@/lib/db/formacao";
import { formatarFortaleza } from "@/lib/formacao/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<string, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TAREFA_STATUS_LABEL: Record<string, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  bloqueada: "Bloqueada",
  em_revisao: "Em revisão",
  concluida: "Concluída",
};

export function TurmaManager({
  detalhe,
  referencia,
}: {
  detalhe: TurmaDetalhe;
  referencia: Referencia;
}) {
  const router = useRouter();
  const { turma, membros, encontros, papeis, atribuicoes, tarefas } = detalhe;
  const base = `/api/formacao/instrutor/turmas/${turma.id}`;

  async function call(url: string, init: RequestInit, ok: string) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha na operação");
    toast.success(ok);
    router.refresh();
    return json;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/formacao/instrutor"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todas as turmas
      </Link>

      <TurmaHeader turma={turma} onCall={call} base={base} />

      <MembrosSection membros={membros} base={base} onCall={call} />

      <EncontrosSection encontros={encontros} base={base} onCall={call} />

      <PapeisSection
        membros={membros}
        encontros={encontros}
        papeis={papeis}
        atribuicoes={atribuicoes}
        base={base}
        onCall={call}
      />

      <TarefasSection
        tarefas={tarefas}
        membros={membros}
        referencia={referencia}
        turmaFase={turma.faseAtual}
        base={base}
        onCall={call}
      />
    </div>
  );
}

type CallFn = (url: string, init: RequestInit, ok: string) => Promise<unknown>;

function TurmaHeader({
  turma,
  base,
  onCall,
}: {
  turma: TurmaDetalhe["turma"];
  base: string;
  onCall: CallFn;
}) {
  const [busy, setBusy] = useState(false);

  async function mudarStatus(status: string) {
    setBusy(true);
    try {
      await onCall(base, { method: "PATCH", body: JSON.stringify({ status }) }, "Status atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{turma.nome}</h1>
            <Badge variant={turma.status === "ativa" ? "default" : "secondary"}>
              {STATUS_LABEL[turma.status] ?? turma.status}
            </Badge>
          </div>
          {turma.empresaFicticia && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {turma.empresaFicticia}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Início: {turma.dataInicio} · Fase {turma.faseAtual}
            {turma.linkMeet ? " · Meet configurado" : " · sem link do Meet"}
          </p>
        </div>
        <div className="w-44">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={turma.status}
            onValueChange={mudarStatus}
            disabled={busy}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planejada">Planejada</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function MembrosSection({
  membros,
  base,
  onCall,
}: {
  membros: TurmaDetalhe["membros"];
  base: string;
  onCall: CallFn;
}) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const cheio = membros.filter((m) => m.status !== "inativo").length >= 5;

  async function adicionar() {
    if (!email.trim()) {
      toast.error("Informe o e-mail do aluno");
      return;
    }
    setBusy(true);
    try {
      await onCall(
        `${base}/membros`,
        { method: "POST", body: JSON.stringify({ email, nome }) },
        "Aluno adicionado",
      );
      setEmail("");
      setNome("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remover(membroId: string) {
    try {
      await onCall(`${base}/membros/${membroId}`, { method: "DELETE" }, "Aluno removido");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Alunos ({membros.filter((m) => m.status !== "inativo").length}/5)
        </CardTitle>
        <CardDescription>
          Uma squad tem no máximo 5 alunos. O 6º é bloqueado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {membros.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {membros.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {m.iniciais || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.nome || m.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remover(m.id)}
                  aria-label={`Remover ${m.nome || m.email}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {cheio ? (
          <p className="text-xs text-amber-500">
            Limite de 5 alunos atingido.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="email@do-aluno.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Nome (opcional)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <Button onClick={adicionar} disabled={busy} className="shrink-0">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EncontrosSection({
  encontros,
  base,
  onCall,
}: {
  encontros: TurmaDetalhe["encontros"];
  base: string;
  onCall: CallFn;
}) {
  const [quantidade, setQuantidade] = useState(12);
  const [busy, setBusy] = useState(false);

  async function gerar() {
    setBusy(true);
    try {
      await onCall(
        `${base}/encontros/gerar`,
        { method: "POST", body: JSON.stringify({ quantidade }) },
        "Encontros gerados",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Encontros de domingo (10h · Fortaleza)
        </CardTitle>
        <CardDescription>
          Gerados automaticamente a partir da data de início da turma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {encontros.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {encontros.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                  {e.numero}
                </span>
                <span className="text-muted-foreground">
                  {formatarFortaleza(e.data)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <div className="w-28">
            <Label htmlFor="qtd" className="text-xs text-muted-foreground">
              Semanas
            </Label>
            <Input
              id="qtd"
              type="number"
              min={1}
              max={52}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <Button onClick={gerar} disabled={busy} variant="secondary">
            {encontros.length > 0 ? "Gerar mais" : "Gerar encontros"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PapeisSection({
  membros,
  encontros,
  papeis,
  atribuicoes,
  base,
  onCall,
}: {
  membros: TurmaDetalhe["membros"];
  encontros: TurmaDetalhe["encontros"];
  papeis: TurmaDetalhe["papeis"];
  atribuicoes: TurmaDetalhe["atribuicoes"];
  base: string;
  onCall: CallFn;
}) {
  const ativos = membros.filter((m) => m.status !== "inativo");
  const [encontroId, setEncontroId] = useState<string>(
    encontros[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);

  // Escalação atual do encontro selecionado: membroId -> papelId.
  const atuais = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of atribuicoes) {
      if (a.encontroId === encontroId) map[a.membroId] = a.papelId;
    }
    return map;
  }, [atribuicoes, encontroId]);

  const [sel, setSel] = useState<Record<string, string>>({});
  const escala = { ...atuais, ...sel };

  async function salvar() {
    const lista = ativos
      .map((m) => ({ membroId: m.id, papelId: escala[m.id] }))
      .filter((a) => a.papelId);
    if (lista.length === 0) {
      toast.error("Selecione ao menos um papel");
      return;
    }
    setBusy(true);
    try {
      await onCall(
        `${base}/papeis`,
        {
          method: "POST",
          body: JSON.stringify({ encontroId, atribuicoes: lista }),
        },
        "Papéis atribuídos",
      );
      setSel({});
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (encontros.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Papéis da semana</CardTitle>
          <CardDescription>
            Gere os encontros para poder distribuir os papéis.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Papéis rotativos</CardTitle>
        <CardDescription>
          Atribua um papel a cada aluno para o encontro selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full sm:w-64">
          <Label className="text-xs text-muted-foreground">Encontro</Label>
          <Select value={encontroId} onValueChange={setEncontroId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {encontros.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  #{e.numero} · {formatarFortaleza(e.data)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Adicione alunos para distribuir papéis.
          </p>
        ) : (
          <div className="space-y-2">
            {ativos.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm">
                  {m.nome || m.email}
                </span>
                <Select
                  value={escala[m.id] ?? ""}
                  onValueChange={(v) => setSel((s) => ({ ...s, [m.id]: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {papeis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button onClick={salvar} disabled={busy} size="sm" className="mt-2">
              Salvar papéis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TarefasSection({
  tarefas,
  membros,
  referencia,
  turmaFase,
  base,
  onCall,
}: {
  tarefas: TurmaDetalhe["tarefas"];
  membros: TurmaDetalhe["membros"];
  referencia: Referencia;
  turmaFase: number;
  base: string;
  onCall: CallFn;
}) {
  const ativos = membros.filter((m) => m.status !== "inativo");
  const faseAtual = referencia.fases.find((f) => f.numero === turmaFase);
  const projetos = referencia.projetos.filter(
    (p) => p.faseId === faseAtual?.id,
  );
  const papeis = referencia.papeis.filter((p) => p.faseId === faseAtual?.id);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    contexto: "",
    motivo: "",
    politicaIa: "",
    projetoId: "",
    etapaId: "",
    papelId: "",
    membroId: "",
    criterios: "",
  });

  const etapas = referencia.etapas.filter(
    (e) => e.projetoId === form.projetoId,
  );

  async function criar() {
    if (!form.titulo.trim()) {
      toast.error("Informe o título da tarefa");
      return;
    }
    setBusy(true);
    try {
      await onCall(
        `${base}/tarefas`,
        {
          method: "POST",
          body: JSON.stringify({
            titulo: form.titulo,
            contexto: form.contexto,
            motivo: form.motivo,
            politicaIa: form.politicaIa,
            projetoId: form.projetoId,
            etapaId: form.etapaId,
            papelId: form.papelId,
            membroId: form.membroId,
            criterios: form.criterios
              .split("\n")
              .map((c) => c.trim())
              .filter(Boolean),
          }),
        },
        "Tarefa criada",
      );
      setOpen(false);
      setForm({
        titulo: "",
        contexto: "",
        motivo: "",
        politicaIa: "",
        projetoId: "",
        etapaId: "",
        papelId: "",
        membroId: "",
        criterios: "",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Tarefas ({tarefas.length})
            </CardTitle>
            <CardDescription>
              Publique a primeira etapa criando tarefas para a squad.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova tarefa</DialogTitle>
                <DialogDescription>
                  Toda tarefa explica o contexto, o motivo e a política de IA.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Field label="Título">
                  <Input
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contexto">
                  <Textarea
                    rows={2}
                    value={form.contexto}
                    onChange={(e) =>
                      setForm({ ...form, contexto: e.target.value })
                    }
                  />
                </Field>
                <Field label="Por que importa">
                  <Textarea
                    rows={2}
                    value={form.motivo}
                    onChange={(e) =>
                      setForm({ ...form, motivo: e.target.value })
                    }
                  />
                </Field>
                <Field label="Política de IA">
                  <Input
                    placeholder="IA permitida para organizar; decisão final da squad"
                    value={form.politicaIa}
                    onChange={(e) =>
                      setForm({ ...form, politicaIa: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Projeto">
                    <Select
                      value={form.projetoId}
                      onValueChange={(v) =>
                        setForm({ ...form, projetoId: v, etapaId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {projetos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Etapa">
                    <Select
                      value={form.etapaId}
                      onValueChange={(v) => setForm({ ...form, etapaId: v })}
                      disabled={!form.projetoId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {etapas.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Papel">
                    <Select
                      value={form.papelId}
                      onValueChange={(v) => setForm({ ...form, papelId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {papeis.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Responsável">
                    <Select
                      value={form.membroId}
                      onValueChange={(v) => setForm({ ...form, membroId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {ativos.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Critérios de aceite (um por linha)">
                  <Textarea
                    rows={3}
                    placeholder={"Todos os requisitos classificados\nDocumento compartilhado com a squad"}
                    value={form.criterios}
                    onChange={(e) =>
                      setForm({ ...form, criterios: e.target.value })
                    }
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button onClick={criar} disabled={busy}>
                  {busy ? "Criando..." : "Criar tarefa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa criada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tarefas.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.titulo}</p>
                  {t.motivo && (
                    <p className="truncate text-xs text-muted-foreground">
                      {t.motivo}
                    </p>
                  )}
                </div>
                <Badge variant="outline">
                  {TAREFA_STATUS_LABEL[t.status] ?? t.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
