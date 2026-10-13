// -----------------------------------------------------------------------------
// Areas de atuacao em tecnologia — taxonomia canonica em DOIS niveis.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Ate aqui a area da vaga era UM campo (`jobs.category`) com 16 valores planos,
// e o bot escreve "other" sempre que nao sabe. Com ~1500 vagas/dia vindas do
// mercado inteiro — UX research, SRE, scrum master, suporte, Salesforce,
// DevRel — uma lista plana de 16 nao representa nem de longe o que entra.
//
// Pior: `pcd` e as afirmativas moravam NO MESMO CAMPO da area. Uma vaga de
// frontend para PCD saia do filtro "Desenvolvimento" — o filtro escondia a vaga
// exatamente de quem ela foi feita para alcancar.
//
// A correcao e separar o que tem naturezas diferentes em TRES EIXOS:
//
//   area       (familia > especialidade)  — o que a pessoa faz
//   nivel      (jobs.level, ja existia)   — onde ela esta na carreira
//   inclusao   (flags acumulaveis)        — para quem a vaga e
//
// "Tech lead" so e representavel assim: familia `lideranca` + nivel `senior`.
// "Estagio" e nivel, nunca area.
//
// A ARQUITETURA ESPELHA `lib/job-stacks.ts` de proposito: catalogo canonico +
// normalizador + label bonito + backfill idempotente. Quem entendeu aquele
// arquivo entende este.
//
// REGRA QUE NAO SE QUEBRA: classificacao errada e PIOR que classificacao
// ausente. Nada aqui pode fazer uma vaga sumir. Sem casamento, a vaga cai em
// `outros` e continua visivel e buscavel.
// -----------------------------------------------------------------------------

export type AreaFamilyKey =
  | "engenharia"
  | "dados"
  | "ia"
  | "infra"
  | "seguranca"
  | "qualidade"
  | "produto"
  | "design"
  | "lideranca"
  | "agil"
  | "suporte"
  | "plataformas"
  | "adjacentes"
  | "outros"

export type AreaFamily = {
  key: AreaFamilyKey
  label: string
  /** Frase curta de apoio na UI do filtro. */
  hint: string
}

export type AreaSpecialty = {
  key: string
  family: AreaFamilyKey
  label: string
}

export const MAX_AREA_KEY_LENGTH = 60

// Ordem = ordem de exibicao no filtro. As familias de maior volume primeiro,
// para o polegar alcancar o que a maioria procura sem rolar.
export const AREA_FAMILIES: AreaFamily[] = [
  { key: "engenharia", label: "Engenharia de Software", hint: "Front, back, mobile, games" },
  { key: "dados", label: "Dados", hint: "Analise, engenharia, BI" },
  { key: "ia", label: "IA & Machine Learning", hint: "ML, GenAI, MLOps" },
  { key: "infra", label: "Infraestrutura & Cloud", hint: "DevOps, SRE, cloud" },
  { key: "seguranca", label: "Seguranca", hint: "AppSec, pentest, GRC" },
  { key: "qualidade", label: "Qualidade", hint: "QA, automacao, SDET" },
  { key: "produto", label: "Produto", hint: "PO, PM, analise de negocios" },
  { key: "design", label: "Design", hint: "UX, UI, research, writing" },
  { key: "lideranca", label: "Lideranca & Arquitetura", hint: "Tech lead, EM, arquitetura" },
  { key: "agil", label: "Agil & Projetos", hint: "Scrum master, agile coach, PMO" },
  { key: "suporte", label: "Suporte & Operacoes", hint: "Suporte, implantacao, solutions" },
  { key: "plataformas", label: "Plataformas & Low-code", hint: "Salesforce, SAP, RPA" },
  { key: "adjacentes", label: "Tech Adjacentes", hint: "DevRel, tech writing, recruiting" },
  { key: "outros", label: "Outros", hint: "Ainda nao classificadas" },
]

