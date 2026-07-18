"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Plus, Users } from "lucide-react";
import type { TurmaResumo } from "@/lib/db/formacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ativa: "default",
  planejada: "secondary",
  concluida: "outline",
  cancelada: "outline",
};

export function TurmasDashboard({
  turmasIniciais,
}: {
  turmasIniciais: TurmaResumo[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    empresaFicticia: "",
    linkMeet: "",
    dataInicio: "",
  });

  async function criarTurma() {
    if (!form.nome.trim() || !form.dataInicio) {
      toast.error("Informe o nome e a data de início");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/formacao/instrutor/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao criar turma");
      toast.success("Turma criada");
      setOpen(false);
      setForm({ nome: "", empresaFicticia: "", linkMeet: "", dataInicio: "" });
      router.push(`/formacao/instrutor/turma/${json.data.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            Cada turma é uma squad de até 5 alunos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nova turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova turma</DialogTitle>
              <DialogDescription>
                Os encontros de domingo (10h, Fortaleza) são gerados depois, na
                tela da turma.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome da turma</Label>
                <Input
                  id="nome"
                  placeholder="Squad Nebulosa"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa">Empresa fictícia (opcional)</Label>
                <Input
                  id="empresa"
                  placeholder="Nebulosa Studio"
                  value={form.empresaFicticia}
                  onChange={(e) =>
                    setForm({ ...form, empresaFicticia: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meet">Link do Google Meet (opcional)</Label>
                <Input
                  id="meet"
                  placeholder="https://meet.google.com/..."
                  value={form.linkMeet}
                  onChange={(e) =>
                    setForm({ ...form, linkMeet: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Data de início</Label>
                <Input
                  id="inicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) =>
                    setForm({ ...form, dataInicio: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Os encontros começam no primeiro domingo a partir desta data.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={criarTurma} disabled={saving}>
                {saving ? "Criando..." : "Criar turma"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {turmasIniciais.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nenhuma turma ainda</p>
          <p className="text-sm text-muted-foreground">
            Crie a primeira turma para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {turmasIniciais.map((t) => (
            <Link
              key={t.id}
              href={`/formacao/instrutor/turma/${t.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium group-hover:text-primary">
                  {t.nome}
                </span>
                <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </Badge>
              </div>
              {t.empresaFicticia && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.empresaFicticia}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t.totalMembros}/5 alunos
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t.totalEncontros} encontros
                </span>
                <span>Fase {t.faseAtual}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
