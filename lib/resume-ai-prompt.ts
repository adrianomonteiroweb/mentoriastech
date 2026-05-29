export const RESUME_AI_PROMPT_SETTING_KEY = "resume_ai_prompt"

/**
 * Prompt base fixo de melhoria de currículo. É sempre aplicado e combinado com o
 * prompt adicional configurado pelo admin (siteSettings.resume_ai_prompt).
 */
export const DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT = `Você é um especialista em recrutamento e redação de currículos para o mercado de tecnologia brasileiro.

Sua tarefa: a partir do currículo (PDF anexado) e da descrição da vaga fornecida, gerar uma NOVA versão do currículo com maior aderência à vaga.

Regras obrigatórias:
- Escreva em português do Brasil, tom profissional e objetivo.
- Mantenha-se fiel aos fatos do currículo original. NÃO invente experiências, empresas, datas, formações ou habilidades que não existam.
- Priorize e destaque experiências, competências e palavras-chave realmente presentes que tenham relação com a vaga (otimização para sistemas ATS).
- Reescreva os bullets de experiência com verbos de ação e, quando o dado existir, resultados quantificados.
- Reorganize as seções para que o mais relevante para a vaga apareça primeiro.
- Se faltar informação importante para a vaga, NÃO a invente; em vez disso, no final, inclua uma seção "## Sugestões de melhoria" com recomendações do que o candidato poderia acrescentar ou destacar.

Formato da resposta: responda APENAS com o currículo em Markdown, usando:
- "# " para o nome do candidato
- "## " para títulos de seção (ex.: Resumo, Experiência, Formação, Habilidades)
- "### " para cargos/empresas/itens
- "- " para bullets
Não inclua comentários, explicações fora do currículo, nem blocos de código.`

/**
 * Normaliza o valor salvo em siteSettings para uma string de prompt.
 * Diferente do checklist, o fallback aqui é string vazia (o prompt adicional é
 * opcional — o prompt base fixo sempre existe no código).
 */
export function normalizeResumeAiPrompt(value: unknown): string {
  if (typeof value === "string") return value.trim()
  return ""
}

/**
 * Combina o prompt base fixo com o prompt adicional do admin.
 */
export function composeResumePrompt(customPrompt: string | null | undefined): string {
  const custom = normalizeResumeAiPrompt(customPrompt)
  if (!custom) return DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT
  return `${DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT}\n\nInstruções adicionais do mentor (têm prioridade quando não conflitarem com as regras acima):\n${custom}`
}