export const AREA_SPECIALTIES: AreaSpecialty[] = [
  // Engenharia de Software
  { key: "frontend", family: "engenharia", label: "Front-end" },
  { key: "backend", family: "engenharia", label: "Back-end" },
  { key: "fullstack", family: "engenharia", label: "Full-stack" },
  { key: "mobile", family: "engenharia", label: "Mobile" },
  { key: "embarcado", family: "engenharia", label: "Embarcado & IoT" },
  { key: "games", family: "engenharia", label: "Games" },
  { key: "blockchain", family: "engenharia", label: "Blockchain & Web3" },
  { key: "xr", family: "engenharia", label: "AR / VR" },
  { key: "software", family: "engenharia", label: "Desenvolvimento" },

  // Dados
  { key: "analise-dados", family: "dados", label: "Analise de Dados" },
  { key: "engenharia-dados", family: "dados", label: "Engenharia de Dados" },
  { key: "ciencia-dados", family: "dados", label: "Ciencia de Dados" },
  { key: "bi", family: "dados", label: "Business Intelligence" },
  { key: "analytics-engineer", family: "dados", label: "Analytics Engineer" },
  { key: "governanca-dados", family: "dados", label: "Governanca de Dados" },
  { key: "dba", family: "dados", label: "DBA" },

  // IA & Machine Learning
  { key: "ml-engineer", family: "ia", label: "Machine Learning Engineer" },
  { key: "ai-engineer", family: "ia", label: "AI Engineer" },
  { key: "mlops", family: "ia", label: "MLOps" },
  { key: "genai", family: "ia", label: "GenAI & LLM" },
  { key: "nlp", family: "ia", label: "NLP" },
  { key: "visao-computacional", family: "ia", label: "Visao Computacional" },
  { key: "pesquisa-ia", family: "ia", label: "Pesquisa em IA" },

  // Infraestrutura & Cloud
  { key: "devops", family: "infra", label: "DevOps" },
  { key: "sre", family: "infra", label: "SRE" },
  { key: "cloud", family: "infra", label: "Cloud" },
  { key: "plataforma", family: "infra", label: "Platform Engineering" },
  { key: "redes", family: "infra", label: "Redes & Infraestrutura" },
  { key: "finops", family: "infra", label: "FinOps" },
  { key: "sysadmin", family: "infra", label: "Sysadmin" },

  // Seguranca
  { key: "appsec", family: "seguranca", label: "AppSec" },
  { key: "secops", family: "seguranca", label: "SecOps / Blue Team" },
  { key: "pentest", family: "seguranca", label: "Pentest / Red Team" },
  { key: "grc", family: "seguranca", label: "GRC & Compliance" },
  { key: "iam", family: "seguranca", label: "IAM" },
  { key: "seguranca-geral", family: "seguranca", label: "Seguranca da Informacao" },

  // Qualidade
  { key: "qa-automacao", family: "qualidade", label: "QA Automacao / SDET" },
  { key: "qa-manual", family: "qualidade", label: "QA Manual" },
  { key: "performance", family: "qualidade", label: "Performance & Carga" },
  { key: "qa-geral", family: "qualidade", label: "Qualidade de Software" },

  // Produto
  { key: "po", family: "produto", label: "Product Owner" },
  { key: "pm", family: "produto", label: "Product Manager" },
  { key: "product-ops", family: "produto", label: "Product Ops" },
  { key: "product-analytics", family: "produto", label: "Product Analytics" },
  { key: "analista-negocios", family: "produto", label: "Analise de Negocios" },
  { key: "pmm", family: "produto", label: "Product Marketing" },
  { key: "growth", family: "produto", label: "Growth" },

  // Design
  { key: "ux", family: "design", label: "UX Design" },
  { key: "ui", family: "design", label: "UI Design" },
  { key: "product-design", family: "design", label: "Product Design" },
  { key: "ux-research", family: "design", label: "UX Research" },
  { key: "ux-writing", family: "design", label: "UX Writing & Content Design" },
  { key: "design-system", family: "design", label: "Design System" },
  { key: "design-ops", family: "design", label: "Design Ops" },
  { key: "acessibilidade", family: "design", label: "Acessibilidade" },

  // Lideranca & Arquitetura
  { key: "tech-lead", family: "lideranca", label: "Tech Lead" },
  { key: "engineering-manager", family: "lideranca", label: "Engineering Manager" },
  { key: "head", family: "lideranca", label: "Head / Diretoria" },
  { key: "cto", family: "lideranca", label: "CTO" },
  { key: "arquiteto-software", family: "lideranca", label: "Arquitetura de Software" },
  { key: "arquiteto-solucoes", family: "lideranca", label: "Arquitetura de Solucoes" },

  // Agil & Projetos
  { key: "scrum-master", family: "agil", label: "Scrum Master" },
  { key: "agile-coach", family: "agil", label: "Agile Coach" },
  { key: "gerente-projetos", family: "agil", label: "Gerencia de Projetos" },
  { key: "pmo", family: "agil", label: "PMO" },

  // Suporte & Operacoes
  { key: "suporte-tecnico", family: "suporte", label: "Suporte Tecnico" },
  { key: "analista-sistemas", family: "suporte", label: "Analise de Sistemas" },
  { key: "implantacao", family: "suporte", label: "Implantacao" },
  { key: "solutions-engineer", family: "suporte", label: "Solutions / Sales Engineer" },
  { key: "customer-success", family: "suporte", label: "Customer Success Tecnico" },
  { key: "noc", family: "suporte", label: "NOC" },

  // Plataformas & Low-code
  { key: "salesforce", family: "plataformas", label: "Salesforce" },
  { key: "sap", family: "plataformas", label: "SAP" },
  { key: "servicenow", family: "plataformas", label: "ServiceNow" },
  { key: "totvs", family: "plataformas", label: "Totvs / Protheus" },
  { key: "oracle-apps", family: "plataformas", label: "Oracle Apps" },
  { key: "low-code", family: "plataformas", label: "Low-code / No-code" },
  { key: "rpa", family: "plataformas", label: "RPA" },

  // Tech Adjacentes
  { key: "devrel", family: "adjacentes", label: "DevRel" },
  { key: "tech-writer", family: "adjacentes", label: "Tech Writing" },
  { key: "tech-recruiter", family: "adjacentes", label: "Tech Recruiting" },
  { key: "martech", family: "adjacentes", label: "Martech & CRO" },
]

