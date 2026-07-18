"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TarefaDetalhe } from "@/lib/db/formacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ENTREGA_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  correcao_solicitada: "Correção solicitada",
  aprovada: "Aprovada",
};

export function TarefaReviewDialog({
  tarefaId,
  titulo,
}: {
  tarefaId: string;
  titulo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<TarefaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/formacao/instrutor/tarefas/${tarefaId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar");
      setDetalhe(json.data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) carregar();
  }

  async function revisar(entregaId: string, acao: "aprovar" | "solicitar_correcao") {
    setBusyId(entregaId);
    try {
      const res = await fetch(`/api/formacao/instrutor/entregas/${entregaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, comentario: comentarios[entregaId] || "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao revisar");
      toast.success(acao === "aprovar" ? "Entrega aprovada" : "Correção solicitada");
      await carregar();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Revisar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Aprove ou solicite correção das entregas dos alunos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : !detalhe || detalhe.entregas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma entrega enviada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {detalhe.entregas.map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">v{e.versao} · {e.tipo}</span>
                  <Badge variant={e.status === "aprovada" ? "default" : "outline"}>
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
                    Abrir arquivo
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
                        {f.comentario}
                      </p>
                    ))}
                  </div>
                )}

                {e.status !== "aprovada" && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Comentário (opcional)"
                      value={comentarios[e.id] || ""}
                      onChange={(ev) =>
                        setComentarios((c) => ({ ...c, [e.id]: ev.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === e.id}
                        onClick={() => revisar(e.id, "aprovar")}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === e.id}
                        onClick={() => revisar(e.id, "solicitar_correcao")}
                      >
                        Solicitar correção
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
