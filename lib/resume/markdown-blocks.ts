export type ResumeBlockType = "h1" | "h2" | "h3" | "p" | "bullet"

export interface ResumeBlock {
  type: ResumeBlockType
  text: string
}

/**
 * Remove marcações inline simples de Markdown (negrito/itálico/código/links),
 * mantendo apenas o texto legível. Usado tanto na tela quanto no PDF.
 */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // imagens -> alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> texto
    .replace(/`([^`]+)`/g, "$1") // código inline
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **negrito**
    .replace(/__([^_]+)__/g, "$1") // __negrito__
    .replace(/\*([^*]+)\*/g, "$1") // *itálico*
    .replace(/(^|[^_])_([^_]+)_/g, "$1$2") // _itálico_
    .trim()
}

/**
 * Converte um Markdown simples (o formato que pedimos à IA) numa lista de blocos.
 * Suporta: # / ## / ### títulos, "- " e "* " bullets, e parágrafos.
 * É intencionalmente mínimo — é a fonte única usada pela tela e pelo PDF.
 */
export function parseResumeMarkdown(markdown: string): ResumeBlock[] {
  if (!markdown) return []

  const blocks: ResumeBlock[] = []
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Ignora separadores horizontais (---, ***, ___)
    if (/^([-*_])\1{2,}$/.test(line)) continue

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: stripInlineMarkdown(line.slice(4)) })
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: stripInlineMarkdown(line.slice(3)) })
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: stripInlineMarkdown(line.slice(2)) })
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: stripInlineMarkdown(line.replace(/^[-*]\s+/, "")) })
    } else {
      blocks.push({ type: "p", text: stripInlineMarkdown(line) })
    }
  }

  return blocks
}
