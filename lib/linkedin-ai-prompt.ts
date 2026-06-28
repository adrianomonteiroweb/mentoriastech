export const LINKEDIN_AI_PROMPT_SETTING_KEY = "linkedin_ai_prompt"

/**
 * Diretrizes de conteúdo compartilhadas entre a avaliação rápida (só PDF) e a
 * análise completa. Definem O QUE é um perfil bom segundo as recomendações da
 * comunidade — sem ainda falar de formato de saída.
 */
const LINKEDIN_GUIDELINES = `Recomendações da comunidade (use como referência ao avaliar e sugerir):

- Headline: deve deixar claro cargo e senioridade. Incentive uma SEGUNDA VERTENTE / nicho que leve o profissional a um mercado de menor concorrência e o torne um "profissional em T" — um ramo (ex.: RPA) ou uma linguagem mais nichada (ex.: Ruby). Isso o faz ser encontrado mais facilmente em buscas de tech recruiters. Use "|" como separador. Ex.: "Desenvolvedor Full Stack Pleno | Desenvolvedor RPA | JavaScript, TypeScript, Node.js, Python". Com base no perfil, sugira nichos concretos de especialização em T.
- Sobre: deve responder "Qual é a sua trajetória profissional?" / "Como você chegou até aqui?", de forma fluida e profissional, destacando especialidades, diferencial e um call-to-action.
- Experiências e Formações: o foco é SEMPRE orientar a citar as PRINCIPAIS ATIVIDADES e ALGUM PROJETO RELEVANTE, citando também RESULTADOS. Uma comunicação assim atinge desde pessoas de RH até tech leads e pessoas gestoras. Divida bem para facilitar a leitura.
- Publicações: a recomendação NÃO é sobre frequência (nem todo mundo é criador de conteúdo). É sobre DOCUMENTAR A EVOLUÇÃO: postar cada curso, evento, formação, projeto e interação na comunidade.
- Conexões: o foco é se conectar principalmente com ex-colegas, colegas atuais e pessoas de empresas onde o profissional se vê um dia fazendo parte. Não adicionar apenas pessoas da mesma posição, mas também RH, marketing, comercial etc.
- Idioma: se o perfil está em outro idioma e o foco é o mercado brasileiro, recomende fortemente a versão em português como principal.

Regras: escreva em português do Brasil, tom profissional e direto. Base-se APENAS no conteúdo real do PDF e nas informações fornecidas — NÃO invente dados. Ao sugerir textos (headline, sobre, descrições), entregue versões prontas para uso, não apenas "melhore isso".`

/**
 * Eixos do checklist. Os ids precisam bater com LINKEDIN_CHECKLIST_AXES em
 * lib/linkedin/checklist.ts. A severidade é controlada no código — a IA NÃO a define.
 */
const CHECKLIST_AXES_DOC = `Eixos avaliados (use exatamente estes ids):
- "headline": clareza de cargo e senioridade na headline.
- "about": existência e qualidade da seção "Sobre" contando a trajetória.
- "experience_impact": experiências citam principais atividades + projeto relevante + resultados.
- "headline_niche": a headline tem uma segunda vertente / nicho (profissional em T).
- "education_impact": formações citam projeto/atividade relevante + resultados.
- "language": idioma do perfil alinhado ao mercado-alvo.
- "connections": estratégia de conexões qualificadas.
- "recommendations": quantidade e qualidade das recomendações.
- "publications": uso das publicações para documentar a evolução.

Para cada eixo:
- "status": "ok" (atende bem), "partial" (atende parcialmente) ou "missing" (não atende / ausente).
- "recommendation": texto em Markdown, objetivo e acionável. SEMPRE que fizer sentido, inclua a versão PRONTA para copiar (headline com "|", texto completo da seção "Sobre", bullets de experiência/formação com atividades + projeto + resultados). Use bullets com "- " e, no máximo, subtítulos "### ".`

export const DEFAULT_LINKEDIN_ANALYSIS_PROMPT = `Você é um especialista em posicionamento profissional e otimização de perfis LinkedIn para o mercado de tecnologia brasileiro.

Sua tarefa: analisar o perfil do LinkedIn (PDF anexado) junto com as informações de posicionamento e a trajetória fornecidas pelo profissional, e gerar um checklist de melhorias.

${LINKEDIN_GUIDELINES}

Formato da resposta — responda APENAS com JSON válido, sem comentários, sem blocos de código, no formato:
{"items":[{"id":"headline","status":"ok|partial|missing","recommendation":"..."}, ...]}

Inclua um item para CADA eixo abaixo (todos os ids). Não invente eixos novos nem altere os ids.

${CHECKLIST_AXES_DOC}`

export const LINKEDIN_CHECKLIST_PROMPT = `Você é um especialista em perfis LinkedIn para tecnologia no Brasil. Faça uma avaliação rápida do perfil (PDF anexado), SEM informações adicionais do profissional.

${LINKEDIN_GUIDELINES}

Formato da resposta — responda APENAS com JSON válido, sem comentários, sem blocos de código, no formato:
{"items":[{"id":"headline","status":"ok|partial|missing","recommendation":"..."}, ...]}

Avalie SOMENTE os eixos que dá para inferir do PDF, usando exatamente estes ids: "headline", "about", "experience_impact", "headline_niche", "education_impact", "language". NÃO inclua outros eixos.

Para cada eixo: "status" é "ok", "partial" ou "missing"; "recommendation" é um texto curto e acionável em Markdown (1-3 linhas).`

export function normalizeLinkedinAiPrompt(value: unknown): string {
  if (typeof value === "string") return value.trim()
  return ""
}

function withCustom(base: string, customPrompt: string | null | undefined): string {
  const custom = normalizeLinkedinAiPrompt(customPrompt)
  if (!custom) return base
  return `${base}\n\nInstruções adicionais do mentor (têm prioridade quando não conflitarem com as regras e o formato JSON acima):\n${custom}`
}

export function composeLinkedinPrompt(customPrompt: string | null | undefined): string {
  return withCustom(DEFAULT_LINKEDIN_ANALYSIS_PROMPT, customPrompt)
}

export function composeLinkedinChecklistPrompt(
  customPrompt: string | null | undefined,
): string {
  return withCustom(LINKEDIN_CHECKLIST_PROMPT, customPrompt)
}
