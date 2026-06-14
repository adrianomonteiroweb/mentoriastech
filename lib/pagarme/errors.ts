// Erro tipado da Pagar.me + classificacao de causa. Modulo portavel.

export type PagarmeErrorKind =
  | "config" // configuracao ausente/invalida (ex.: secret key)
  | "auth" // credencial recusada
  | "document" // conta exige CPF/CNPJ do cliente
  | "gateway_route" // gateway (Kong) nao encontrou a rota -> base URL incorreta
  | "validation" // payload invalido
  | "network" // falha de rede ao contatar a API
  | "server" // erro 5xx da Pagar.me
  | "unknown"

export class PagarmeError extends Error {
  status: number
  pagarmeStatus?: number
  kind: PagarmeErrorKind

  constructor(
    message: string,
    status = 502,
    pagarmeStatus?: number,
    kind: PagarmeErrorKind = "unknown",
  ) {
    super(message)
    this.name = "PagarmeError"
    this.status = status
    this.pagarmeStatus = pagarmeStatus
    this.kind = kind
  }
}

// Classifica um erro HTTP da Pagar.me a partir do status e da mensagem do gateway.
// "no route matched with those values" e a resposta padrao do Kong (gateway da Pagar.me)
// quando a URL nao bate com nenhuma rota — quase sempre PAGARME_BASE_URL sem /core/v5.
export function classifyPagarmeError(httpStatus: number, message: string): PagarmeErrorKind {
  const lower = (message || "").toLowerCase()

  if (lower.includes("no route matched")) return "gateway_route"
  if (httpStatus === 401 || lower.includes("unauthorized") || lower.includes("api key")) {
    return "auth"
  }
  if (lower.includes("document") || lower.includes("cpf") || lower.includes("documento")) {
    return "document"
  }
  if (httpStatus === 404) return "gateway_route"
  if (httpStatus === 422 || httpStatus === 400) return "validation"
  if (httpStatus >= 500) return "server"
  return "unknown"
}