// -----------------------------------------------------------------------------
// MOTOR DE INFERENCIA
//
// A ORDEM DESTA LISTA E A REGRA. Primeiro casamento vence, e por isso a lista e
// um array ordenado e nao um Record — a ordem de chaves de objeto nao e
// contrato, e aqui ela e TODA a logica.
//
// O que a ordem resolve, concretamente:
//   "QA Engineer"          -> qualidade, nao engenharia (casa "qa" antes de "engineer")
//   "Product Designer"     -> design, nao produto     (casa "product designer" antes de "product")
//   "Data Engineer"        -> dados, nao engenharia
//   "Security Engineer"    -> seguranca, nao engenharia
//   "Sales Engineer"       -> suporte, nao engenharia
//   "Engineering Manager"  -> lideranca, nao engenharia
//   "Scrum Master"         -> agil, nao produto
//
// Termos genericos ("engineer", "developer", "analista") ficam no FIM de
// proposito: sao a rede de seguranca, nunca a primeira escolha.
// -----------------------------------------------------------------------------

type AreaRule = {
  specialty: string
  /** Termos ja normalizados. Casam por palavra inteira. */
  terms: string[]
}

const AREA_RULES: AreaRule[] = [
  // --- Lideranca: vence o resto porque o cargo E a lideranca -----------------
  { specialty: "cto", terms: ["cto", "chief technology officer", "chief technical officer", "cio", "ciso"] },
  { specialty: "engineering-manager", terms: ["engineering manager", "software engineering manager", "gerente de engenharia", "gerente de tecnologia", "gerente de desenvolvimento", "development manager", "manager of engineering"] },
  { specialty: "head", terms: ["head of engineering", "head of product", "head of data", "head of design", "head of technology", "head de engenharia", "head de tecnologia", "head de produto", "head de dados", "diretor de tecnologia", "diretora de tecnologia", "vp of engineering", "vp engineering", "diretor de engenharia"] },
  { specialty: "tech-lead", terms: ["tech lead", "techlead", "technical lead", "team lead", "lider tecnico", "lider tecnica", "lideranca tecnica", "engineering lead", "squad lead", "chapter lead", "coordenador de desenvolvimento", "coordenador de tecnologia"] },
  { specialty: "arquiteto-solucoes", terms: ["solution architect", "solutions architect", "arquiteto de solucoes", "arquiteta de solucoes", "cloud architect", "arquiteto cloud", "enterprise architect", "arquiteto corporativo", "arquiteto de dados", "data architect"] },
  { specialty: "arquiteto-software", terms: ["software architect", "arquiteto de software", "arquiteta de software", "arquiteto de sistemas", "arquiteto"] },

  // --- Agil & Projetos -------------------------------------------------------
  { specialty: "scrum-master", terms: ["scrum master", "scrummaster"] },
  { specialty: "agile-coach", terms: ["agile coach", "coach agil", "agilista", "agile master"] },
  { specialty: "pmo", terms: ["pmo", "project management office"] },
  { specialty: "gerente-projetos", terms: ["gerente de projetos", "gerente de projeto", "project manager", "it project manager", "coordenador de projetos"] },

  // RPA antes de Qualidade: "Analista de Automacao RPA" e plataforma, nao QA.
  { specialty: "rpa", terms: ["rpa", "uipath", "automation anywhere", "blue prism", "robotic process automation", "automacao robotica"] },

  // --- Qualidade: antes de engenharia ("QA Engineer", "Test Engineer") -------
  { specialty: "performance", terms: ["performance test", "teste de performance", "teste de carga", "load test", "performance engineer", "teste de stress"] },
  { specialty: "qa-automacao", terms: ["sdet", "qa automation", "automacao de testes", "qa automacao", "test automation", "testes automatizados", "teste automatizado", "automation engineer", "engenheiro de automacao", "analista de automacao", "quality engineer", "automation qa"] },
  { specialty: "qa-manual", terms: ["qa manual", "manual qa", "teste manual", "tester manual", "manual tester", "testes manuais", "analista de testes manual", "testador"] },
  { specialty: "qa-geral", terms: ["qa", "q a", "quality assurance", "analista de testes", "analista de qualidade", "coordenador de qualidade", "qualidade de software", "test engineer", "tester", "engenheiro de qualidade", "quality analyst", "garantia de qualidade"] },

  // --- Design: "Product Designer" antes de qualquer coisa com "product" ------
  { specialty: "ux-research", terms: ["ux research", "ux researcher", "user research", "user researcher", "pesquisa em ux", "pesquisa de ux", "pesquisador ux", "pesquisadora ux", "pesquisador de ux", "pesquisadora de ux", "design research"] },
  { specialty: "ux-writing", terms: ["ux writer", "ux writing", "content design", "content designer", "redator ux", "conteudo digital ux"] },
  { specialty: "design-system", terms: ["design system", "design systems", "designer de sistema"] },
  { specialty: "design-ops", terms: ["design ops", "designops"] },
  { specialty: "acessibilidade", terms: ["acessibilidade digital", "accessibility specialist", "a11y", "especialista em acessibilidade"] },
  { specialty: "product-design", terms: ["product designer", "product design", "designer de produto", "design de produto"] },
  { specialty: "ux", terms: ["ux designer", "ux design", "ux ui", "ui ux", "designer ux", "experiencia do usuario", "user experience designer", "ux"] },
  { specialty: "ui", terms: ["ui designer", "ui design", "designer ui", "interface designer", "designer de interface"] },
  { specialty: "design-system", terms: ["designer visual", "visual designer"] },

  // --- IA & Machine Learning: antes de dados e de engenharia -----------------
  { specialty: "mlops", terms: ["mlops", "ml ops", "ml platform", "machine learning ops", "ml infrastructure"] },
  { specialty: "genai", terms: ["generative ai", "genai", "gen ai", "llm engineer", "llm", "prompt engineer", "prompt engineering", "ia generativa", "large language model", "ai agents", "agentic ai"] },
  { specialty: "nlp", terms: ["nlp", "natural language processing", "processamento de linguagem natural", "computational linguist"] },
  { specialty: "visao-computacional", terms: ["computer vision", "visao computacional", "image processing engineer"] },
  { specialty: "pesquisa-ia", terms: ["ai research", "research scientist", "machine learning research", "pesquisador em ia", "pesquisa em ia", "ai researcher"] },
  { specialty: "ml-engineer", terms: ["machine learning engineer", "ml engineer", "engenheiro de machine learning", "engenheiro de ml", "deep learning engineer", "machine learning"] },
  { specialty: "ai-engineer", terms: ["ai engineer", "artificial intelligence engineer", "engenheiro de ia", "engenheira de ia", "ai developer", "desenvolvedor de ia", "inteligencia artificial", "artificial intelligence", "ai specialist"] },

  // --- Dados: antes de engenharia ("Data Engineer") --------------------------
  { specialty: "analytics-engineer", terms: ["analytics engineer", "engenheiro de analytics"] },
  { specialty: "governanca-dados", terms: ["data governance", "governanca de dados", "data steward", "data quality", "qualidade de dados", "data catalog"] },
  { specialty: "engenharia-dados", terms: ["data engineer", "engenheiro de dados", "engenheira de dados", "engenharia de dados", "big data engineer", "etl developer", "desenvolvedor etl", "data platform engineer", "data pipeline"] },
  { specialty: "ciencia-dados", terms: ["data scientist", "cientista de dados", "ciencia de dados", "data science", "estatistico", "statistician"] },
  { specialty: "bi", terms: ["business intelligence", "analista de bi", "bi analyst", "bi developer", "desenvolvedor bi", "power bi", "tableau developer", "especialista em bi", "bi"] },
  { specialty: "dba", terms: ["dba", "database administrator", "administrador de banco de dados", "database engineer", "especialista em banco de dados"] },
  { specialty: "analise-dados", terms: ["data analyst", "analista de dados", "analise de dados", "data analytics", "analista de informacoes"] },

  // --- Seguranca: antes de engenharia ("Security Engineer") ------------------
  { specialty: "pentest", terms: ["pentest", "pentester", "penetration test", "red team", "ethical hacker", "hacker etico", "teste de intrusao", "offensive security"] },
  { specialty: "appsec", terms: ["appsec", "application security", "seguranca de aplicacoes", "product security", "devsecops", "secure code"] },
  { specialty: "secops", terms: ["secops", "soc analyst", "analista de soc", "blue team", "security operations", "threat intelligence", "incident response", "resposta a incidentes"] },
  { specialty: "grc", terms: ["grc", "security compliance", "compliance de seguranca", "lgpd", "gdpr", "iso 27001", "risco cibernetico", "auditoria de seguranca", "privacy engineer"] },
  { specialty: "iam", terms: ["iam", "identity and access", "gestao de identidade", "identity engineer", "okta", "keycloak"] },
  { specialty: "seguranca-geral", terms: ["security engineer", "cyber security", "cybersecurity", "ciberseguranca", "seguranca da informacao", "engenheiro de seguranca", "analista de seguranca", "security analyst", "seguranca cibernetica", "security specialist", "infosec"] },

  // --- Infra & Cloud: antes de engenharia ("Platform Engineer") --------------
  { specialty: "sre", terms: ["sre", "site reliability", "confiabilidade de sites", "reliability engineer", "engenheiro de confiabilidade", "confiabilidade"] },
  { specialty: "finops", terms: ["finops", "cloud cost", "cloud financial"] },
  { specialty: "plataforma", terms: ["platform engineer", "engenheiro de plataforma", "platform engineering", "internal developer platform", "infrastructure engineer", "engenheiro de infraestrutura"] },
  { specialty: "devops", terms: ["devops", "dev ops", "engenheiro devops", "ci cd", "cicd", "kubernetes engineer", "docker engineer"] },
  { specialty: "cloud", terms: ["cloud engineer", "engenheiro cloud", "cloud specialist", "especialista cloud", "aws engineer", "azure engineer", "gcp engineer", "cloud ops", "cloud native"] },
  { specialty: "sysadmin", terms: ["sysadmin", "system administrator", "administrador de sistemas", "administrador de servidores", "linux administrator", "windows server"] },
  { specialty: "redes", terms: ["network engineer", "engenheiro de redes", "analista de redes", "infraestrutura de redes", "analista de infraestrutura", "infraestrutura", "infrastructure", "telecom", "ccna", "network operations"] },
  { specialty: "noc", terms: ["noc", "network operations center", "monitoramento de infraestrutura"] },

  // --- Plataformas & Low-code: antes dos genericos ---------------------------
  { specialty: "salesforce", terms: ["salesforce", "apex developer", "sfdc", "salesforce developer", "salesforce admin"] },
  { specialty: "sap", terms: ["sap", "abap", "sap abap", "consultor sap", "sap fi", "sap mm", "sap sd", "s 4hana"] },
  { specialty: "servicenow", terms: ["servicenow", "service now"] },
  { specialty: "totvs", terms: ["totvs", "protheus", "advpl", "consultor protheus"] },
  { specialty: "oracle-apps", terms: ["oracle ebs", "oracle apps", "peoplesoft", "jd edwards", "oracle forms"] },
  { specialty: "low-code", terms: ["low code", "lowcode", "no code", "nocode", "outsystems", "mendix", "power platform", "power apps", "appian", "bubble developer", "retool"] },

  // --- Produto ---------------------------------------------------------------
  { specialty: "product-ops", terms: ["product ops", "product operations"] },
  { specialty: "product-analytics", terms: ["product analyst", "analista de produto", "product analytics"] },
  { specialty: "pmm", terms: ["product marketing", "pmm"] },
  { specialty: "po", terms: ["product owner", "po", "dono do produto", "product owner tech"] },
  { specialty: "pm", terms: ["product manager", "gerente de produto", "pm", "group product manager", "technical product manager", "gestor de produto", "produto digital"] },
  { specialty: "growth", terms: ["growth", "growth hacker", "growth engineer", "growth analyst", "analista de growth"] },
  { specialty: "analista-negocios", terms: ["business analyst", "analista de negocios", "analista funcional", "functional analyst", "analista de requisitos", "business partner tech"] },

  // --- Engenharia de Software ------------------------------------------------
  { specialty: "blockchain", terms: ["blockchain", "web3", "solidity", "smart contract", "ethereum developer", "crypto engineer", "nft"] },
  { specialty: "games", terms: ["game developer", "desenvolvedor de jogos", "game programmer", "unity developer", "unreal developer", "game engineer", "gameplay engineer"] },
  { specialty: "xr", terms: ["ar vr", "augmented reality", "virtual reality", "realidade aumentada", "realidade virtual", "xr developer", "metaverso"] },
  { specialty: "embarcado", terms: ["embedded", "embarcado", "firmware", "iot", "sistemas embarcados", "embedded engineer", "rtos", "hardware engineer", "fpga"] },
  { specialty: "mobile", terms: ["mobile developer", "desenvolvedor mobile", "ios developer", "android developer", "desenvolvedor ios", "desenvolvedor android", "react native developer", "flutter developer", "mobile engineer", "engenheiro mobile", "desenvolvedor de aplicativos", "swift developer", "kotlin developer", "mobile"] },
  { specialty: "frontend", terms: ["frontend", "front end", "desenvolvedor front", "front end developer", "frontend engineer", "engenheiro frontend", "react developer", "angular developer", "vue developer", "desenvolvedor react", "web developer front"] },
  { specialty: "backend", terms: ["backend", "back end", "desenvolvedor back", "back end developer", "backend engineer", "engenheiro backend", "api developer", "desenvolvedor de api", "server side", "java developer", "python developer", "node developer", "php developer", "net developer", "desenvolvedor net", "golang developer", "ruby developer", "desenvolvedor java", "desenvolvedor python", "desenvolvedor node", "desenvolvedor php"] },
  { specialty: "fullstack", terms: ["fullstack", "full stack", "desenvolvedor full", "full stack developer", "fullstack engineer", "engenheiro fullstack"] },

  // --- Suporte & Operacoes ---------------------------------------------------
  { specialty: "solutions-engineer", terms: ["solutions engineer", "solution engineer", "sales engineer", "pre sales", "presales", "pre vendas", "engenheiro de vendas", "field engineer", "engenheiro de solucoes"] },
  { specialty: "customer-success", terms: ["customer success", "sucesso do cliente", "technical account manager", "customer engineer", "support engineer", "engenheiro de suporte"] },
  { specialty: "implantacao", terms: ["implantacao", "implementation", "onboarding tecnico", "consultor de implantacao", "deployment specialist", "especialista em implantacao"] },
  { specialty: "suporte-tecnico", terms: ["suporte tecnico", "technical support", "service desk", "help desk", "helpdesk", "analista de suporte", "suporte n1", "suporte n2", "suporte n3", "suporte ti", "tecnico de suporte", "atendimento tecnico", "field service", "suporte"] },
  { specialty: "analista-sistemas", terms: ["analista de sistemas", "systems analyst", "analista de ti", "analista tecnico"] },

  // --- Tech Adjacentes -------------------------------------------------------
  { specialty: "devrel", terms: ["developer relations", "devrel", "developer advocate", "community manager tech", "developer experience"] },
  { specialty: "tech-writer", terms: ["technical writer", "tech writer", "redator tecnico", "documentacao tecnica", "documentation engineer"] },
  { specialty: "tech-recruiter", terms: ["tech recruiter", "it recruiter", "recrutador de ti", "recrutador tecnico", "recrutador", "recrutadora", "recrutamento tech", "talent acquisition tech", "tech sourcer"] },
  { specialty: "martech", terms: ["martech", "marketing technology", "cro specialist", "conversion rate optimization", "web analytics", "analista de marketing digital", "seo specialist"] },

  // --- Rede de seguranca: generico, sempre por ultimo ------------------------
  { specialty: "software", terms: ["software engineer", "engenheiro de software", "engenheira de software", "desenvolvedor", "desenvolvedora", "developer", "programador", "programadora", "dev", "software developer", "desenvolvimento de software", "desenvolvimento de sistemas", "analista de desenvolvimento", "desenvolvimento", "engenharia de software", "programacao", "engenheiro", "engineer", "software", "programming"] },
]

