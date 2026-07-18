"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle, Award } from "lucide-react";
import type { RotacaoContext } from "@/lib/db/formacao";
import { roleColor } from "@/lib/formacao/role-colors";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function RolesMatrix({ context }: { context: RotacaoContext }) {
  const { papeis, membros, alertas, meuProgresso } = context;
  const eu = membros.find((m) => m.isMe);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/formacao/turma"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Minha rotação de papéis</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe quais papéis você já exerceu na squad
          </p>
        </div>
      </div>

      {/* Indicador pessoal */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Você: {meuProgresso.exercidos}/{meuProgresso.total} papéis
            </span>
          </div>
          <Badge
            variant={
              meuProgresso.exercidos >= meuProgresso.total
                ? "default"
                : "secondary"
            }
          >
            {meuProgresso.exercidos >= meuProgresso.total
              ? "Certificado desbloqueado"
              : `Faltam ${meuProgresso.total - meuProgresso.exercidos}`}
          </Badge>
        </div>
        <Progress
          value={
            meuProgresso.total > 0
              ? (meuProgresso.exercidos / meuProgresso.total) * 100
              : 0
          }
          className="mt-3 h-2"
        />
        {eu && (
          <div className="mt-3 flex flex-wrap gap-2">
            {papeis.map((p) => {
              const count = eu.contagem[p.id] ?? 0;
              const colors = roleColor(p.cor);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    count > 0
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      count > 0 ? colors.dot : "bg-muted-foreground/40"
                    }`}
                  />
                  {p.nomeCurto || p.nome}
                  {count > 0 && (
                    <span className="ml-0.5 opacity-70">×{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Matriz membros × papéis */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Membro
                </th>
                {papeis.map((p) => {
                  const colors = roleColor(p.cor);
                  return (
                    <th
                      key={p.id}
                      className="px-2 py-2.5 text-center font-medium"
                    >
                      <span className={`text-xs ${colors.text}`}>
                        {p.nomeCurto || p.nome}
                      </span>
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-border/50 last:border-0 ${
                    m.isMe ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                        {m.iniciais || "??"}
                      </div>
                      <span className={m.isMe ? "font-medium" : ""}>
                        {m.nome || "—"}
                        {m.isMe && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (você)
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  {papeis.map((p) => {
                    const count = m.contagem[p.id] ?? 0;
                    const colors = roleColor(p.cor);
                    return (
                      <td key={p.id} className="px-2 py-2.5 text-center">
                        {count > 0 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/30 text-xs text-muted-foreground/50">
                            0
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-medium">
                      {m.total}/{m.totalRequerido}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas: papéis nunca exercidos */}
      {alertas.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Papéis pendentes na squad
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {alertas
              .filter((a) => a.tipo === "nunca_exercido")
              .slice(0, 8)
              .map((a, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground"
                >
                  <span className="font-medium">{a.membroNome || "—"}</span>{" "}
                  ainda não exerceu{" "}
                  <span className="font-medium">{a.papelNome}</span>
                </li>
              ))}
            {alertas.filter((a) => a.tipo === "nunca_exercido").length > 8 && (
              <li className="text-xs text-muted-foreground">
                +{alertas.filter((a) => a.tipo === "nunca_exercido").length - 8}{" "}
                outros
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
