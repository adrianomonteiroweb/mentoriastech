import { describe, it, expect } from "vitest"
import {
  DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT,
  composeResumePrompt,
  normalizeResumeAiPrompt,
} from "@/lib/resume-ai-prompt"

describe("normalizeResumeAiPrompt", () => {
  it("trims strings", () => {
    expect(normalizeResumeAiPrompt("  oi  ")).toBe("oi")
  })

  it("returns empty string for non-strings", () => {
    expect(normalizeResumeAiPrompt(null)).toBe("")
    expect(normalizeResumeAiPrompt(undefined)).toBe("")
    expect(normalizeResumeAiPrompt(123)).toBe("")
    expect(normalizeResumeAiPrompt({})).toBe("")
  })
})

describe("composeResumePrompt", () => {
  it("uses only the base prompt when custom is empty", () => {
    expect(composeResumePrompt("")).toBe(DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT)
    expect(composeResumePrompt(null)).toBe(DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT)
  })

  it("appends the custom prompt to the base prompt", () => {
    const out = composeResumePrompt("Priorize RPA")
    expect(out.startsWith(DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT)).toBe(true)
    expect(out).toContain("Priorize RPA")
    expect(out.length).toBeGreaterThan(DEFAULT_RESUME_IMPROVEMENT_BASE_PROMPT.length)
  })
})