// -----------------------------------------------------------------------------
// EIXO DE INCLUSAO — flags acumulaveis, NAO areas.
//
// Separado da area de proposito. Enquanto `pcd` foi uma categoria, uma vaga de
// frontend para PCD sumia do filtro "Desenvolvimento". Como flag, a mesma vaga
// aparece nos dois lugares: e frontend E e PCD.
// -----------------------------------------------------------------------------

export type InclusionTag = { key: string; label: string }

export const INCLUSION_TAGS: InclusionTag[] = [
  { key: "pcd", label: "PCD" },
  { key: "mulheres", label: "Mulheres na tecnologia" },
  { key: "pessoas-pretas", label: "Pessoas pretas" },
  { key: "lgbtqia", label: "LGBTQIA+" },
  { key: "cinquenta-mais", label: "50+" },
  { key: "indigenas", label: "Pessoas indigenas" },
  { key: "refugiados", label: "Pessoas refugiadas" },
  { key: "neurodivergentes", label: "Neurodivergentes" },
]

const INCLUSION_RULES: { key: string; terms: string[] }[] = [
  { key: "pcd", terms: ["pcd", "pessoa com deficiencia", "pessoas com deficiencia", "deficiencia", "disability", "deficientes"] },
  { key: "mulheres", terms: ["mulher", "mulheres", "feminino", "feminina", "women", "woman", "female", "elas", "womens"] },
  { key: "pessoas-pretas", terms: ["pessoas pretas", "pessoas negras", "pretas", "pretos", "negras", "negros", "afrodescendentes", "black talent", "black"] },
  { key: "lgbtqia", terms: ["lgbt", "lgbtq", "lgbtqia", "lgbtqiap", "lgbtqia+", "diversidade sexual"] },
  { key: "cinquenta-mais", terms: ["50", "50 mais", "maturidade", "profissionais 50"] },
  { key: "indigenas", terms: ["indigena", "indigenas"] },
  { key: "refugiados", terms: ["refugiado", "refugiados", "refugiada", "refugiadas", "refugee", "refugees"] },
  { key: "neurodivergentes", terms: ["neurodivergente", "neurodivergentes", "neurodiversidade", "neurodiverse", "autista", "autismo"] },
]

