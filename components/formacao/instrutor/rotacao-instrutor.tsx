"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import type { RotacaoInstrutorContext as _RIC } from "@/lib/db/formacao";

type RotacaoInstrutorContext = Omit<_RIC, "encontros"> & {
  encontros: Array<{ id: string; numero: number; data: string | Date }>;
};
import { roleColor } from "@/lib/formacao/role-colors";
import { Badge } from "@/components/ui/badge";

interface Props {
  turmaId: string;
  turmaNome: string;
  context: RotacaoInstrutorContext;
}

export function RotacaoInstrutor({ turmaId, turmaNome, context }: Props) {
  const { papeis, membros, alertas, encontros, atribuicoes } = context;

  const alertasNunca = alertas.filter((a) => a.tipo === "nunca_exercido");
  const alertasAbaixo = alertas.filter((a) => a.tipo === "abaixo_minimo");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/formacao/instrutor/turma/${turmaId}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Rotação de papéis</h1>
          <p className="text-sm text-muted-foreground">{turmaNome}</p>
        </div>
      </div>

      {/* Alertas */}
      {alertasNunca.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Papéis nunca exercidos ({alertasNunca.length})
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {alertasNunca.map((a, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium">{a.membroNome || "—"}</span> →{" "}
                <span className="font-medium">{a.papelNome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alertasAbaixo.length > 0 && alertasNunca.length === 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 text-blue-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Papéis abaixo do mínimo ({alertasAbaixo.length})
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {alertasAbaixo.map((a, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium">{a.membroNome || "—"}</span> →{" "}
                <span className="font-medium">{a.papelNome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matriz membros × papéis */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Matriz de rotação</h2>
          <p className="text-xs text-muted-foreground">
            Contagem de vezes que cada membro exerceu cada papel
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Membro
                </th>
                {papeis.map((p) => {
                  const colors = roleColor(p.cor);
                  return (
                    <th key={p.id} className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-medium ${colors.text}`}>
                        {p.nomeCurto || p.nome}
                      </span>
                      <br />
                      <span className="text-[10px] text-muted-foreground">
                        min {p.minOcorrencias}×
                      </span>
                    </th>
                  );
                })}
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">
                  Progresso
                </th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => {
                const completo = m.total >= m.totalRequerido;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {m.iniciais || "??"}
                        </div>
                        <span>{m.nome || "—"}</span>
                      </div>
                    </td>
                    {papeis.map((p) => {
                      const count = m.contagem[p.id] ?? 0;
                      const colors = roleColor(p.cor);
                      const atendido = count >= p.minOcorrencias;
                      return (
                        <td key={p.id} className="px-3 py-2.5 text-center">
                          {count > 0 ? (
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                atendido
                                  ? `${colors.bg} ${colors.text}`
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {count}
                            </span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10 text-xs font-bold text-red-400">
                              0
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {completo ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {m.total}/{m.totalRequerido}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico por encontro */}
      {encontros.length > 0 && atribuicoes.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Histórico por encontro</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    Membro
                  </th>
                  {encontros.map((e) => (
                    <th
                      key={e.id}
                      className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      #{e.numero}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membros.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2 text-xs">
                      {m.nome || m.iniciais || "—"}
                    </td>
                    {encontros.map((e) => {
                      const atrib = atribuicoes.find(
                        (a) =>
                          a.membroId === m.id && a.encontroNumero === e.numero,
                      );
                      if (!atrib) {
                        return (
                          <td
                            key={e.id}
                            className="px-2 py-2 text-center text-[10px] text-muted-foreground/40"
                          >
                            —
                          </td>
                        );
                      }
                      const papel = papeis.find((p) => p.id === atrib.papelId);
                      const colors = roleColor(papel?.cor);
                      return (
                        <td key={e.id} className="px-2 py-2 text-center">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                          >
                            {papel?.nomeCurto || papel?.nome || "?"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
