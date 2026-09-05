// -----------------------------------------------------------------------------
// Identidade de empresa das vagas.
//
// `jobs.company` sempre foi texto livre, entao a mesma empresa chega como
// "Google", "Google LLC" e "Google Brasil". Para o registro global
// (`job_companies`) conseguir responder "quais stacks a empresa X usa", cada
// vaga precisa apontar para UMA linha.
//
// Ordem de resolucao (ver lib/db/job-taxonomy.ts):
//   1. linkedin_slug  — chave FORTE, vem do company_url que o bot manda
//   2. alias          — fusao manual feita por um admin (job_company_aliases)
//   3. slug           — nome normalizado, o fallback heuristico
// -----------------------------------------------------------------------------

/**
 * Sufixos societarios. Sao removidos do fim do nome porque "Nubank" e
 * "Nubank Ltda" sao a mesma empresa.
 */
const LEGAL_SUFFIXES = new Set([
  "ltda",
  "sa",
  "s/a",
  "me",
  "epp",
  "eireli",
  "inc",
  "llc",
  "llp",
  "corp",
  "corporation",
  "co",
  "gmbh",
  "bv",
  "nv",
  "srl",
  "sl",
  "spa",
  "plc",
  "pte",
  "pty",
  "ag",
  "ab",
  "oy",
  "as",
])

/**
 * Sufixos geograficos. "Google Brasil" e "Google" sao a mesma empresa para o
 * painel.
 *
 * ATENCAO: estas duas listas sao curtas e explicitas DE PROPOSITO. Nada
 * generico entra aqui ("tecnologia", "solutions", "digital", "song", "labs") —
 * e exatamente isso que separa a fusao desejada ("Google Brasil" = "Google") da
 * indesejada ("Accenture Song" != "Accenture"). Ampliar estas listas sem rodar
 * o relatorio de colisoes do backfill (--dry-run) funde empresas distintas, e
 * desfazer fusao depois que company_id foi escrito e trabalho manual.
 */
const REGION_SUFFIXES = new Set([
  "brasil",
  "brazil",
  "br",
  "latam",
  "portugal",
  "global",
  "international",
  "worldwide",
])

// Sufixos de duas palavras, tratados antes da varredura token a token.
const MULTIWORD_SUFFIXES = ["latin america", "america latina", "sa de cv", "do brasil"]

/** Ruido que o card do LinkedIn cola depois do nome da empresa. */
const TRAILING_NOISE_RE = /\s+[-|@·]\s+.*$/

export const MAX_COMPANY_SLUG_LENGTH = 120

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/**
 * normalizeCompanyKey — chave canonica derivada do nome. Mesma forma de
 * `normalizeJobCategory` (lib/job-options.ts), para ler nativo no repo.
 *
 * Devolve string vazia quando o nome nao produz nada aproveitavel — o chamador
 * trata isso como "sem empresa" em vez de criar uma linha lixo.
 */
export function normalizeCompanyKey(name: string | null | undefined): string {
  if (!name) return ""

  let value = stripDiacritics(String(name))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  value = value.replace(TRAILING_NOISE_RE, "").trim()
  if (!value) return ""

  // Sufixos de duas palavras primeiro (a varredura token a token nao os pega).
  let changed = true
  while (changed) {
    changed = false
    for (const suffix of MULTIWORD_SUFFIXES) {
      if (value.endsWith(` ${suffix}`)) {
        const candidate = value.slice(0, -(suffix.length + 1)).trim()
        if (candidate) {
          value = candidate
          changed = true
        }
      }
    }
  }

  // Sufixos de uma palavra, repetidamente ("Acme Tech Ltda ME"), mas NUNCA ate
  // sobrar string vazia — "Co" sozinho continua sendo "Co".
  let tokens = value.split(" ").filter(Boolean)
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].replace(/[.,]+$/, "")
    if (LEGAL_SUFFIXES.has(last) || REGION_SUFFIXES.has(last)) {
      tokens = tokens.slice(0, -1)
      continue
    }
    break
  }

  return tokens
    .join(" ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_COMPANY_SLUG_LENGTH)
}

/**
 * parseLinkedInCompanySlug — extrai o slug de uma URL de empresa do LinkedIn.
 * Espelha a defensividade de `getJobSource` (lib/job-source.ts): URL invalida
 * nunca lanca, so devolve null.
 *
 * Rejeita `unavailable` (o placeholder do LinkedIn para empresa sem pagina) e
 * ids puramente numericos, que nao sao estaveis entre idiomas.
 */
export function parseLinkedInCompanySlug(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(String(url))
    if (!parsed.hostname.toLowerCase().includes("linkedin.")) return null

    const match = parsed.pathname.match(/\/company\/([^/?#]+)/i)
    if (!match) return null

    const slug = decodeURIComponent(match[1]).toLowerCase().trim()
    if (!slug || slug === "unavailable") return null
    if (/^\d+$/.test(slug)) return null

    return slug.slice(0, MAX_COMPANY_SLUG_LENGTH)
  } catch {
    return null
  }
}

/** URL canonica da empresa no LinkedIn a partir do slug. */
export function buildLinkedInCompanyUrl(slug: string | null | undefined): string | null {
  if (!slug) return null
  return `https://www.linkedin.com/company/${slug}/`
}

export type ResolvedCompanyIdentity = {
  /** Nome de exibicao, ja limpo do ruido do card. */
  name: string
  /** Chave canonica derivada do nome. */
  slug: string
  linkedinSlug: string | null
  linkedinUrl: string | null
}

/**
 * resolveCompanyIdentity — junta nome + company_url no que vai para o banco.
 * Devolve null quando nao ha nome aproveitavel: vaga sem empresa e um caso
 * normal (o Glassdoor as vezes nao traz), nao um erro.
 */
export function resolveCompanyIdentity(
  name: string | null | undefined,
  companyUrl: string | null | undefined,
): ResolvedCompanyIdentity | null {
  const displayName = String(name || "")
    .replace(/\s+/g, " ")
    .replace(TRAILING_NOISE_RE, "")
    .trim()

  const linkedinSlug = parseLinkedInCompanySlug(companyUrl)
  const slug = normalizeCompanyKey(displayName) || linkedinSlug

  if (!displayName || !slug) return null

  return {
    name: displayName.slice(0, 150),
    slug,
    linkedinSlug,
    linkedinUrl: linkedinSlug ? buildLinkedInCompanyUrl(linkedinSlug) : null,
  }
}