// Categorias legadas de `jobs.category` que eram, na verdade, inclusao.
// O backfill usa este mapa para nao perder a classificacao ja existente.
export const LEGACY_CATEGORY_TO_INCLUSION: Record<string, string> = {
  pcd: "pcd",
  afirmativa_pessoas_pretas: "pessoas-pretas",
  afirmativa_mulheres_tecnologia: "mulheres",
}

// Categorias legadas de `jobs.category` -> especialidade nova. Usado pelo
// backfill como PISTA quando o titulo nao casa com nada: melhor herdar a
// classificacao antiga do que jogar a vaga em `outros`.
export const LEGACY_CATEGORY_TO_SPECIALTY: Record<string, string> = {
  desenvolvimento: "software",
  dados: "analise-dados",
  ia: "ai-engineer",
  po: "po",
  pm: "pm",
  qa: "qa-geral",
  cyber_security: "seguranca-geral",
  devops: "devops",
  product_design: "product-design",
  ux_design: "ux",
  ui_design: "ui",
  design: "product-design",
}

// -----------------------------------------------------------------------------
// INFERENCIA DE NIVEL
//
// Por que existe: o bot grava `level: "junior"` como DEFAULT quando nao
// classifica (app/api/jobs/share/route.ts). Ou seja, toda vaga nao classificada
// entra como junior e polui exatamente o filtro de quem esta comecando — o
// publico que mais depende dele. Aqui a senioridade e lida do titulo, que quase
// sempre a traz.
// -----------------------------------------------------------------------------

