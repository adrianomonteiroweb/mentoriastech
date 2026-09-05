// -----------------------------------------------------------------------------
// Stacks canonicas.
//
// O bot de busca deriva as stacks da descricao da vaga usando o dicionario de
// packages/utils/linkedinJob.js (STACK_DICTIONARY) no repo `bots`, e manda as
// chaves DELE em `stack_tags` ("node", "c#", "react native"). Vagas cadastradas
// a mao trazem o que a pessoa digitou. Aqui essas grafias viram UMA chave
// canonica, que e o que a tabela `stacks` guarda e o painel agrega.
//
// Por que isso importa: agregando pela tag crua, "node", "Node.js" e "nodejs"
// viram tres barras distintas no grafico. `jobs.stack_tags` continua guardando
// o texto original (a UI atual depende dele); `job_stacks` guarda o canonico.
//
// Divergencia entre este arquivo e o dicionario do bot NAO perde dado: chave
// desconhecida e criada na hora pelo ingest, so fica sem label bonito.
// -----------------------------------------------------------------------------

export type StackCategory =
  | "language"
  | "framework"
  | "database"
  | "cloud"
  | "tool"
  | "other"

export type CanonicalStack = {
  key: string
  label: string
  category: StackCategory
}

export const MAX_STACK_KEY_LENGTH = 60

// Catalogo canonico. As 51 primeiras entradas espelham o STACK_DICTIONARY do
// bot; o restante cobre o que aparece em vaga cadastrada a mao pelo time de HR.
const CANONICAL_STACKS: CanonicalStack[] = [
  { key: "react-native", label: "React Native", category: "framework" },
  { key: "react", label: "React", category: "framework" },
  { key: "nodejs", label: "Node.js", category: "framework" },
  { key: "javascript", label: "JavaScript", category: "language" },
  { key: "typescript", label: "TypeScript", category: "language" },
  { key: "nextjs", label: "Next.js", category: "framework" },
  { key: "angular", label: "Angular", category: "framework" },
  { key: "vue", label: "Vue.js", category: "framework" },
  { key: "svelte", label: "Svelte", category: "framework" },
  { key: "python", label: "Python", category: "language" },
  { key: "django", label: "Django", category: "framework" },
  { key: "flask", label: "Flask", category: "framework" },
  { key: "fastapi", label: "FastAPI", category: "framework" },
  { key: "java", label: "Java", category: "language" },
  { key: "spring", label: "Spring", category: "framework" },
  { key: "kotlin", label: "Kotlin", category: "language" },
  { key: "ruby", label: "Ruby", category: "language" },
  { key: "rails", label: "Ruby on Rails", category: "framework" },
  { key: "php", label: "PHP", category: "language" },
  { key: "laravel", label: "Laravel", category: "framework" },
  { key: "go", label: "Go", category: "language" },
  { key: "rust", label: "Rust", category: "language" },
  { key: "csharp", label: "C# / .NET", category: "language" },
  { key: "cpp", label: "C++", category: "language" },
  { key: "elixir", label: "Elixir", category: "language" },
  { key: "scala", label: "Scala", category: "language" },
  { key: "flutter", label: "Flutter", category: "framework" },
  { key: "swift", label: "Swift", category: "language" },
  { key: "android", label: "Android", category: "framework" },
  { key: "ios", label: "iOS", category: "framework" },
  { key: "devops", label: "DevOps", category: "tool" },
  { key: "docker", label: "Docker", category: "tool" },
  { key: "kubernetes", label: "Kubernetes", category: "tool" },
  { key: "terraform", label: "Terraform", category: "tool" },
  { key: "aws", label: "AWS", category: "cloud" },
  { key: "azure", label: "Azure", category: "cloud" },
  { key: "gcp", label: "Google Cloud", category: "cloud" },
  { key: "cloud", label: "Cloud", category: "cloud" },
  { key: "sql", label: "SQL", category: "database" },
  { key: "postgresql", label: "PostgreSQL", category: "database" },
  { key: "mysql", label: "MySQL", category: "database" },
  { key: "mongodb", label: "MongoDB", category: "database" },
  { key: "redis", label: "Redis", category: "database" },
  { key: "graphql", label: "GraphQL", category: "tool" },
  { key: "html", label: "HTML", category: "language" },
  { key: "css", label: "CSS", category: "language" },
  { key: "tailwind", label: "Tailwind CSS", category: "framework" },
  { key: "sass", label: "Sass", category: "language" },
  { key: "power-bi", label: "Power BI", category: "tool" },
  { key: "tableau", label: "Tableau", category: "tool" },
  { key: "spark", label: "Apache Spark", category: "tool" },
  // Fora do dicionario do bot — chegam por cadastro manual.
  { key: "nestjs", label: "NestJS", category: "framework" },
  { key: "express", label: "Express", category: "framework" },
  { key: "kafka", label: "Apache Kafka", category: "tool" },
  { key: "rabbitmq", label: "RabbitMQ", category: "tool" },
  { key: "elasticsearch", label: "Elasticsearch", category: "database" },
  { key: "airflow", label: "Apache Airflow", category: "tool" },
  { key: "snowflake", label: "Snowflake", category: "database" },
  { key: "databricks", label: "Databricks", category: "cloud" },
  { key: "pandas", label: "pandas", category: "tool" },
  { key: "pytorch", label: "PyTorch", category: "tool" },
  { key: "tensorflow", label: "TensorFlow", category: "tool" },
  { key: "jenkins", label: "Jenkins", category: "tool" },
  { key: "git", label: "Git", category: "tool" },
  { key: "figma", label: "Figma", category: "tool" },
  { key: "cypress", label: "Cypress", category: "tool" },
  { key: "selenium", label: "Selenium", category: "tool" },
  { key: "jest", label: "Jest", category: "tool" },
]

