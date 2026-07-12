// Origem da vaga derivada do domínio de application_url. LinkedIn sempre usa
// linkedin.com e Glassdoor glassdoor.* — o domínio é sinal confiável de origem
// (a região Brasil/Internacional NÃO é, por isso vem do campo is_international).
export type JobSource = "linkedin" | "glassdoor" | "other"

export function getJobSource(url: string | null | undefined): JobSource {
  if (!url) return "other"
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes("linkedin.")) return "linkedin"
    if (host.includes("glassdoor.")) return "glassdoor"
    return "other"
  } catch {
    return "other"
  }
}

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  glassdoor: "Glassdoor",
  other: "Outro",
}
