import { and, asc, desc, eq, sql } from "drizzle-orm"
import {
  db,
  formacaoAtribuicoesPapel,
  formacaoEncontros,
  formacaoEtapas,
  formacaoFases,
  formacaoMembros,
  formacaoPapeis,
  formacaoProjetos,
  formacaoTarefas,
  formacaoTurmas,
  type FormacaoAtribuicaoPapel,
  type FormacaoEncontro,
  type FormacaoEtapa,
  type FormacaoFase,
  type FormacaoMembro,
  type FormacaoPapel,
  type FormacaoProjeto,
  type FormacaoTarefa,
  type FormacaoTurma,
} from "@/lib/db"

/**
 * Helpers de consulta da Órbita (Formação em Squad). Mantém as rotas/páginas
 * finas — padrão de lib/db/sim.ts.
 */

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export interface FormacaoMembership {
  membro: FormacaoMembro
  turma: FormacaoTurma
}

/**
 * Retorna o vínculo ativo do aluno (membro ativo em turma ativa) a partir do
 * email da sessão de mentee-access. Null quando o aluno ainda não faz parte de
 * uma turma ativa (ex.: convidado, turma planejada, ou sem turma).
 */
export async function getActiveTurmaMembershipForEmail(
  email: string,
): Promise<FormacaoMembership | null> {
  const normalized = normalizeEmail(email)

  const [row] = await db
    .select({ membro: formacaoMembros, turma: formacaoTurmas })
    .from(formacaoMembros)
    .innerJoin(formacaoTurmas, eq(formacaoMembros.turmaId, formacaoTurmas.id))
    .where(
      and(
        eq(formacaoMembros.email, normalized),
        eq(formacaoMembros.status, "ativo"),
        eq(formacaoTurmas.status, "ativa"),
      ),
    )
    .limit(1)

  return row ?? null
}

/**
 * Qualquer vínculo do aluno (inclui turmas planejadas e convites pendentes),
 * usado para diferenciar "convidado, aguardando início" de "sem turma".
 */
export async function getAnyTurmaMembershipForEmail(
  email: string,
): Promise<FormacaoMembership | null> {
  const normalized = normalizeEmail(email)

  const [row] = await db
    .select({ membro: formacaoMembros, turma: formacaoTurmas })
    .from(formacaoMembros)
    .innerJoin(formacaoTurmas, eq(formacaoMembros.turmaId, formacaoTurmas.id))
    .where(eq(formacaoMembros.email, normalized))
    .limit(1)

  return row ?? null
}

export async function getTurmaById(
  id: string,
): Promise<FormacaoTurma | null> {
  const [row] = await db
    .select()
    .from(formacaoTurmas)
    .where(eq(formacaoTurmas.id, id))
    .limit(1)

  return row ?? null
}

// ---------------------------------------------------------------------------
// Instrutor
// ---------------------------------------------------------------------------

export const MAX_MEMBROS_POR_TURMA = 5

export interface TurmaResumo extends FormacaoTurma {
  totalMembros: number
  totalEncontros: number
}

/** Lista turmas com contagem de membros/encontros (ativas primeiro). */
export async function listarTurmas(): Promise<TurmaResumo[]> {
  const rows = await db
    .select({
      turma: formacaoTurmas,
      totalMembros: sql<number>`(
        SELECT count(*) FROM ${formacaoMembros}
        WHERE ${formacaoMembros.turmaId} = ${formacaoTurmas.id}
          AND ${formacaoMembros.status} <> 'inativo'
      )`,
      totalEncontros: sql<number>`(
        SELECT count(*) FROM ${formacaoEncontros}
        WHERE ${formacaoEncontros.turmaId} = ${formacaoTurmas.id}
      )`,
    })
    .from(formacaoTurmas)
    .orderBy(
      sql`case when ${formacaoTurmas.status} = 'ativa' then 0
               when ${formacaoTurmas.status} = 'planejada' then 1
               else 2 end`,
      desc(formacaoTurmas.createdAt),
    )

  return rows.map((r) => ({
    ...r.turma,
    totalMembros: Number(r.totalMembros),
    totalEncontros: Number(r.totalEncontros),
  }))
}

/** Conta membros não-inativos de uma turma (checagem do limite de 5). */
export async function contarMembrosAtivos(turmaId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(formacaoMembros)
    .where(
      and(
        eq(formacaoMembros.turmaId, turmaId),
        sql`${formacaoMembros.status} <> 'inativo'`,
      ),
    )

  return Number(row?.total ?? 0)
}

export interface TurmaDetalhe {
  turma: FormacaoTurma
  membros: FormacaoMembro[]
  encontros: FormacaoEncontro[]
  papeis: FormacaoPapel[]
  atribuicoes: FormacaoAtribuicaoPapel[]
  tarefas: FormacaoTarefa[]
}

/** Detalhe completo de uma turma para a tela de gestão do instrutor. */
export async function getTurmaDetalhe(
  turmaId: string,
): Promise<TurmaDetalhe | null> {
  const turma = await getTurmaById(turmaId)
  if (!turma) return null

  const [membros, encontros, papeis, atribuicoes, tarefas] = await Promise.all([
    db
      .select()
      .from(formacaoMembros)
      .where(eq(formacaoMembros.turmaId, turmaId))
      .orderBy(asc(formacaoMembros.convidadoEm)),
    db
      .select()
      .from(formacaoEncontros)
      .where(eq(formacaoEncontros.turmaId, turmaId))
      .orderBy(asc(formacaoEncontros.numero)),
    db
      .select()
      .from(formacaoPapeis)
      .innerJoin(formacaoFases, eq(formacaoPapeis.faseId, formacaoFases.id))
      .where(eq(formacaoFases.numero, turma.faseAtual))
      .orderBy(asc(formacaoPapeis.ordem)),
    db
      .select()
      .from(formacaoAtribuicoesPapel)
      .where(eq(formacaoAtribuicoesPapel.turmaId, turmaId)),
    db
      .select()
      .from(formacaoTarefas)
      .where(eq(formacaoTarefas.turmaId, turmaId))
      .orderBy(asc(formacaoTarefas.ordem), desc(formacaoTarefas.createdAt)),
  ])

  return {
    turma,
    membros,
    encontros,
    papeis: papeis.map((p) => p.formacao_papeis),
    atribuicoes,
    tarefas,
  }
}

export interface Referencia {
  fases: FormacaoFase[]
  papeis: FormacaoPapel[]
  projetos: FormacaoProjeto[]
  etapas: FormacaoEtapa[]
}

/** Dados de seed (fases, papéis, projetos, etapas) para os formulários. */
export async function getReferencia(): Promise<Referencia> {
  const [fases, papeis, projetos, etapas] = await Promise.all([
    db.select().from(formacaoFases).orderBy(asc(formacaoFases.ordem)),
    db.select().from(formacaoPapeis).orderBy(asc(formacaoPapeis.ordem)),
    db.select().from(formacaoProjetos).orderBy(asc(formacaoProjetos.ordem)),
    db.select().from(formacaoEtapas).orderBy(asc(formacaoEtapas.ordem)),
  ])

  return { fases, papeis, projetos, etapas }
}
