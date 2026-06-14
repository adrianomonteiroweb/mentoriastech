// Resolucao da base URL da API. Modulo portavel.
//
// Pagar.me v5 tem UM unico host oficial: https://api.pagar.me/core/v5. O ambiente
// (teste vs producao) e definido pela SECRET KEY (sk_test_ = sandbox, sk_live_/sk_ = producao),
// NAO pela URL. O antigo host de sandbox "sdx-api.pagar.me" responde 404
// "no route matched with those values" e nao deve ser usado.

import type { PagarmeMode } from "./types"

export const PAGARME_API_BASE_URL = "https://api.pagar.me/core/v5"

// Deriva o ambiente a partir do segmento da key (sk_test_/pk_test_ = sandbox; resto = producao).
export function modeFromSecretKey(secretKey: string): PagarmeMode {
  return secretKey.trim().toLowerCase().split("_")[1] === "test" ? "test" : "live"
}

// Resolve a base URL efetiva:
// - sem baseUrl -> usa o host canonico;
// - qualquer host *.pagar.me (inclusive o sdx-api morto, ou faltando /core/v5) -> normaliza
//   para o host canonico;
// - host nao-pagar.me (proxy custom) e respeitado como informado.
export function resolveBaseUrl(_secretKey: string, baseUrl?: string): string {
  const raw = baseUrl?.trim()
  if (!raw) return PAGARME_API_BASE_URL

  const normalized = raw.replace(/\/+$/, "")

  let host: string
  try {
    host = new URL(normalized).host
  } catch {
    console.warn(`[pagarme] PAGARME_BASE_URL invalida ("${raw}"); usando ${PAGARME_API_BASE_URL}.`)
    return PAGARME_API_BASE_URL
  }

  if (/(^|\.)pagar\.me$/i.test(host)) {
    if (normalized !== PAGARME_API_BASE_URL) {
      console.warn(
        `[pagarme] PAGARME_BASE_URL ajustada de "${normalized}" para ${PAGARME_API_BASE_URL}.`,
      )
    }
    return PAGARME_API_BASE_URL
  }

  return normalized
}