export const JOB_LEVELS = [
  "internship",
  "junior",
  "mid",
  "senior",
  "staff",
  "senior_staff",
  "principal",
  "distinguished",
] as const

export type JobLevelKey = (typeof JOB_LEVELS)[number]

// Ordenado: o mais especifico primeiro. "senior staff" PRECISA vir antes de
// "staff" e de "senior", senao cai no primeiro dos dois que casar.
const LEVEL_RULES: { level: JobLevelKey; terms: string[] }[] = [
  { level: "distinguished", terms: ["distinguished engineer", "distinguished"] },
  { level: "principal", terms: ["principal engineer", "principal software", "principal"] },
  { level: "senior_staff", terms: ["senior staff", "sr staff"] },
  { level: "staff", terms: ["staff engineer", "staff software", "staff"] },
  { level: "internship", terms: ["estagio", "estagiario", "estagiaria", "intern", "internship", "trainee", "aprendiz", "jovem aprendiz", "estag"] },
  { level: "junior", terms: ["junior", "jr", "entry level", "iniciante", "assistente", "nivel i"] },
  { level: "mid", terms: ["pleno", "pl", "mid level", "midlevel", "mid", "intermediario", "nivel ii"] },
  { level: "senior", terms: ["senior", "sr", "especialista", "specialist", "expert", "iii", "nivel iii"] },
]

