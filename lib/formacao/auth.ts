import { requireRole } from "@/lib/utils/auth"
import { isFormacaoPreviewEnabled } from "@/lib/formacao/preview"

export class FormacaoError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "FormacaoError"
    this.status = status
  }
}

/**
 * Gate das rotas de instrutor da Órbita: exige o preview habilitado (404 caso
 * contrário, coerente com o layout) e papel admin/mentor. Retorna o profile.
 */
export async function requireFormacaoInstrutor() {
  if (!isFormacaoPreviewEnabled()) {
    throw new FormacaoError("Não encontrado", 404)
  }
  return requireRole("admin", "mentor")
}

/** Traduz erros conhecidos para { error, status } nas rotas. */
export function formacaoErrorResponse(error: unknown): {
  message: string
  status: number
} {
  const status = (error as { status?: number }).status || 500
  const message =
    (error as Error).message ||
    (status === 500 ? "Erro interno do servidor" : "Erro")
  return { message, status }
}
