// -----------------------------------------------------------------------------
// Parse de localidade de vaga.
//
// O bot do LinkedIn manda `location` como texto cru ("São Paulo, São Paulo,
// Brasil"), e as vagas do Glassdoor / cadastradas à mão só têm isso. Para o
// painel de indicadores conseguir agregar "principais localidades" o texto
// precisa virar cidade / região / país normalizados.
//
// Esta é a porta TS do `parseJobLocation` de packages/utils/linkedinJob.js do
// repo `bots`. A lógica precisa existir dos DOIS lados: o bot manda os campos
// prontos quando consegue, e o backend faz o fallback para quem não manda
// (Glassdoor, cadastro manual). Ao mexer nos dicionários aqui, espelhe lá.
// -----------------------------------------------------------------------------

export type WorkModelHint = "remote" | "hybrid" | "onsite"

export type ParsedJobLocation = {
  city: string | null
  cityKey: string | null
  region: string | null
  countryName: string | null
  countryCode: string | null
  /**
   * Modalidade lida do parêntese final ("(Remoto)"). Só usar quando job_type
   * estiver AUSENTE — nunca para sobrescrever um job_type explícito.
   */
  workModelHint: WorkModelHint | null
}

const EMPTY: ParsedJobLocation = {
  city: null,
  cityKey: null,
  region: null,
  countryName: null,
  countryCode: null,
  workModelHint: null,
}

/** Remove acento, baixa a caixa e colapsa espaco. Base de toda comparacao. */
export function normalizeLocationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Chave de agrupamento de cidade. Existe como coluna separada (`jobs.city_key`)
 * porque agrupar pela grafia de exibicao espalharia "São Paulo" / "Sao Paulo" /
 * "sao paulo" em tres barras do grafico.
 */
export function normalizeCityKey(value: string | null | undefined): string | null {
  if (!value) return null
  const key = normalizeLocationText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
  return key || null
}

// Nome (pt-BR / en / es) -> ISO-2 + nome canonico em pt-BR. Cobre os paises
// alvo das rodadas do bot (ROLE_GEOS / grupos remote-world-* em searchRounds.js).
const COUNTRY_ENTRIES: [string[], string, string][] = [
  [["brasil", "brazil", "br"], "BR", "Brasil"],
  [
    [
      "estados unidos",
      "estados unidos da america",
      "united states",
      "united states of america",
      "usa",
      "eua",
    ],
    "US",
    "Estados Unidos",
  ],
  [["canada"], "CA", "Canadá"],
  [["portugal"], "PT", "Portugal"],
  [["espanha", "spain", "espana"], "ES", "Espanha"],
  [["mexico"], "MX", "México"],
  [["argentina"], "AR", "Argentina"],
  [["chile"], "CL", "Chile"],
  [["colombia"], "CO", "Colômbia"],
  [["uruguai", "uruguay"], "UY", "Uruguai"],
  [["peru"], "PE", "Peru"],
  [["paraguai", "paraguay"], "PY", "Paraguai"],
  [["bolivia"], "BO", "Bolívia"],
  [["equador", "ecuador"], "EC", "Equador"],
  [["costa rica"], "CR", "Costa Rica"],
  [["panama"], "PA", "Panamá"],
  [
    ["reino unido", "united kingdom", "uk", "inglaterra", "england", "great britain"],
    "GB",
    "Reino Unido",
  ],
  [["irlanda", "ireland"], "IE", "Irlanda"],
  [["alemanha", "germany", "deutschland"], "DE", "Alemanha"],
  [["franca", "france"], "FR", "França"],
  [["italia", "italy"], "IT", "Itália"],
  [["holanda", "paises baixos", "netherlands", "the netherlands"], "NL", "Países Baixos"],
  [["polonia", "poland"], "PL", "Polônia"],
  [["suica", "switzerland"], "CH", "Suíça"],
  [["suecia", "sweden"], "SE", "Suécia"],
  [["belgica", "belgium"], "BE", "Bélgica"],
  [["austria"], "AT", "Áustria"],
  [["dinamarca", "denmark"], "DK", "Dinamarca"],
  [["noruega", "norway"], "NO", "Noruega"],
  [["finlandia", "finland"], "FI", "Finlândia"],
  [["grecia", "greece"], "GR", "Grécia"],
  [["romenia", "romania"], "RO", "Romênia"],
  [
    ["republica tcheca", "czechia", "czech republic", "tchequia"],
    "CZ",
    "República Tcheca",
  ],
  [["turquia", "turkey", "turkiye"], "TR", "Turquia"],
  [["israel"], "IL", "Israel"],
  [
    ["emirados arabes unidos", "united arab emirates", "uae"],
    "AE",
    "Emirados Árabes Unidos",
  ],
  [["africa do sul", "south africa"], "ZA", "África do Sul"],
  [["india"], "IN", "Índia"],
  [["japao", "japan"], "JP", "Japão"],
  [["singapura", "singapore"], "SG", "Singapura"],
  [["australia"], "AU", "Austrália"],
  [["nova zelandia", "new zealand"], "NZ", "Nova Zelândia"],
]

