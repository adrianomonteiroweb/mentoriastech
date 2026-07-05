import type {
  SimEvaluationCategory,
  SimEvaluationResult,
  SimEvaluationRule,
  SimEvaluationRuleResult,
} from "@/lib/sim/evaluation-types"

/**
 * Motor de avaliação estática do Sprint Simulator: função pura que avalia
 * os arquivos do workspace contra as regras da task — nunca executa o
 * código do aluno, apenas inspeciona paths e conteúdos.
 */

export interface SimWorkspaceFileInput {
  path: string
  isFolder: boolean
  content: string
}

// Glob mínimo: `**` cruza pastas — inclusive zero, então "src/" + "**" + "/*.ts"
// casa com "src/app.ts". `*` casa dentro de um segmento. Suficiente para as
// regras autoradas pelo mentor — sem dependência externa.
export function globToRegExp(pattern: string): RegExp {
  const DOUBLE_STAR = String.fromCharCode(0)
  let source = pattern.replace(/\*\*/g, DOUBLE_STAR)
  source = source.replace(/[.+^${}()|[\]\\?]/g, "\\$&")
  source = source.split("*").join("[^/]*")
  source = source.split(`${DOUBLE_STAR}/`).join("(?:.*/)?")
  source = source.split(`/${DOUBLE_STAR}`).join("(?:/.*)?")
  source = source.split(DOUBLE_STAR).join(".*")
  return new RegExp(`^${source}$`)
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "")
}

/** Um path "existe" se há registro exato (arquivo/pasta) ou se é pasta implícita de algum arquivo. */
function pathExists(files: SimWorkspaceFileInput[], target: string): boolean {
  const normalized = normalizePath(target)
  return files.some(
    (file) =>
      normalizePath(file.path) === normalized ||
      normalizePath(file.path).startsWith(`${normalized}/`),
  )
}

function compileRegex(source: string, flags?: string): RegExp | null {
  try {
    // Conteúdo é limitado a 100KB e regex é autorada pelo mentor — risco de ReDoS baixo
    return new RegExp(source, flags)
  } catch {
    return null
  }
}

function checkRule(
  files: SimWorkspaceFileInput[],
  rule: SimEvaluationRule,
): boolean {
  switch (rule.kind) {
    case "path_exists":
      return pathExists(files, rule.path)

    case "path_matches": {
      const regex = globToRegExp(normalizePath(rule.pattern))
      const count = files.filter(
        (file) => !file.isFolder && regex.test(normalizePath(file.path)),
      ).length
      return count >= (rule.min ?? 1)
    }

    case "path_absent": {
      const regex = globToRegExp(normalizePath(rule.pattern))
      return !files.some(
        (file) => !file.isFolder && regex.test(normalizePath(file.path)),
      )
    }

    case "file_name_pattern": {
      // Convenção de nomeação: a pasta deve ter ao menos um arquivo e
      // TODOS os arquivos diretos dela devem casar com o padrão
      const dir = normalizePath(rule.dir)
      const regex = globToRegExp(rule.pattern)
      const direct = files.filter((file) => {
        if (file.isFolder) return false
        const path = normalizePath(file.path)
        if (!path.startsWith(`${dir}/`)) return false
        return !path.slice(dir.length + 1).includes("/")
      })
      if (direct.length === 0) return false
      return direct.every((file) => {
        const basename = normalizePath(file.path).split("/").pop() || ""
        return regex.test(basename)
      })
    }

    case "content_includes": {
      const file = files.find(
        (f) => !f.isFolder && normalizePath(f.path) === normalizePath(rule.path),
      )
      if (!file) return false
      const regex = compileRegex(rule.regex, rule.flags)
      if (!regex) return false
      return regex.test(file.content)
    }

    case "content_excludes": {
      // Arquivo ausente não viola a proibição (combine com path_exists se necessário)
      const file = files.find(
        (f) => !f.isFolder && normalizePath(f.path) === normalizePath(rule.path),
      )
      if (!file) return true
      const regex = compileRegex(rule.regex, rule.flags)
      if (!regex) return false
      return !regex.test(file.content)
    }
  }
}

export function evaluate(
  files: SimWorkspaceFileInput[],
  rules: SimEvaluationRule[],
): SimEvaluationResult {
  const results: SimEvaluationRuleResult[] = []
  let passedWeight = 0
  let totalWeight = 0
  const categoryTotals: Partial<
    Record<SimEvaluationCategory, { passed: number; total: number }>
  > = {}

  for (const rule of rules) {
    const passed = checkRule(files, rule)
    const weight = rule.weight ?? 1
    results.push({
      ruleId: rule.id,
      label: rule.label,
      category: rule.category,
      passed,
    })
    totalWeight += weight
    if (passed) passedWeight += weight

    const bucket = categoryTotals[rule.category] ?? { passed: 0, total: 0 }
    bucket.total += weight
    if (passed) bucket.passed += weight
    categoryTotals[rule.category] = bucket
  }

  const byCategory: SimEvaluationResult["byCategory"] = {}
  for (const [category, bucket] of Object.entries(categoryTotals)) {
    byCategory[category as SimEvaluationCategory] = Math.round(
      (bucket.passed / bucket.total) * 100,
    )
  }

  return {
    results,
    passedWeight,
    totalWeight,
    byCategory,
    evaluatedAt: new Date().toISOString(),
  }
}
