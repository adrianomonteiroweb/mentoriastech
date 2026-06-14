// Cliente HTTP da Pagar.me v5. Modulo portavel (so usa fetch + Buffer).

import { resolveBaseUrl } from "./config"
import { PagarmeError, classifyPagarmeError } from "./errors"
import type { PagarmeClientConfig } from "./types"

const DEFAULT_USER_AGENT = "pagarme-skill-generated/1.0"

interface PagarmeApiError {
  message?: string
  errors?: Record<string, string[]> | unknown
}

function pagarmeErrorDetail(apiError: PagarmeApiError): string {
  if (apiError.message) return apiError.message

  const errors = apiError.errors
  if (errors && typeof errors === "object") {
    const firstGroup = Object.values(errors as Record<string, unknown>)[0]
    if (Array.isArray(firstGroup) && typeof firstGroup[0] === "string") {
      return firstGroup[0]
    }
  }
  return ""
}

export interface PagarmeClient {
  readonly baseUrl: string
  request<T>(method: string, path: string, body?: unknown): Promise<T>
}

// Cria um cliente autenticado. A base URL e resolvida via resolveBaseUrl (deriva da key
// quando ausente e corrige uma base malformada), prevenindo o 404 do gateway.
export function createPagarmeClient(config: PagarmeClientConfig): PagarmeClient {
  if (!config?.secretKey) {
    throw new PagarmeError("Pagar.me secret key ausente.", 503, undefined, "config")
  }

  // pk_... e uma chave PUBLICA (tokenizacao no frontend). A API server-side exige a SECRETA (sk_...).
  if (config.secretKey.trim().toLowerCase().startsWith("pk_")) {
    throw new PagarmeError(
      "PAGARME_SECRET_KEY contem uma chave PUBLICA (pk_...). Use a chave SECRETA (sk_...) do dashboard da Pagar.me.",
      503,
      undefined,
      "config",
    )
  }

  const baseUrl = resolveBaseUrl(config.secretKey, config.baseUrl)
  const authHeader = `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`
  const userAgent = config.userAgent || DEFAULT_USER_AGENT

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          "User-Agent": userAgent,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      })
    } catch (networkError) {
      const message = networkError instanceof Error ? networkError.message : "Erro de rede"
      throw new PagarmeError(`Falha ao contatar a Pagar.me: ${message}`, 502, undefined, "network")
    }

    const text = await response.text()
    let json: unknown = null
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }
    }

    if (!response.ok) {
      const detail = pagarmeErrorDetail((json || {}) as PagarmeApiError)
      const message = detail || `Pagar.me retornou erro ${response.status}.`
      throw new PagarmeError(
        message,
        response.status >= 500 ? 502 : response.status,
        response.status,
        classifyPagarmeError(response.status, message),
      )
    }

    return json as T
  }

  return { baseUrl, request }
}
