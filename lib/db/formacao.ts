import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import {
  db,
  formacaoAtribuicoesPapel,
  formacaoCriteriosAceite,
  formacaoDailyEntries,
  formacaoDailyIngles,
  formacaoEncontros,
  formacaoEntregas,
  formacaoEtapas,
  formacaoFases,
  formacaoFeedbacks,
  formacaoMembros,
  formacaoPapeis,
  formacaoPresencas,
  formacaoProjetos,
  formacaoTarefas,
  formacaoTurmas,
  type FormacaoAtribuicaoPapel,
  type FormacaoCriterioAceite,
  type FormacaoDailyEntry,
  type FormacaoDailyIngles,
  type FormacaoEncontro,
  type FormacaoEntrega,
  type FormacaoEtapa,
  type FormacaoFase,
  type FormacaoFeedback,
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
// Tarefa e entrega (Sprint 4)
// ---------------------------------------------------------------------------

export interface EntregaComFeedbacks extends FormacaoEntrega {
  feedbacks: FormacaoFeedback[]
}

export interface TarefaDetalhe {
  tarefa: FormacaoTarefa
  criterios: FormacaoCriterioAceite[]
  entregas: EntregaComFeedbacks[]
  projetoNome: string | null
  etapaNome: string | null
  papelNome: string | null
  papelCor: string | null
  responsavelNome: string | null
}

/** Detalhe completo de uma tarefa (todas as entregas) — visão do instrutor. */
export async function getTarefaDetalhe(
  tarefaId: string,
): Promise<TarefaDetalhe | null> {
  const [tarefa] = await db
    .select()
    .from(formacaoTarefas)
    .where(eq(formacaoTarefas.id, tarefaId))
    .limit(1)
  if (!tarefa) return null

  const [criterios, entregas, projeto, etapa, papel, responsavel] =
    await Promise.all([
      db
        .select()
        .from(formacaoCriteriosAceite)
        .where(eq(formacaoCriteriosAceite.tarefaId, tarefaId))
        .orderBy(asc(formacaoCriteriosAceite.ordem)),
      db
        .select()
        .from(formacaoEntregas)
        .where(eq(formacaoEntregas.tarefaId, tarefaId))
        .orderBy(desc(formacaoEntregas.createdAt)),
      tarefa.projetoId
        ? db
            .select({ nome: formacaoProjetos.nome })
            .from(formacaoProjetos)
            .where(eq(formacaoProjetos.id, tarefa.projetoId))
            .limit(1)
        : Promise.resolve([]),
      tarefa.etapaId
        ? db
            .select({ nome: formacaoEtapas.nome })
            .from(formacaoEtapas)
            .where(eq(formacaoEtapas.id, tarefa.etapaId))
            .limit(1)
        : Promise.resolve([]),
      tarefa.papelId
        ? db
            .select({ nome: formacaoPapeis.nome, cor: formacaoPapeis.cor })
            .from(formacaoPapeis)
            .where(eq(formacaoPapeis.id, tarefa.papelId))
            .limit(1)
        : Promise.resolve([]),
      tarefa.membroId
        ? db
            .select({ nome: formacaoMembros.nome, email: formacaoMembros.email })
            .from(formacaoMembros)
            .where(eq(formacaoMembros.id, tarefa.membroId))
            .limit(1)
        : Promise.resolve([]),
    ])

  const entregaIds = entregas.map((e) => e.id)
  const feedbacks = entregaIds.length
    ? await db
        .select()
        .from(formacaoFeedbacks)
        .where(inArray(formacaoFeedbacks.entregaId, entregaIds))
        .orderBy(asc(formacaoFeedbacks.createdAt))
    : []

  const feedbacksPorEntrega = new Map<string, FormacaoFeedback[]>()
  for (const f of feedbacks) {
    const arr = feedbacksPorEntrega.get(f.entregaId) ?? []
    arr.push(f)
    feedbacksPorEntrega.set(f.entregaId, arr)
  }

  return {
    tarefa,
    criterios,
    entregas: entregas.map((e) => ({
      ...e,
      feedbacks: feedbacksPorEntrega.get(e.id) ?? [],
    })),
    projetoNome: projeto[0]?.nome ?? null,
    etapaNome: etapa[0]?.nome ?? null,
    papelNome: papel[0]?.nome ?? null,
    papelCor: papel[0]?.cor ?? null,
    responsavelNome:
      responsavel[0]?.nome || responsavel[0]?.email || null,
  }
}

/** Membro ativo de uma turma pelo email da sessão (ou null). */
export async function getMembroAtivoNaTurma(
  turmaId: string,
  email: string,
): Promise<FormacaoMembro | null> {
  const normalized = normalizeEmail(email)
  const [row] = await db
    .select()
    .from(formacaoMembros)
    .where(
      and(
        eq(formacaoMembros.turmaId, turmaId),
        eq(formacaoMembros.email, normalized),
        sql`${formacaoMembros.status} <> 'inativo'`,
      ),
    )
    .limit(1)
  return row ?? null
}

export interface TarefaParaMembro {
  detalhe: TarefaDetalhe
  membro: FormacaoMembro
}

/**
 * Detalhe da tarefa acessível a um aluno: exige que ele seja membro ativo da
 * turma da tarefa. As entregas são filtradas às do próprio aluno.
 */
export async function getTarefaParaMembro(
  tarefaId: string,
  email: string,
): Promise<TarefaParaMembro | null> {
  const detalhe = await getTarefaDetalhe(tarefaId)
  if (!detalhe) return null

  const membro = await getMembroAtivoNaTurma(detalhe.tarefa.turmaId, email)
  if (!membro) return null

  const minhas = detalhe.entregas.filter((e) => e.membroId === membro.id)
  return { detalhe: { ...detalhe, entregas: minhas }, membro }
}

// ---------------------------------------------------------------------------
// Daily e presença (Sprint 5)
// ---------------------------------------------------------------------------

export interface DailyContext {
  encontro: Pick<FormacaoEncontro, "id" | "numero" | "data"> | null
  daily: FormacaoDailyEntry | null
  presencaConfirmada: boolean
  meetingStreak: number
  dailyStreak: number
  diasAteEncontro: number | null
  atrasos: Array<{ numero: number; tipo: string; detalhe: string }>
}

const PRESENCAS_CONTAM = ["confirmado", "presente", "atrasado"]

/** Contexto de daily/presença do aluno: próximo encontro, streaks e atrasos. */
export async function getDailyContext(
  turma: FormacaoTurma,
  membro: FormacaoMembro,
): Promise<DailyContext> {
  const now = new Date()

  const encontros = await db
    .select()
    .from(formacaoEncontros)
    .where(eq(formacaoEncontros.turmaId, turma.id))
    .orderBy(asc(formacaoEncontros.numero))

  const proximo =
    encontros.find((e) => new Date(e.data) >= now) ??
    encontros[encontros.length - 1] ??
    null

  const encIds = encontros.map((e) => e.id)
  const [dailies, presencas] = await Promise.all([
    encIds.length
      ? db
          .select()
          .from(formacaoDailyEntries)
          .where(
            and(
              inArray(formacaoDailyEntries.encontroId, encIds),
              eq(formacaoDailyEntries.membroId, membro.id),
            ),
          )
      : Promise.resolve([]),
    encIds.length
      ? db
          .select()
          .from(formacaoPresencas)
          .where(
            and(
              inArray(formacaoPresencas.encontroId, encIds),
              eq(formacaoPresencas.membroId, membro.id),
            ),
          )
      : Promise.resolve([]),
  ])

  const dailyByEnc = new Map(dailies.map((d) => [d.encontroId, d]))
  const presByEnc = new Map(presencas.map((p) => [p.encontroId, p]))

  const daily = proximo ? dailyByEnc.get(proximo.id) ?? null : null
  const presencaConfirmada = proximo
    ? !!presByEnc.get(proximo.id)?.confirmadoEm
    : false

  // Streaks: encontros passados, do mais recente para trás, até o primeiro gap.
  const passados = encontros
    .filter((e) => new Date(e.data) < now)
    .sort((a, b) => b.numero - a.numero)

  let meetingStreak = 0
  for (const e of passados) {
    const p = presByEnc.get(e.id)
    if (p && PRESENCAS_CONTAM.includes(p.presenca)) meetingStreak++
    else break
  }

  let dailyStreak = 0
  for (const e of passados) {
    const d = dailyByEnc.get(e.id)
    if (d && d.registradoEm) dailyStreak++
    else break
  }

  // Atrasos (transparência sem punição).
  const atrasos: DailyContext["atrasos"] = []
  for (const e of encontros) {
    const d = dailyByEnc.get(e.id)
    if (d && d.registradoEm && d.noPrazo === false) {
      atrasos.push({
        numero: e.numero,
        tipo: "Daily atrasada",
        detalhe: `Encontro #${e.numero}`,
      })
    }
    const p = presByEnc.get(e.id)
    if (p && p.presenca === "atrasado") {
      atrasos.push({
        numero: e.numero,
        tipo: "Atraso no encontro",
        detalhe: `Encontro #${e.numero}`,
      })
    }
  }

  const diasAteEncontro = proximo
    ? Math.max(
        0,
        Math.ceil((new Date(proximo.data).getTime() - now.getTime()) / 86_400_000),
      )
    : null

  return {
    encontro: proximo
      ? { id: proximo.id, numero: proximo.numero, data: proximo.data }
      : null,
    daily,
    presencaConfirmada,
    meetingStreak,
    dailyStreak,
    diasAteEncontro,
    atrasos,
  }
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

// ---------------------------------------------------------------------------
// Rotação de papéis — Sprint 6
// ---------------------------------------------------------------------------

export interface RotacaoPapel {
  id: string
  nome: string
  nomeCurto: string | null
  cor: string
  minOcorrencias: number
}

export interface RotacaoMembro {
  id: string
  nome: string | null
  iniciais: string | null
  isMe: boolean
  contagem: Record<string, number>
  total: number
  totalRequerido: number
}

export interface RotacaoAtribuicao {
  membroId: string
  papelId: string
  encontroNumero: number
}

export interface RotacaoAlerta {
  membroId: string
  membroNome: string | null
  papelId: string
  papelNome: string
  tipo: "nunca_exercido" | "abaixo_minimo"
}

export interface RotacaoContext {
  papeis: RotacaoPapel[]
  membros: RotacaoMembro[]
  atribuicoes: RotacaoAtribuicao[]
  alertas: RotacaoAlerta[]
  meuProgresso: { exercidos: number; total: number }
}

export async function getRotacaoContext(
  turma: FormacaoTurma,
  membro: FormacaoMembro,
): Promise<RotacaoContext> {
  const [fase] = await db
    .select()
    .from(formacaoFases)
    .where(eq(formacaoFases.numero, turma.faseAtual))
    .limit(1)

  if (!fase) {
    return {
      papeis: [],
      membros: [],
      atribuicoes: [],
      alertas: [],
      meuProgresso: { exercidos: 0, total: 0 },
    }
  }

  const [papeis, membrosDb, atribuicoesDb] = await Promise.all([
    db
      .select()
      .from(formacaoPapeis)
      .where(eq(formacaoPapeis.faseId, fase.id))
      .orderBy(asc(formacaoPapeis.ordem)),
    db
      .select()
      .from(formacaoMembros)
      .where(eq(formacaoMembros.turmaId, turma.id)),
    db
      .select({
        membroId: formacaoAtribuicoesPapel.membroId,
        papelId: formacaoAtribuicoesPapel.papelId,
        encontroId: formacaoAtribuicoesPapel.encontroId,
      })
      .from(formacaoAtribuicoesPapel)
      .where(eq(formacaoAtribuicoesPapel.turmaId, turma.id)),
  ])

  const encontroIds = [
    ...new Set(
      atribuicoesDb
        .map((a) => a.encontroId)
        .filter((id): id is string => !!id),
    ),
  ]
  const encontroNumeroMap = new Map<string, number>()
  if (encontroIds.length) {
    const encs = await db
      .select({ id: formacaoEncontros.id, numero: formacaoEncontros.numero })
      .from(formacaoEncontros)
      .where(inArray(formacaoEncontros.id, encontroIds))
    for (const e of encs) encontroNumeroMap.set(e.id, e.numero)
  }

  const papelList: RotacaoPapel[] = papeis.map((p) => ({
    id: p.id,
    nome: p.nome,
    nomeCurto: p.nomeCurto,
    cor: p.cor,
    minOcorrencias: p.minOcorrencias,
  }))

  const papelMap = new Map(papeis.map((p) => [p.id, p]))

  const membrosResult: RotacaoMembro[] = membrosDb.map((m) => {
    const minhas = atribuicoesDb.filter((a) => a.membroId === m.id)
    const contagem: Record<string, number> = {}
    for (const p of papeis) contagem[p.id] = 0
    for (const a of minhas) {
      if (contagem[a.papelId] !== undefined) contagem[a.papelId]++
    }
    const exercidos = papeis.filter((p) => contagem[p.id] > 0).length
    return {
      id: m.id,
      nome: m.nome,
      iniciais: m.iniciais,
      isMe: m.id === membro.id,
      contagem,
      total: exercidos,
      totalRequerido: papeis.length,
    }
  })

  const atribuicoesList: RotacaoAtribuicao[] = atribuicoesDb
    .filter((a) => a.encontroId && encontroNumeroMap.has(a.encontroId))
    .map((a) => ({
      membroId: a.membroId,
      papelId: a.papelId,
      encontroNumero: encontroNumeroMap.get(a.encontroId!)!,
    }))

  const alertas: RotacaoAlerta[] = []
  for (const m of membrosDb) {
    for (const p of papeis) {
      const count =
        membrosResult.find((r) => r.id === m.id)?.contagem[p.id] ?? 0
      if (count === 0) {
        alertas.push({
          membroId: m.id,
          membroNome: m.nome,
          papelId: p.id,
          papelNome: p.nome,
          tipo: "nunca_exercido",
        })
      } else if (count < p.minOcorrencias) {
        alertas.push({
          membroId: m.id,
          membroNome: m.nome,
          papelId: p.id,
          papelNome: p.nome,
          tipo: "abaixo_minimo",
        })
      }
    }
  }

  const eu = membrosResult.find((m) => m.isMe)
  const meuProgresso = eu
    ? { exercidos: eu.total, total: eu.totalRequerido }
    : { exercidos: 0, total: papeis.length }

  return { papeis: papelList, membros: membrosResult, atribuicoes: atribuicoesList, alertas, meuProgresso }
}

export interface RotacaoInstrutorContext extends RotacaoContext {
  encontros: Array<{ id: string; numero: number; data: Date }>
}

export async function getRotacaoInstrutorContext(
  turma: FormacaoTurma,
): Promise<RotacaoInstrutorContext> {
  const fakeMembro = { id: "__instrutor__" } as FormacaoMembro
  const base = await getRotacaoContext(turma, fakeMembro)

  const encontros = await db
    .select({
      id: formacaoEncontros.id,
      numero: formacaoEncontros.numero,
      data: formacaoEncontros.data,
    })
    .from(formacaoEncontros)
    .where(eq(formacaoEncontros.turmaId, turma.id))
    .orderBy(asc(formacaoEncontros.numero))

  const membrosFixados = base.membros.map((m) => ({ ...m, isMe: false }))

  return {
    ...base,
    membros: membrosFixados,
    meuProgresso: { exercidos: 0, total: 0 },
    encontros: encontros.map((e) => ({
      id: e.id,
      numero: e.numero,
      data: e.data,
    })),
  }
}

// ---------------------------------------------------------------------------
// Condutor do encontro (instrutor) — Sprint 7
// ---------------------------------------------------------------------------

export interface EncontroMembroCondutor {
  id: string
  nome: string | null
  iniciais: string | null
  papel: { nome: string; cor: string } | null
  daily: {
    id: string
    concluidoPt: string | null
    andamentoPt: string | null
    proximoPt: string | null
    bloqueioPt: string | null
    ajudaPt: string | null
    registradoEm: Date | null
  } | null
  ingles: {
    id: string
    fraseCompletaPt: string | null
    fraseCompletaEn: string | null
  } | null
  presenca: {
    id: string
    presenca: string
    confirmadoEm: Date | null
  } | null
}

export interface EncontroCondutorContext {
  encontro: FormacaoEncontro
  turma: Pick<FormacaoTurma, "id" | "nome" | "empresaFicticia" | "linkMeet">
  membros: EncontroMembroCondutor[]
  todosComPresenca: boolean
}

export async function getEncontroCondutorContext(
  encontroId: string,
  turmaId: string,
): Promise<EncontroCondutorContext | null> {
  const [encontro] = await db
    .select()
    .from(formacaoEncontros)
    .where(
      and(
        eq(formacaoEncontros.id, encontroId),
        eq(formacaoEncontros.turmaId, turmaId),
      ),
    )
    .limit(1)
  if (!encontro) return null

  const [turma] = await db
    .select()
    .from(formacaoTurmas)
    .where(eq(formacaoTurmas.id, turmaId))
    .limit(1)
  if (!turma) return null

  const membrosDb = await db
    .select()
    .from(formacaoMembros)
    .where(eq(formacaoMembros.turmaId, turmaId))

  const membroIds = membrosDb.map((m) => m.id)
  if (membroIds.length === 0) {
    return {
      encontro,
      turma: { id: turma.id, nome: turma.nome, empresaFicticia: turma.empresaFicticia, linkMeet: turma.linkMeet },
      membros: [],
      todosComPresenca: false,
    }
  }

  const [atribs, dailies, presencas] = await Promise.all([
    db
      .select({
        membroId: formacaoAtribuicoesPapel.membroId,
        nome: formacaoPapeis.nome,
        cor: formacaoPapeis.cor,
      })
      .from(formacaoAtribuicoesPapel)
      .innerJoin(formacaoPapeis, eq(formacaoAtribuicoesPapel.papelId, formacaoPapeis.id))
      .where(eq(formacaoAtribuicoesPapel.encontroId, encontroId)),
    db
      .select()
      .from(formacaoDailyEntries)
      .where(
        and(
          eq(formacaoDailyEntries.encontroId, encontroId),
          inArray(formacaoDailyEntries.membroId, membroIds),
        ),
      ),
    db
      .select()
      .from(formacaoPresencas)
      .where(
        and(
          eq(formacaoPresencas.encontroId, encontroId),
          inArray(formacaoPresencas.membroId, membroIds),
        ),
      ),
  ])

  const dailyIds = dailies.map((d) => d.id)
  const inglesList = dailyIds.length
    ? await db
        .select()
        .from(formacaoDailyIngles)
        .where(inArray(formacaoDailyIngles.dailyEntryId, dailyIds))
    : []

  const papelByMembro = new Map(atribs.map((a) => [a.membroId, { nome: a.nome, cor: a.cor }]))
  const dailyByMembro = new Map(dailies.map((d) => [d.membroId, d]))
  const presencaByMembro = new Map(presencas.map((p) => [p.membroId, p]))
  const inglesByDailyId = new Map(inglesList.map((i) => [i.dailyEntryId, i]))

  const membrosResult: EncontroMembroCondutor[] = membrosDb.map((m) => {
    const daily = dailyByMembro.get(m.id) ?? null
    const ingles = daily ? inglesByDailyId.get(daily.id) ?? null : null
    const presenca = presencaByMembro.get(m.id) ?? null
    return {
      id: m.id,
      nome: m.nome,
      iniciais: m.iniciais,
      papel: papelByMembro.get(m.id) ?? null,
      daily: daily
        ? {
            id: daily.id,
            concluidoPt: daily.concluidoPt,
            andamentoPt: daily.andamentoPt,
            proximoPt: daily.proximoPt,
            bloqueioPt: daily.bloqueioPt,
            ajudaPt: daily.ajudaPt,
            registradoEm: daily.registradoEm,
          }
        : null,
      ingles: ingles
        ? {
            id: ingles.id,
            fraseCompletaPt: ingles.fraseCompletaPt,
            fraseCompletaEn: ingles.fraseCompletaEn,
          }
        : null,
      presenca: presenca
        ? {
            id: presenca.id,
            presenca: presenca.presenca,
            confirmadoEm: presenca.confirmadoEm,
          }
        : null,
    }
  })

  const todosComPresenca = membrosResult.every(
    (m) => m.presenca && ["presente", "atrasado"].includes(m.presenca.presenca),
  )

  return {
    encontro,
    turma: { id: turma.id, nome: turma.nome, empresaFicticia: turma.empresaFicticia, linkMeet: turma.linkMeet },
    membros: membrosResult,
    todosComPresenca,
  }
}
