"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Languages,
  Lock,
  MessageSquare,
  Shield,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { EncontroCondutorContext } from "@/lib/db/formacao";
import { formatarFortaleza } from "@/lib/formacao/schedule";
import { roleColor } from "@/lib/formacao/role-colors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESENCA_OPTIONS = [
  { value: "presente", label: "Presente", icon: CheckCircle2, cls: "text-emerald-500" },
  { value: "atrasado", label: "Atrasado", icon: Clock, cls: "text-amber-500" },
  { value: "ausente", label: "Ausente", icon: XCircle, cls: "text-red-500" },
  { value: "pendente", label: "Pendente", icon: Circle, cls: "text-muted-foreground" },
] as const;

export function EncontroCondutor({ context }: { context: EncontroCondutorContext }) {
  const router = useRouter();
  const { encontro, turma, membros, todosComPresenca } = context;
  const base = `/api/formacao/instrutor/encontros/${encontro.id}`;

  const [decisoes, setDecisoes] = useState(encontro.decisoes ?? "");
  const [proximosPassos, setProximosPassos] = useState(encontro.proximosPassos ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [liberando, setLiberando] = useState(false);

  async function salvarNotas() {
    setSavingNotes(true);
    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisoes, proximosPassos }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar");
      }
      toast.success("Notas salvas");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingNotes(false);
    }
  }

  async function liberarEtapa() {
    setLiberando(true);
    try {
      const res = await fetch(`${base}/liberar-etapa`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erro ao liberar");
      toast.success(json.message || "Etapa liberada");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao liberar");
    } finally {
      setLiberando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/formacao/instrutor/turma/${turma.id}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            Encontro #{encontro.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatarFortaleza(encontro.data)} · {turma.nome}
          </p>
        </div>
        <Badge
          variant={
            encontro.status === "realizado"
              ? "default"
              : encontro.status === "cancelado"
                ? "destructive"
                : "secondary"
          }
        >
          {encontro.status === "realizado"
            ? "Realizado"
            : encontro.status === "cancelado"
              ? "Cancelado"
              : "Agendado"}
        </Badge>
      </div>

      {/* Membros — daily + presença */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Alunos ({membros.length})
        </h2>
        {membros.map((m) => (
          <MembroSection key={m.id} membro={m} encontroId={encontro.id} />
        ))}
      </div>

      {/* Decisões e próximos passos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Decisões da reunião</label>
          <Textarea
            value={decisoes}
            onChange={(e) => setDecisoes(e.target.value)}
            placeholder="Registre decisões tomadas durante o encontro..."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Próximos passos</label>
          <Textarea
            value={proximosPassos}
            onChange={(e) => setProximosPassos(e.target.value)}
            placeholder="O que cada pessoa vai fazer até o próximo encontro..."
            rows={4}
          />
        </div>
      </div>
      <Button onClick={salvarNotas} disabled={savingNotes} variant="outline">
        {savingNotes ? "Salvando..." : "Salvar notas"}
      </Button>

      {/* Liberar próxima etapa */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Liberar próxima etapa</p>
            <p className="text-xs text-muted-foreground">
              {todosComPresenca
                ? "Todos com presença registrada — pode liberar."
                : "Registre a presença de todos os membros antes de liberar."}
            </p>
          </div>
          <Button
            onClick={liberarEtapa}
            disabled={!todosComPresenca || liberando || encontro.status === "realizado"}
            size="sm"
          >
            {liberando ? "Liberando..." : encontro.status === "realizado" ? "Já liberado" : "Liberar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MembroSection({
  membro,
  encontroId,
}: {
  membro: EncontroCondutorContext["membros"][number];
  encontroId: string;
}) {
  const router = useRouter();
  const [falaPt, setFalaPt] = useState("");
  const [falaEn, setFalaEn] = useState(membro.ingles?.fraseCompletaEn ?? "");
  const [saving, setSaving] = useState(false);

  const colors = roleColor(membro.papel?.cor);

  async function salvarFala() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/formacao/instrutor/encontros/${encontroId}/daily/${membro.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fraseCompletaPt: falaPt || undefined,
            fraseCompletaEn: falaEn || undefined,
          }),
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar");
      }
      toast.success(`Fala de ${membro.nome || "membro"} salva`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function marcarPresenca(value: string) {
    try {
      const res = await fetch(
        `/api/formacao/instrutor/encontros/${encontroId}/presenca`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membroId: membro.id, presenca: value }),
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao marcar presença");
      }
      toast.success("Presença atualizada");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  const presencaAtual = membro.presenca?.presenca ?? "pendente";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header do membro */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {membro.iniciais || "??"}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{membro.nome || "—"}</p>
          {membro.papel && (
            <span
              className={`inline-flex items-center gap-1 text-xs ${colors.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {membro.papel.nome}
            </span>
          )}
        </div>
        {/* Presença toggle */}
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <Select value={presencaAtual} onValueChange={marcarPresenca}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESENCA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className={`flex items-center gap-1.5 ${opt.cls}`}>
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daily do aluno */}
      {membro.daily ? (
        <div className="mt-3 rounded-md bg-secondary/50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Daily registrada
          </p>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            {membro.daily.concluidoPt && (
              <div>
                <span className="font-medium text-emerald-500">Concluído:</span>{" "}
                {membro.daily.concluidoPt}
              </div>
            )}
            {membro.daily.andamentoPt && (
              <div>
                <span className="font-medium text-blue-500">Andamento:</span>{" "}
                {membro.daily.andamentoPt}
              </div>
            )}
            {membro.daily.proximoPt && (
              <div>
                <span className="font-medium text-amber-500">Próximo:</span>{" "}
                {membro.daily.proximoPt}
              </div>
            )}
            {membro.daily.bloqueioPt && (
              <div>
                <span className="font-medium text-red-500">Bloqueio:</span>{" "}
                {membro.daily.bloqueioPt}
              </div>
            )}
            {membro.daily.ajudaPt && (
              <div className="sm:col-span-2">
                <span className="font-medium text-purple-500">Ajuda:</span>{" "}
                {membro.daily.ajudaPt}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground/60">
          Daily não registrada ainda.
        </p>
      )}

      {/* Fala PT + EN (instrutor documenta) */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Fala em PT (doc)
          </label>
          <Textarea
            value={falaPt}
            onChange={(e) => setFalaPt(e.target.value)}
            placeholder="Documentar fala do aluno..."
            rows={2}
            className="text-xs"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Languages className="h-3 w-3" />
            Versão em inglês
          </label>
          <Textarea
            value={falaEn}
            onChange={(e) => setFalaEn(e.target.value)}
            placeholder="English version..."
            rows={2}
            className="text-xs"
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2 text-xs"
        onClick={salvarFala}
        disabled={saving || (!falaPt && !falaEn)}
      >
        {saving ? "Salvando..." : "Salvar fala"}
      </Button>
    </div>
  );
}
