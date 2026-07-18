import { and, eq } from "drizzle-orm"
import {
  db,
  formacaoMembros,
  formacaoTurmas,
  type FormacaoMembro,
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
