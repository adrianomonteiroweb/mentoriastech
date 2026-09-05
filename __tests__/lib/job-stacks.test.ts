import { describe, expect, it } from "vitest"
import {
  canonicalStacks,
  canonicalizeStackTags,
  getStackLabel,
  normalizeStackKey,
} from "@/lib/job-stacks"

describe("normalizeStackKey", () => {
  // Este é o motivo de a tabela `stacks` existir: agregando pela tag crua,
  // "node", "Node.js" e "nodejs" viravam três barras no gráfico.
  it("colapsa as grafias da mesma stack", () => {
    for (const tag of ["node", "Node", "node.js", "Node.js", "nodejs", "NODE JS"]) {
      expect(normalizeStackKey(tag)).toBe("nodejs")
    }
    for (const tag of ["react", "React", "reactjs", "React.js"]) {
      expect(normalizeStackKey(tag)).toBe("react")
    }
    for (const tag of ["postgres", "Postgres", "postgresql", "PostgreSQL", "psql"]) {
      expect(normalizeStackKey(tag)).toBe("postgresql")
    }
  })

  // Sem a tabela de apelidos, a slugificação destruiria estes: "c#" -> "c",
  // "c++" -> "c", ".net" -> "net".
  it("preserva as stacks que a slugificação destruiria", () => {
    expect(normalizeStackKey("c#")).toBe("csharp")
    expect(normalizeStackKey("C#")).toBe("csharp")
    expect(normalizeStackKey(".NET")).toBe("csharp")
    expect(normalizeStackKey("dotnet")).toBe("csharp")
    expect(normalizeStackKey("c++")).toBe("cpp")
  })

  it("não confunde React com React Native", () => {
    expect(normalizeStackKey("react native")).toBe("react-native")
    expect(normalizeStackKey("React Native")).toBe("react-native")
    expect(normalizeStackKey("react")).not.toBe("react-native")
  })

  it("normaliza stack com espaço e acento", () => {
    expect(normalizeStackKey("Power BI")).toBe("power-bi")
    expect(normalizeStackKey("powerbi")).toBe("power-bi")
    expect(normalizeStackKey("Tailwind CSS")).toBe("tailwind")
  })

  it("mantém chave desconhecida em vez de descartar", () => {
    expect(normalizeStackKey("Solidity")).toBe("solidity")
    expect(normalizeStackKey("Adobe XD")).toBe("adobe-xd")
  })

  it("descarta vazio e ruído", () => {
    expect(normalizeStackKey(null)).toBeNull()
    expect(normalizeStackKey("")).toBeNull()
    expect(normalizeStackKey("  ")).toBeNull()
    expect(normalizeStackKey("-")).toBeNull()
    expect(normalizeStackKey("a")).toBeNull()
  })
})

describe("getStackLabel", () => {
  it("usa o label do catálogo quando conhece a chave", () => {
    expect(getStackLabel("nodejs")).toBe("Node.js")
    expect(getStackLabel("csharp")).toBe("C# / .NET")
    expect(getStackLabel("power-bi")).toBe("Power BI")
  })

  it("cai num title-case decente para chave desconhecida", () => {
    expect(getStackLabel("solidity")).toBe("Solidity")
    expect(getStackLabel("adobe-xd")).toBe("Adobe Xd")
  })
})

describe("canonicalizeStackTags", () => {
  it("normaliza, deduplica e preserva a ordem de primeira aparição", () => {
    const result = canonicalizeStackTags(["Node.js", "node", "React", "typescript"])
    expect(result.map((s) => s.key)).toEqual(["nodejs", "react", "typescript"])
    expect(result[0].label).toBe("Node.js")
  })

  it("descarta tags inúteis sem quebrar o resto", () => {
    expect(canonicalizeStackTags(["", "  ", "react", "-"]).map((s) => s.key)).toEqual([
      "react",
    ])
  })

  it("devolve lista vazia para entrada vazia", () => {
    expect(canonicalizeStackTags(null)).toEqual([])
    expect(canonicalizeStackTags([])).toEqual([])
  })
})

describe("canonicalStacks", () => {
  it("não tem chave duplicada (a coluna stacks.key é unique)", () => {
    const keys = canonicalStacks().map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("toda chave do catálogo é estável sob normalizeStackKey", () => {
    for (const stack of canonicalStacks()) {
      expect(normalizeStackKey(stack.key)).toBe(stack.key)
    }
  })
})