const COUNTRY_BY_NAME = new Map<string, { code: string; name: string }>()
for (const [aliases, code, name] of COUNTRY_ENTRIES) {
  for (const alias of aliases) {
    COUNTRY_BY_NAME.set(normalizeLocationText(alias), { code, name })
  }
}

export const COUNTRY_NAME_BY_CODE = new Map<string, string>(
  COUNTRY_ENTRIES.map(([, code, name]) => [code, name]),
)

// Marcadores supranacionais / de trabalho remoto. Nao sao pais: zeram o campo
// em vez de virarem uma "cidade" fantasma no ranking.
const SUPRANATIONAL = new Set(
  [
    "remoto",
    "remote",
    "anywhere",
    "worldwide",
    "global",
    "mundial",
    "latam",
    "america latina",
    "latin america",
    "latinoamerica",
    "european union",
    "uniao europeia",
    "europa",
    "europe",
    "emea",
    "apac",
    "america do norte",
    "north america",
    "home office",
    "home-office",
  ].map(normalizeLocationText),
)

const BR_STATE_ENTRIES: [string[], string][] = [
  [["acre", "ac"], "AC"],
  [["alagoas", "al"], "AL"],
  [["amapa", "ap"], "AP"],
  [["amazonas", "am"], "AM"],
  [["bahia", "ba"], "BA"],
  [["ceara", "ce"], "CE"],
  [["distrito federal", "df"], "DF"],
  [["espirito santo", "es"], "ES"],
  [["goias", "go"], "GO"],
  [["maranhao", "ma"], "MA"],
  [["mato grosso", "mt"], "MT"],
  [["mato grosso do sul", "ms"], "MS"],
  [["minas gerais", "mg"], "MG"],
  [["para", "pa"], "PA"],
  [["paraiba", "pb"], "PB"],
  [["parana", "pr"], "PR"],
  [["pernambuco", "pe"], "PE"],
  [["piaui", "pi"], "PI"],
  [["rio de janeiro", "rj"], "RJ"],
  [["rio grande do norte", "rn"], "RN"],
  [["rio grande do sul", "rs"], "RS"],
  [["rondonia", "ro"], "RO"],
  [["roraima", "rr"], "RR"],
  [["santa catarina", "sc"], "SC"],
  [["sao paulo", "sp"], "SP"],
  [["sergipe", "se"], "SE"],
  [["tocantins", "to"], "TO"],
]

const BR_STATE_BY_NAME = new Map<string, string>()
for (const [aliases, uf] of BR_STATE_ENTRIES) {
  for (const alias of aliases) BR_STATE_BY_NAME.set(normalizeLocationText(alias), uf)
}

// As alternativas acentuadas sao explicitas porque a flag `i` do JS nao
// normaliza acento: /hibrido/i NAO casa "Híbrido".
const MODALITY_SUFFIX_RE =
  /\s*\(\s*(remoto|remote|h[ií]brido|hybrid|presencial|on-?site|in-?office|no local)\s*\)\s*$/i

// Ruido que o LinkedIn cola na mesma linha da localidade.
const NOISE_PATTERNS: RegExp[] = [
  /h[aá]\s+\d+\s+(minutos?|horas?|dias?|semanas?|m[eê]s(?:es)?)/gi,
  /\d+\s+(candidatos?|applicants?)/gi,
  /\b(tempo integral|meio periodo|full-?time|part-?time|freelance|contrato|clt|pj)\b/gi,
  /\bpromovid[ao]\b/gi,
]

function toWorkModelHint(raw: string): WorkModelHint {
  const value = normalizeLocationText(raw)
  if (/hibrid|hybrid/.test(value)) return "hybrid"
  if (/presencial|on-?site|in-?office|no local/.test(value)) return "onsite"
  return "remote"
}

