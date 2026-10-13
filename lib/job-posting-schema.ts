import { getAreaSpecialtyLabel } from "@/lib/job-areas"
import { getJobLevelLabel } from "@/lib/job-labels"
import type { JobDetail } from "@/lib/db/job-listing"

// -----------------------------------------------------------------------------
// Structured data JobPosting (schema.org) — o que o Google Jobs le.
//
// Por que vale: ate aqui a plataforma nao tinha NENHUMA pagina por vaga, e o
// sitemap tinha duas entradas estaticas de /jobs. Com ~1500 vagas/dia entrando,
// cada vaga vira uma pagina indexavel e elegivel ao bloco de vagas do Google.
//
// REGRAS DO GOOGLE QUE MOLDAM ESTE ARQUIVO:
//
//  - `datePosted` e `title` sao obrigatorios; `description` tem de ser a
//    descricao COMPLETA da vaga, em HTML.
//  - Vaga 100% remota precisa de `jobLocationType: "TELECOMMUTE"` E de
//    `applicantLocationRequirements` — sem o segundo, o Google rejeita ou
//    assume o mundo todo.
//  - `validThrough` no passado REMOVE a vaga do indice. Melhor omitir do que
//    chutar: por isso so sai quando `expires_at` existe e ainda e futuro.
//  - Campo vazio ou inventado e pior que campo ausente: marcacao que nao bate
//    com o que esta na pagina e motivo de penalidade manual.
// -----------------------------------------------------------------------------

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * A descricao precisa ser HTML. O texto vem em prosa com quebras de linha, que
 * viram paragrafos — e o conteudo e ESCAPADO antes, porque descricao de vaga
 * raspada da origem pode conter `<` e `&` soltos que quebrariam o JSON-LD.
 */
function toHtmlDescription(job: JobDetail): string {
  const parts = [job.description?.trim() || job.description_en?.trim() || ""]

  if (job.important_note?.trim()) {
    parts.push(`Observação importante: ${job.important_note.trim()}`)
  }

  const text = parts.filter(Boolean).join("\n\n")
  if (!text) return `<p>${escapeHtml(job.title)}</p>`

  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/** Remoto no Brasil e diferente de remoto no mundo: muda quem pode se candidatar. */
function applicantLocation(job: JobDetail) {
  if (!job.is_international) {
    return { "@type": "Country", name: "Brasil" }
  }

  if (job.country_code) {
    return {
      "@type": "Country",
      name: job.country_name ?? COUNTRY_NAMES[job.country_code] ?? job.country_code,
    }
  }

  return undefined
}

function physicalLocation(job: JobDetail) {
  if (!job.city && !job.region && !job.country_name) return undefined

  return {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      ...(job.city ? { addressLocality: job.city } : {}),
      ...(job.region ? { addressRegion: job.region } : {}),
      ...(job.country_code ? { addressCountry: job.country_code } : {}),
    },
  }
}

/**
 * Formato do JSON-LD. Declarado explicitamente porque os spreads condicionais
 * (`...(isRemote ? {...} : {})`) fazem o TS inferir uma UNIAO de formatos, em
 * que nenhum campo opcional existe em todos os ramos — o que torna o resultado
 * impossivel de inspecionar, inclusive em teste.
 */
export type JobPostingSchema = {
  "@context": string
  "@type": "JobPosting"
  title: string
  description: string
  datePosted: string
  validThrough?: string
  hiringOrganization?: { "@type": string; name: string }
  jobLocationType?: "TELECOMMUTE"
  applicantLocationRequirements?: { "@type": string; name: string }
  jobLocation?: {
    "@type": string
    address: {
      "@type": string
      addressLocality?: string
      addressRegion?: string
      addressCountry?: string
    }
  }
  occupationalCategory?: string
  skills?: string
  experienceRequirements: { "@type": string; description: string }
  identifier: { "@type": string; name: string; value: string }
  directApply: boolean
  url: string
}

export function buildJobPostingSchema(job: JobDetail, url: string): JobPostingSchema {
  const isRemote = job.job_type === "remote"
  const place = physicalLocation(job)
  const applicant = applicantLocation(job)

  // Vaga expirada sai do indice do Google. So mandamos a data quando ela existe
  // E ainda esta no futuro — uma data passada seria pior que nenhuma.
  const validThrough =
    job.expires_at && new Date(job.expires_at).getTime() > Date.now()
      ? job.expires_at
      : undefined

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: toHtmlDescription(job),
    datePosted: job.source_posted_at || job.created_at,
    ...(validThrough ? { validThrough } : {}),

    // Sem empresa identificada nao inventamos uma: a curadoria e a fonte, e
    // dizer que a MentoriasTech contrata seria falso.
    ...(job.company
      ? {
          hiringOrganization: {
            "@type": "Organization",
            name: job.company,
          },
        }
      : {}),

    ...(isRemote
      ? {
          jobLocationType: "TELECOMMUTE",
          ...(applicant ? { applicantLocationRequirements: applicant } : {}),
          // Remota com cidade conhecida ("Remoto — São Paulo") mantem o Place:
          // ajuda a busca local sem contradizer o TELECOMMUTE.
          ...(place ? { jobLocation: place } : {}),
        }
      : place
        ? { jobLocation: place }
        : {}),

    ...(job.area_specialty
      ? { occupationalCategory: getAreaSpecialtyLabel(job.area_specialty) }
      : {}),

    ...(job.stack_tags.length > 0 ? { skills: job.stack_tags.join(", ") } : {}),

    experienceRequirements: {
      "@type": "OccupationalExperienceRequirements",
      description: getJobLevelLabel(job.level),
    },

    identifier: {
      "@type": "PropertyValue",
      name: job.company ?? "MentoriasTech",
      value: job.id,
    },

    // `directApply: false` e o correto aqui: a candidatura acontece no site da
    // origem, nao nesta pagina. Marcar true sem ter o formulario proprio e um
    // dos erros que o Google pune.
    directApply: false,

    url,
  }
}
