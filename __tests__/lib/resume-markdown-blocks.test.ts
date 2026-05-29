import { describe, it, expect } from "vitest"
import { parseResumeMarkdown, stripInlineMarkdown } from "@/lib/resume/markdown-blocks"

describe("stripInlineMarkdown", () => {
  it("removes bold, italic and code markers", () => {
    expect(stripInlineMarkdown("**João** tem _5 anos_ de `Node.js`")).toBe(
      "João tem 5 anos de Node.js",
    )
  })

  it("keeps link text and drops the url", () => {
    expect(stripInlineMarkdown("[LinkedIn](https://x.com/y)")).toBe("LinkedIn")
  })
})

describe("parseResumeMarkdown", () => {
  it("returns empty array for empty input", () => {
    expect(parseResumeMarkdown("")).toEqual([])
  })

  it("classifies headings, bullets and paragraphs", () => {
    const md = [
      "# Maria Silva",
      "## Experiência",
      "### Empresa X",
      "- Fez algo importante",
      "* Outro ponto",
      "Texto comum.",
    ].join("\n")

    expect(parseResumeMarkdown(md)).toEqual([
      { type: "h1", text: "Maria Silva" },
      { type: "h2", text: "Experiência" },
      { type: "h3", text: "Empresa X" },
      { type: "bullet", text: "Fez algo importante" },
      { type: "bullet", text: "Outro ponto" },
      { type: "p", text: "Texto comum." },
    ])
  })

  it("ignores blank lines and horizontal rules", () => {
    const md = "# Nome\n\n---\n\nResumo"
    expect(parseResumeMarkdown(md)).toEqual([
      { type: "h1", text: "Nome" },
      { type: "p", text: "Resumo" },
    ])
  })

  it("strips inline markup inside blocks", () => {
    expect(parseResumeMarkdown("- Domínio de **TypeScript**")).toEqual([
      { type: "bullet", text: "Domínio de TypeScript" },
    ])
  })
})
