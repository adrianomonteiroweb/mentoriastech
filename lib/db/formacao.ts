import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import {
  db,
  formacaoAtribuicoesPapel,
  formacaoDailyEntries,
  formacaoEncontros,
  formacaoEtapas,
  formacaoFases,
  formacaoMembros,
  formacaoPapeis,
  formacaoPresencas,
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

// ---------------------------------------------------------------------------
// Home do aluno — consolida "onde parei / o que faço agora / por quê / meu papel"
// ---------------------------------------------------------------------------

export type EstadoEtapa = "concluida" | "atual" | "bloqueada"

export interface TurmaHome {
  turma: Pick<
    FormacaoTurma,
    "id" | "nome" | "empresaFicticia" | "faseAtual" | "linkMeet"
  >
  membro: Pick<FormacaoMembro, "id" | "nome" | "iniciais">
  papelAtual: Pick<
    FormacaoPapel,
    "nome" | "cor" | "responsabilidades"
  > | null
  proximoEncontro: Pick<
    FormacaoEncontro,
    "id" | "numero" | "data" | "linkMeet" | "pauta"
  > | null
  projetoAtual: Pick<FormacaoProjeto, "nome" | "numero"> | null
  etapaAtual: FormacaoEtapa | null
  sequencia: Array<{ id: string; nome: string; estado: EstadoEtapa }>
  continuidade: {
    parou: string | null
    agora: string | null
    importa: string | null
    proximaAcao: string | null
  }
  progresso: {
    percent: number
    entregas: Array<{ id: string; nome: string; estado: EstadoEtapa }>
  }
  tarefaAtual: Pick<FormacaoTarefa, "id" | "titulo" | "status"> | null
  squad: Array<{
    id: string
    nome: string | null
    iniciais: string | null
    isMe: boolean
    papel: string | null
    dailyOk: boolean
    presencaOk: boolean
  }>
}

const TAREFA_ATIVAS = [
  "a_fazer",
  "em_andamento",
  "bloqueada",
  "em_revisao",
] as const

/** Agrega todos os dados da tela inicial do aluno em uma única estrutura. */
export async function getTurmaHome(
  turma: FormacaoTurma,
  membro: FormacaoMembro,
): Promise<TurmaHome> {
  const now = new Date()

  // Encontros → próximo (data >= agora) ou o último realizado.
  const encontros = await db
    .select()
    .from(formacaoEncontros)
    .where(eq(formacaoEncontros.turmaId, turma.id))
    .orderBy(asc(formacaoEncontros.numero))
  const proximo =
    encontros.find((e) => new Date(e.data) >= now) ??
    encontros[encontros.length - 1] ??
    null

  // Papel do aluno no próximo encontro.
  let papelAtual: TurmaHome["papelAtual"] = null
  if (proximo) {
    const [row] = await db
      .select({ papel: formacaoPapeis })
      .from(formacaoAtribuicoesPapel)
      .innerJoin(
        formacaoPapeis,
        eq(formacaoAtribuicoesPapel.papelId, formacaoPapeis.id),
      )
      .where(
        and(
          eq(formacaoAtribuicoesPapel.membroId, membro.id),
          eq(formacaoAtribuicoesPapel.encontroId, proximo.id),
        ),
      )
      .limit(1)
    if (row) {
      papelAtual = {
        nome: row.papel.nome,
        cor: row.papel.cor,
        responsabilidades: row.papel.responsabilidades,
      }
    }
  }

  // Projeto/etapa atual: preferir o que o instrutor marcou no encontro; senão,
  // o primeiro projeto da fase atual e sua primeira etapa.
  const projetosFase = await db
    .select()
    .from(formacaoProjetos)
    .innerJoin(formacaoFases, eq(formacaoProjetos.faseId, formacaoFases.id))
    .where(eq(formacaoFases.numero, turma.faseAtual))
    .orderBy(asc(formacaoProjetos.ordem))
  const projetos = projetosFase.map((r) => r.formacao_projetos)

  const projetoAtual =
    (proximo?.projetoId
      ? projetos.find((p) => p.id === proximo.projetoId)
      : null) ??
    projetos[0] ??
    null

  let etapas: FormacaoEtapa[] = []
  if (projetoAtual) {
    etapas = await db
      .select()
      .from(formacaoEtapas)
      .where(eq(formacaoEtapas.projetoId, projetoAtual.id))
      .orderBy(asc(formacaoEtapas.ordem))
  }

  const etapaAtual =
    (proximo?.etapaId
      ? etapas.find((e) => e.id === proximo.etapaId)
      : null) ??
    etapas[0] ??
    null

  const idxAtual = etapaAtual
    ? etapas.findIndex((e) => e.id === etapaAtual.id)
    : -1

  const estadoDe = (i: number): EstadoEtapa =>
    idxAtual < 0 || i === idxAtual
      ? "atual"
      : i < idxAtual
        ? "concluida"
        : "bloqueada"

  const sequencia = etapas.map((e, i) => ({
    id: e.id,
    nome: e.nome,
    estado: estadoDe(i),
  }))

  const percent =
    etapas.length > 0 && idxAtual >= 0
      ? Math.round((idxAtual / etapas.length) * 100)
      : 0

  // Tarefa ativa do aluno.
  const [tarefa] = await db
    .select()
    .from(formacaoTarefas)
    .where(
      and(
        eq(formacaoTarefas.turmaId, turma.id),
        eq(formacaoTarefas.membroId, membro.id),
        inArray(formacaoTarefas.status, TAREFA_ATIVAS),
      ),
    )
    .orderBy(asc(formacaoTarefas.ordem), desc(formacaoTarefas.createdAt))
    .limit(1)

  const etapaAnterior = idxAtual > 0 ? etapas[idxAtual - 1] : null
  const continuidade = {
    parou: etapaAnterior
      ? etapaAnterior.oQueEntregar || `Você concluiu: ${etapaAnterior.nome}`
      : null,
    agora: etapaAtual
      ? etapaAtual.oQueE || `Você está em: ${etapaAtual.nome}`
      : null,
    importa: etapaAtual?.porQueExiste ?? null,
    proximaAcao: tarefa?.titulo || etapaAtual?.oQueEntregar || null,
  }

  // Squad: membros + papel/daily/presença no próximo encontro.
  const membros = await db
    .select()
    .from(formacaoMembros)
    .where(
      and(
        eq(formacaoMembros.turmaId, turma.id),
        sql`${formacaoMembros.status} <> 'inativo'`,
      ),
    )
    .orderBy(asc(formacaoMembros.convidadoEm))

  let papelPorMembro = new Map<string, string>()
  let dailyOk = new Set<string>()
  let presencaOk = new Set<string>()
  if (proximo) {
    const [atribs, dailies, presencas] = await Promise.all([
      db
        .select({
          membroId: formacaoAtribuicoesPapel.membroId,
          nome: formacaoPapeis.nomeCurto,
          nomeFull: formacaoPapeis.nome,
        })
        .from(formacaoAtribuicoesPapel)
        .innerJoin(
          formacaoPapeis,
          eq(formacaoAtribuicoesPapel.papelId, formacaoPapeis.id),
        )
        .where(eq(formacaoAtribuicoesPapel.encontroId, proximo.id)),
      db
        .select({ membroId: formacaoDailyEntries.membroId })
        .from(formacaoDailyEntries)
        .where(
          and(
            eq(formacaoDailyEntries.encontroId, proximo.id),
            isNotNull(formacaoDailyEntries.registradoEm),
          ),
        ),
      db
        .select({ membroId: formacaoPresencas.membroId })
        .from(formacaoPresencas)
        .where(
          and(
            eq(formacaoPresencas.encontroId, proximo.id),
            isNotNull(formacaoPresencas.confirmadoEm),
          ),
        ),
    ])
    papelPorMembro = new Map(
      atribs.map((a) => [a.membroId, a.nome || a.nomeFull]),
    )
    dailyOk = new Set(dailies.map((d) => d.membroId))
    presencaOk = new Set(presencas.map((p) => p.membroId))
  }

  const squad = membros.map((m) => ({
    id: m.id,
    nome: m.nome,
    iniciais: m.iniciais,
    isMe: m.id === membro.id,
    papel: papelPorMembro.get(m.id) ?? null,
    dailyOk: dailyOk.has(m.id),
    presencaOk: presencaOk.has(m.id),
  }))

  return {
    turma: {
      id: turma.id,
      nome: turma.nome,
      empresaFicticia: turma.empresaFicticia,
      faseAtual: turma.faseAtual,
      linkMeet: turma.linkMeet,
    },
    membro: { id: membro.id, nome: membro.nome, iniciais: membro.iniciais },
    papelAtual,
    proximoEncontro: proximo
      ? {
          id: proximo.id,
          numero: proximo.numero,
          data: proximo.data,
          linkMeet: proximo.linkMeet || turma.linkMeet,
          pauta: proximo.pauta,
        }
      : null,
    projetoAtual: projetoAtual
      ? { nome: projetoAtual.nome, numero: projetoAtual.numero }
      : null,
    etapaAtual,
    sequencia,
    continuidade,
    progresso: {
      percent,
      entregas: sequencia.map((s) => ({
        id: s.id,
        nome: s.nome,
        estado: s.estado,
      })),
    },
    tarefaAtual: tarefa
      ? { id: tarefa.id, titulo: tarefa.titulo, status: tarefa.status }
      : null,
    squad,
  }
}
