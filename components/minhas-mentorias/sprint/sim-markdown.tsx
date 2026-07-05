import { parseResumeMarkdown } from "@/lib/resume/markdown-blocks"

/**
 * Render simples de markdown (títulos, parágrafos e bullets) via
 * parseResumeMarkdown — tipografia legível, foco em baixa visão.
 */
export function SimMarkdown({ markdown }: { markdown: string }) {
  const blocks = parseResumeMarkdown(markdown)

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum conteúdo cadastrado.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return (
              <h3 key={index} className="text-lg font-bold text-foreground mt-2">
                {block.text}
              </h3>
            )
          case "h2":
            return (
              <h4 key={index} className="text-base font-semibold text-foreground mt-2">
                {block.text}
              </h4>
            )
          case "h3":
            return (
              <h5 key={index} className="text-sm font-semibold text-foreground mt-1">
                {block.text}
              </h5>
            )
          case "bullet":
            return (
              <p key={index} className="text-base leading-relaxed text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-primary">
                {block.text}
              </p>
            )
          default:
            return (
              <p key={index} className="text-base leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            )
        }
      })}
    </div>
  )
}