function lookupCountry(part: string) {
  return COUNTRY_BY_NAME.get(normalizeLocationText(part)) || null
}

function lookupBrState(part: string) {
  return BR_STATE_BY_NAME.get(normalizeLocationText(part)) || null
}

function isSupranational(part: string) {
  return SUPRANATIONAL.has(normalizeLocationText(part))
}

/**
 * parseJobLocation — quebra o texto livre de localidade em cidade / regiao /
 * pais. Prefere devolver NULL a devolver lixo: este campo vira eixo de grafico,
 * e uma "cidade" que na verdade e meia descricao de vaga contamina o ranking
 * inteiro (o texto cru do bot, quando a pagina nao traz o separador "·", vem
 * como um blob de centenas de caracteres).
 *
 * @param options.isInternational flag da vaga. Quando o pais nao resolve e a
 *   vaga NAO e internacional, assume Brasil — default seguro, ja que o grosso
 *   da base e BR e a coluna e `not null default false`.
 */
export function parseJobLocation(
  raw: string | null | undefined,
  options: { isInternational?: boolean } = {},
): ParsedJobLocation {
  if (!raw) return EMPTY

  let text = String(raw).replace(/\s+/g, " ").trim()
  if (!text) return EMPTY

  // Guarda 1: blob. Localidade real nao passa de ~200 chars.
  if (text.length > 200) return EMPTY

  let workModelHint: WorkModelHint | null = null
  const modalityMatch = text.match(MODALITY_SUFFIX_RE)
  if (modalityMatch) {
    workModelHint = toWorkModelHint(modalityMatch[1])
    text = text.replace(MODALITY_SUFFIX_RE, "").trim()
  }

  // O LinkedIn separa localidade do resto dos metadados com "·".
  text = text.split("·")[0].trim()
  for (const pattern of NOISE_PATTERNS) text = text.replace(pattern, " ")
  text = text.replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim()

  // Guarda 2: prosa. Pontuacao de frase ou muitas palavras nao e localidade.
  if (!text) return { ...EMPTY, workModelHint }
  if (/[.;!?]/.test(text)) return { ...EMPTY, workModelHint }
  if (text.split(" ").length > 12) return { ...EMPTY, workModelHint }

  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return { ...EMPTY, workModelHint }

  let city: string | null = null
  let region: string | null = null
  let country: { code: string; name: string } | null = null

  if (parts.length >= 3) {
    const tail = parts[parts.length - 1]
    country = lookupCountry(tail)
    city = parts[0]
    region = country || isSupranational(tail) ? parts[parts.length - 2] : parts[1]
  } else if (parts.length === 2) {
    const [first, second] = parts
    country = lookupCountry(second)
    if (country || isSupranational(second)) {
      city = first
    } else {
      const uf = lookupBrState(second)
      if (uf) {
        city = first
        region = uf
        country = { code: "BR", name: "Brasil" }
      } else {
        city = first
        region = second
      }
    }
  } else {
    const only = parts[0]
    if (isSupranational(only)) return { ...EMPTY, workModelHint }
    country = lookupCountry(only)
    if (!country) {
      const uf = lookupBrState(only)
      if (uf) {
        region = uf
        country = { code: "BR", name: "Brasil" }
      } else {
        city = only
      }
    }
  }

  // Regiao do Brasil por extenso vira a sigla, para o agrupamento fechar.
  if (region && (!country || country.code === "BR")) {
    const uf = lookupBrState(region)
    if (uf) {
      region = uf
      if (!country) country = { code: "BR", name: "Brasil" }
    }
  }

  // Nao deixar o proprio pais (ou um marcador remoto) virar "cidade".
  if (city && country && normalizeLocationText(city) === normalizeLocationText(country.name)) {
    city = null
  }
  if (city && isSupranational(city)) city = null
  if (region && isSupranational(region)) region = null

  if (!country && options.isInternational === false) {
    country = { code: "BR", name: "Brasil" }
  }

  return {
    city,
    cityKey: normalizeCityKey(city),
    region: region || null,
    countryName: country ? country.name : null,
    countryCode: country ? country.code : null,
    workModelHint,
  }
}

/** Normaliza um ISO-2 vindo do payload do bot. Devolve null se nao for valido. */
export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null
  const code = String(value).trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}