// Cargos que sao senioridade alta por definicao, mesmo sem a palavra no titulo.
const LEADERSHIP_IMPLIES_SENIOR = new Set([
  "tech-lead",
  "engineering-manager",
  "arquiteto-software",
  "arquiteto-solucoes",
])

const LEADERSHIP_IMPLIES_PRINCIPAL = new Set(["head", "cto"])

// -----------------------------------------------------------------------------
// NORMALIZACAO E CASAMENTO
// -----------------------------------------------------------------------------

const SPECIALTY_BY_KEY = new Map(AREA_SPECIALTIES.map((s) => [s.key, s]))
const FAMILY_BY_KEY = new Map(AREA_FAMILIES.map((f) => [f.key, f]))
const INCLUSION_BY_KEY = new Map(INCLUSION_TAGS.map((t) => [t.key, t]))

/**
 * Texto -> forma comparavel: sem acento, caixa baixa, tudo que nao e
 * alfanumerico vira espaco, espacos colapsados. "Front-End" e "front end"
 * convergem; "C#" vira "c", mas titulo nao e onde stack se decide.
 */
export function normalizeAreaText(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Casamento por PALAVRA INTEIRA. Sem isso, "po" casaria dentro de "pontos" e
 * "pm" dentro de "pmo" — os dois termos mais curtos do catalogo sao tambem os
 * mais perigosos.
 */
function hasTerm(haystack: string, term: string): boolean {
  if (!haystack || !term) return false
  const padded = ` ${haystack} `
  return padded.includes(` ${term} `)
}

function matchFirst<T>(
  haystack: string,
  rules: { terms: string[]; value: T }[],
): T | null {
  for (const rule of rules) {
    for (const term of rule.terms) {
      if (hasTerm(haystack, term)) return rule.value
    }
  }
  return null
}

// Stack -> especialidade. So usado para DESEMPATAR quando o titulo e generico
// ("Analista de Sistemas Pleno" + react -> frontend). Nunca sobrepoe um
// casamento especifico do titulo.
const STACK_HINTS: Record<string, string> = {
  react: "frontend",
  angular: "frontend",
  vue: "frontend",
  svelte: "frontend",
  nextjs: "frontend",
  html: "frontend",
  css: "frontend",
  tailwind: "frontend",
  sass: "frontend",
  "react-native": "mobile",
  flutter: "mobile",
  swift: "mobile",
  android: "mobile",
  ios: "mobile",
  kotlin: "mobile",
  nodejs: "backend",
  django: "backend",
  flask: "backend",
  fastapi: "backend",
  spring: "backend",
  rails: "backend",
  laravel: "backend",
  nestjs: "backend",
  express: "backend",
  csharp: "backend",
  java: "backend",
  go: "backend",
  rust: "backend",
  elixir: "backend",
  php: "backend",
  scala: "engenharia-dados",
  spark: "engenharia-dados",
  airflow: "engenharia-dados",
  databricks: "engenharia-dados",
  snowflake: "engenharia-dados",
  kafka: "engenharia-dados",
  "power-bi": "bi",
  tableau: "bi",
  pytorch: "ml-engineer",
  tensorflow: "ml-engineer",
  pandas: "ciencia-dados",
  kubernetes: "devops",
  terraform: "devops",
  docker: "devops",
  jenkins: "devops",
  aws: "cloud",
  azure: "cloud",
  gcp: "cloud",
  figma: "ux",
  cypress: "qa-automacao",
  selenium: "qa-automacao",
  jest: "qa-automacao",
  postgresql: "dba",
  mysql: "dba",
  mongodb: "dba",
}

export type InferredArea = {
  family: AreaFamilyKey
  /** `null` apenas quando a familia e `outros`. */
  specialty: string | null
  /**
   * `title` = casou no titulo. `stack` = titulo generico, decidido pela stack.
   * `legacy` = herdado de `jobs.category`. `fallback` = nada casou.
   * Guardado para medir a qualidade da classificacao sem adivinhar depois.
   */
  source: "title" | "stack" | "legacy" | "fallback"
}

const FALLBACK_AREA: InferredArea = {
  family: "outros",
  specialty: null,
  source: "fallback",
}

function areaFor(specialtyKey: string, source: InferredArea["source"]): InferredArea {
  const specialty = SPECIALTY_BY_KEY.get(specialtyKey)
  if (!specialty) return FALLBACK_AREA
  return { family: specialty.family, specialty: specialty.key, source }
}

/**
 * inferJobArea — titulo (+ stacks, + categoria legada) -> familia e
 * especialidade.
 *
 * Nunca lanca e nunca devolve null: sem casamento a vaga vai para `outros` e
 * continua visivel. Esconder vaga por erro de classificacao e o unico resultado
 * inaceitavel aqui.
 */
export function inferJobArea(input: {
  title: string | null | undefined
  stackTags?: readonly string[] | null
  legacyCategory?: string | null
}): InferredArea {
  const title = normalizeAreaText(input.title)

  if (title) {
    const specialtyKey = matchFirst(
      title,
      AREA_RULES.map((rule) => ({ terms: rule.terms, value: rule.specialty })),
    )

    if (specialtyKey) {
      // O generico `software` e a rede de seguranca, nao uma resposta: se a
      // stack souber dizer front/back/mobile, ela ganha.
      if (specialtyKey === "software" && input.stackTags?.length) {
        const fromStack = specialtyFromStacks(input.stackTags)
        if (fromStack) return areaFor(fromStack, "stack")
      }
      return areaFor(specialtyKey, "title")
    }
  }

  const fromStack = input.stackTags?.length ? specialtyFromStacks(input.stackTags) : null
  if (fromStack) return areaFor(fromStack, "stack")

  const legacy = input.legacyCategory
    ? LEGACY_CATEGORY_TO_SPECIALTY[input.legacyCategory]
    : null
  if (legacy) return areaFor(legacy, "legacy")

  return FALLBACK_AREA
}

function specialtyFromStacks(tags: readonly string[]): string | null {
  const counts = new Map<string, number>()

  for (const tag of tags) {
    const key = normalizeAreaText(tag).replace(/\s+/g, "-")
    const hint = STACK_HINTS[key]
    if (hint) counts.set(hint, (counts.get(hint) ?? 0) + 1)
  }

  if (counts.size === 0) return null

  // Front + back na mesma vaga e fullstack, nao "o que apareceu primeiro".
  if (counts.has("frontend") && counts.has("backend")) return "fullstack"

  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  }
  return best
}

