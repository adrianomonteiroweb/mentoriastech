export const MAX_JOB_CATEGORY_LENGTH = 60
export const JOB_CATEGORY_PATTERN = /^[a-z0-9_]+$/
export const CUSTOM_JOB_CATEGORY_VALUE = "__custom_category__"

export const DEFAULT_JOB_CATEGORIES = [
  { value: "dados", label: "Dados" },
  { value: "ia", label: "IA" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "po", label: "PO" },
  { value: "pm", label: "PM" },
  { value: "qa", label: "QA" },
  { value: "cyber_security", label: "Cyber Security" },
  { value: "devops", label: "DevOps" },
  { value: "design", label: "Design" },
  { value: "pcd", label: "PCD" },
  { value: "afirmativa_pessoas_pretas", label: "Afirmativa: pessoas pretas" },
  { value: "afirmativa_mulheres_tecnologia", label: "Afirmativa: mulheres na tecnologia" },
  { value: "other", label: "Outra" },
] as const

export type JobCategoryOption = {
  value: string
  label: string
}

const CATEGORY_WORD_LABELS: Record<string, string> = {
  ia: "IA",
  po: "PO",
  pm: "PM",
  pcd: "PCD",
  qa: "QA",
  devops: "DevOps",
}

const LOWERCASE_CATEGORY_WORDS = new Set(["e", "de", "da", "do", "das", "dos", "em", "na", "no", "para"])

export function normalizeJobCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_JOB_CATEGORY_LENGTH)
}

export function isDefaultJobCategory(value: string) {
  return DEFAULT_JOB_CATEGORIES.some((category) => category.value === value)
}

export function getJobCategoryLabel(value: string) {
  const defaultCategory = DEFAULT_JOB_CATEGORIES.find((category) => category.value === value)

  if (defaultCategory) {
    return defaultCategory.label
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) => {
      const lowerWord = word.toLowerCase()

      if (CATEGORY_WORD_LABELS[lowerWord]) {
        return CATEGORY_WORD_LABELS[lowerWord]
      }

      if (index > 0 && LOWERCASE_CATEGORY_WORDS.has(lowerWord)) {
        return lowerWord
      }

      return `${lowerWord.charAt(0).toUpperCase()}${lowerWord.slice(1)}`
    })
    .join(" ")
}

export function mergeJobCategoryOptions(values: string[] = []) {
  const options: JobCategoryOption[] = [...DEFAULT_JOB_CATEGORIES]
  const seen = new Set(options.map((option) => option.value))

  values.forEach((value) => {
    if (!value || seen.has(value)) return

    seen.add(value)
    options.push({
      value,
      label: getJobCategoryLabel(value),
    })
  })

  return options
}
