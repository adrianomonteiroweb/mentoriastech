"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Flame,
  Languages,
} from "lucide-react";
import type { DailyContext } from "@/lib/db/formacao";
import { formatarFortaleza } from "@/lib/formacao/schedule";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const CAMPOS = [
  {
    key: "concluidoPt",
    label: "Concluído",
    hint: "O que você entregou desde o último encontro?",
    cls: "border-emerald-500/30",
  },
  {
    key: "andamentoPt",
    label: "Em andamento",
    hint: "No que está trabalhando agora?",
    cls: "border-blue-500/30",
  },
  {
    key: "proximoPt",
    label: "Próxima ação",
    hint: "O que fará em seguida?",
    cls: "border-amber-500/30",
  },
  {
    key: "bloqueioPt",
    label: "Bloqueio",
    hint: "O que está impedindo o avanço?",
    cls: "border-red-500/30",
  },
  {
    key: "ajudaPt",
    label: "Ajuda",
    hint: "De quem ou de qual decisão você precisa?",
    cls: "border-purple-500/30",
  },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];

export function DailyPanel({ context }: { context: DailyContext }) {
  const router = useRouter();
  const { encontro, daily } = context;

  const [form, setForm] = useState<Record<CampoKey, string>>({
    concluidoPt: daily?.concluidoPt ?? "",
    andamentoPt: daily?.andamentoPt ?? "",
    proximoPt: daily?.proximoPt ?? "",
    bloqueioPt: daily?.bloqueioPt ?? "",
    ajudaPt: daily?.ajudaPt ?? "",
  });
  const [busy, setBusy] = useState(false);
  const registrada = !!daily?.registradoEm;

  async function registrar() {
    if (!encontro) return;
    setBusy(true);
    try {
      const res = await fetch("/api/formacao/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encontroId: encontro.id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao registrar daily");
      toast.success("Daily registrada");
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

      <PresencePanel context={context} />

      {/* Daily */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold tracking-tight">Sua daily</h1>
          {registrada ? (
            <Badge>Registrada</Badge>
          ) : (
            <Badge variant="secondary">
              {context.diasAteEncontro !== null
                ? `Pendente · faltam ${context.diasAteEncontro} dia(s)`
                : "Pendente"}
            </Badge>
          )}
        </div>

        {!encontro ? (
          <p className="text-sm text-muted-foreground">
            Nenhum encontro agendado ainda.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {CAMPOS.map((c) => (
                <div
                  key={c.key}
                  className={"rounded-xl border-l-2 pl-3 " + c.cls}
                >
                  <Label className="text-xs font-semibold">{c.label}</Label>
                  <Textarea
                    rows={2}
                    placeholder={c.hint}
                    value={form[c.key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [c.key]: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={registrar} disabled={busy}>
                {busy
                  ? "Salvando..."
                  : registrada
                    ? "Atualizar daily"
                    : "Registrar daily"}
              </Button>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                A versão em inglês vem com o instrutor
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PresencePanel({ context }: { context: DailyContext }) {
  const router = useRouter();
  const { encontro } = context;
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    if (!encontro) return;
    setBusy(true);
    try {
      const res = await fetch("/api/formacao/presenca/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encontroId: encontro.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao confirmar presença");
      toast.success("Presença confirmada");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Streaks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Flame className="h-4 w-4" />
            <span className="text-lg font-bold">{context.meetingStreak}</span>
          </div>
          <p className="text-xs text-muted-foreground">domingos seguidos</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <Languages className="h-4 w-4" />
            <span className="text-lg font-bold">{context.dailyStreak}</span>
          </div>
          <p className="text-xs text-muted-foreground">dailies em dia</p>
        </div>
      </div>

      {/* Confirmação de presença (loss-aversion) */}
      {encontro && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                Próximo encontro · #{encontro.numero}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatarFortaleza(encontro.data)}
              </p>
            </div>
            {context.presencaConfirmada ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Confirmada
              </span>
            ) : (
              <Button size="sm" onClick={confirmar} disabled={busy}>
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                Confirmar presença
              </Button>
            )}
          </div>
          {!context.presencaConfirmada && context.meetingStreak > 0 && (
            <p className="mt-2 text-xs text-amber-500">
              {context.meetingStreak} domingos seguidos · confirme para não
              perder a sequência.
            </p>
          )}
        </div>
      )}

      {/* Transparência de atrasos */}
      {context.atrasos.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Atrasos registrados
          </p>
          <ul className="space-y-1">
            {context.atrasos.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>{a.tipo}</span>
                <span>{a.detalhe}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