/**
 * inferJobLevel — senioridade a partir do titulo. Devolve `null` quando o
 * titulo nao diz nada, para o chamador PRESERVAR o que ja esta no banco em vez
 * de sobrescrever com um palpite.
 */
export function inferJobLevel(
  title: string | null | undefined,
  specialty?: string | null,
): JobLevelKey | null {
  const normalized = normalizeAreaText(title)

  if (normalized) {
    const fromTitle = matchFirst(
      normalized,
      LEVEL_RULES.map((rule) => ({ terms: rule.terms, value: rule.level })),
    )
    if (fromTitle) return fromTitle
  }

  if (specialty) {
    if (LEADERSHIP_IMPLIES_PRINCIPAL.has(specialty)) return "principal"
    if (LEADERSHIP_IMPLIES_SENIOR.has(specialty)) return "senior"
  }

  return null
}

/**
 * inferInclusionTags — le o eixo de inclusao do titulo e da categoria legada.
 *
 * NAO le a descricao de proposito: "nossa empresa valoriza a diversidade" esta
 * em metade das descricoes e marcaria quase toda vaga como afirmativa, o que
 * tornaria o filtro inutil e, pior, enganaria quem procura vaga afirmativa de
 * verdade.
 */
export function inferInclusionTags(input: {
  title: string | null | undefined
  legacyCategory?: string | null
  recommendationNote?: string | null
}): string[] {
  const found = new Set<string>()

  const legacy = input.legacyCategory
    ? LEGACY_CATEGORY_TO_INCLUSION[input.legacyCategory]
    : null
  if (legacy) found.add(legacy)

  const haystack = normalizeAreaText(
    [input.title, input.recommendationNote].filter(Boolean).join(" "),
  )

  if (haystack) {
    for (const rule of INCLUSION_RULES) {
      for (const term of rule.terms) {
        if (hasTerm(haystack, term)) {
          found.add(rule.key)
          break
        }
      }
    }
  }

  return INCLUSION_TAGS.filter((tag) => found.has(tag.key)).map((tag) => tag.key)
}

// -----------------------------------------------------------------------------
// LABELS E CATALOGO (consumo pela UI e pelo backfill)
// -----------------------------------------------------------------------------

export function getAreaFamilyLabel(key: string | null | undefined): string {
  if (!key) return "Outros"
  return FAMILY_BY_KEY.get(key as AreaFamilyKey)?.label ?? "Outros"
}

export function getAreaSpecialtyLabel(key: string | null | undefined): string {
  if (!key) return ""
  const known = SPECIALTY_BY_KEY.get(key)
  if (known) return known.label

  return key
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

export function getInclusionLabel(key: string | null | undefined): string {
  if (!key) return ""
  return INCLUSION_BY_KEY.get(key)?.label ?? key
}

export function isAreaFamily(key: string | null | undefined): key is AreaFamilyKey {
  return !!key && FAMILY_BY_KEY.has(key as AreaFamilyKey)
}

export function isAreaSpecialty(key: string | null | undefined): boolean {
  return !!key && SPECIALTY_BY_KEY.has(key)
}

export function isInclusionTag(key: string | null | undefined): boolean {
  return !!key && INCLUSION_BY_KEY.has(key)
}

export function specialtiesOfFamily(family: AreaFamilyKey): AreaSpecialty[] {
  return AREA_SPECIALTIES.filter((s) => s.family === family)
}

/** Catalogo completo para o filtro da UI, agrupado e na ordem de exibicao. */
export function areaCatalog(): { family: AreaFamily; specialties: AreaSpecialty[] }[] {
  return AREA_FAMILIES.map((family) => ({
    family,
    specialties: specialtiesOfFamily(family.key),
  }))
}

export const AREA_FAMILY_KEYS = AREA_FAMILIES.map((f) => f.key)
export const AREA_SPECIALTY_KEYS = AREA_SPECIALTIES.map((s) => s.key)
export const INCLUSION_TAG_KEYS = INCLUSION_TAGS.map((t) => t.key)