/**
 * Grafias -> chave canonica. Aplicado ANTES de slugificar, porque `c#`, `c++`,
 * `.net` e `node.js` nao sobrevivem a slugificacao (viram "c", "c", "net",
 * "node-js").
 */
const STACK_ALIASES: Record<string, string> = {
  // chaves do bot que diferem do canonico
  node: "nodejs",
  "node.js": "nodejs",
  "node js": "nodejs",
  next: "nextjs",
  "next.js": "nextjs",
  "react native": "react-native",
  "react-native": "react-native",
  "c#": "csharp",
  "c sharp": "csharp",
  "c++": "cpp",
  "power bi": "power-bi",
  powerbi: "power-bi",
  // apelidos comuns
  js: "javascript",
  "java script": "javascript",
  ecmascript: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  vuejs: "vue",
  "vue.js": "vue",
  angularjs: "angular",
  sveltekit: "svelte",
  ".net": "csharp",
  dotnet: "csharp",
  "dot net": "csharp",
  "asp.net": "csharp",
  ".net core": "csharp",
  golang: "go",
  "ruby on rails": "rails",
  "spring boot": "spring",
  springboot: "spring",
  dart: "flutter",
  k8s: "kubernetes",
  postgres: "postgresql",
  postgre: "postgresql",
  "postgre sql": "postgresql",
  psql: "postgresql",
  mongo: "mongodb",
  "amazon web services": "aws",
  "google cloud": "gcp",
  "google cloud platform": "gcp",
  "microsoft azure": "azure",
  html5: "html",
  css3: "css",
  tailwindcss: "tailwind",
  "tailwind css": "tailwind",
  scss: "sass",
  pyspark: "spark",
  "apache spark": "spark",
  "apache kafka": "kafka",
  "apache airflow": "airflow",
  phoenix: "elixir",
  "nest.js": "nestjs",
  "express.js": "express",
}

const STACK_BY_KEY = new Map(CANONICAL_STACKS.map((stack) => [stack.key, stack]))

/** Catalogo completo — usado pelo seed da tabela `stacks` e pelo backfill. */
export function canonicalStacks(): CanonicalStack[] {
  return [...CANONICAL_STACKS]
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/**
 * normalizeStackKey — grafia livre -> chave canonica. Devolve null para vazio
 * ou ruido (menos de 2 caracteres uteis), para nao poluir a tabela `stacks`.
 */
export function normalizeStackKey(tag: string | null | undefined): string | null {
  if (!tag) return null

  const cleaned = stripDiacritics(String(tag))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return null

  // Apelido tem precedencia: e o unico jeito de `c#` e `.net` sobreviverem.
  const aliased = STACK_ALIASES[cleaned]
  if (aliased) return aliased

  const slug = cleaned
    .replace(/[^a-z0-9+#.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_STACK_KEY_LENGTH)

  if (!slug) return null

  // Slug pode bater num apelido tambem ("Node JS" -> "node-js").
  const aliasedSlug = STACK_ALIASES[slug.replace(/-/g, " ")]
  if (aliasedSlug) return aliasedSlug

  if (slug.replace(/[^a-z0-9]/g, "").length < 2) return null

  return slug
}

/** Label de exibicao. Chave desconhecida cai num title-case decente. */
export function getStackLabel(key: string): string {
  const known = STACK_BY_KEY.get(key)
  if (known) return known.label

  return key
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

export function getStackCategory(key: string): StackCategory {
  return STACK_BY_KEY.get(key)?.category ?? "other"
}

/**
 * canonicalizeStackTags — normaliza e deduplica uma lista de tags cruas,
 * preservando a ordem de primeira aparicao. E o que o ingest e o backfill usam
 * para montar as linhas de `job_stacks`.
 */
export function canonicalizeStackTags(tags: readonly string[] | null | undefined): CanonicalStack[] {
  if (!tags || tags.length === 0) return []

  const seen = new Set<string>()
  const result: CanonicalStack[] = []

  for (const tag of tags) {
    const key = normalizeStackKey(tag)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push({ key, label: getStackLabel(key), category: getStackCategory(key) })
  }

  return result
}
