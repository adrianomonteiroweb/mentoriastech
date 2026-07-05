import { describe, expect, it } from "vitest"
import {
  evaluate,
  globToRegExp,
  type SimWorkspaceFileInput,
} from "@/lib/sim/evaluation"
import type { SimEvaluationRule } from "@/lib/sim/evaluation-types"

const file = (path: string, content = ""): SimWorkspaceFileInput => ({
  path,
  isFolder: false,
  content,
})
const folder = (path: string): SimWorkspaceFileInput => ({
  path,
  isFolder: true,
  content: "",
})

// Workspace fixture no formato do spec (API de produtos em camadas)
const workspace: SimWorkspaceFileInput[] = [
  folder("src"),
  folder("src/controllers"),
  file("src/controllers/product.controller.ts", "import { ProductService } from '../services/product.service'\nexport class ProductController {}"),
  file("src/services/product.service.ts", "export class ProductService {}"),
  file("src/repositories/product.repository.ts", "export class ProductRepository {}"),
  file("src/app.ts", "import express from 'express'\nconst app = express()"),
  file("README.md", "# API de Produtos"),
]

const rule = (partial: Partial<SimEvaluationRule> & Pick<SimEvaluationRule, "kind">) =>
  ({
    id: partial.id ?? "r1",
    label: partial.label ?? "regra",
    category: partial.category ?? "structure",
    weight: partial.weight ?? 1,
    ...partial,
  }) as SimEvaluationRule

describe("globToRegExp", () => {
  it("* não cruza pastas, ** cruza", () => {
    expect(globToRegExp("src/*.ts").test("src/app.ts")).toBe(true)
    expect(globToRegExp("src/*.ts").test("src/controllers/a.ts")).toBe(false)
    expect(globToRegExp("src/**/*.ts").test("src/controllers/a.ts")).toBe(true)
  })

  it("escapa caracteres de regex no padrão", () => {
    expect(globToRegExp("*.controller.ts").test("product.controller.ts")).toBe(true)
    expect(globToRegExp("*.controller.ts").test("productXcontrollerXts")).toBe(false)
  })
})

describe("evaluate — path_exists", () => {
  it("acha arquivo exato", () => {
    const result = evaluate(workspace, [
      rule({ kind: "path_exists", path: "src/app.ts" }),
    ])
    expect(result.results[0].passed).toBe(true)
  })

  it("acha pasta implícita (sem registro explícito)", () => {
    const result = evaluate(workspace, [
      rule({ kind: "path_exists", path: "src/services" }),
    ])
    expect(result.results[0].passed).toBe(true)
  })

  it("falha quando não existe", () => {
    const result = evaluate(workspace, [
      rule({ kind: "path_exists", path: "src/middlewares" }),
    ])
    expect(result.results[0].passed).toBe(false)
  })
})

describe("evaluate — path_matches / path_absent", () => {
  it("path_matches com mínimo de ocorrências", () => {
    const ok = evaluate(workspace, [
      rule({ kind: "path_matches", pattern: "src/**/*.ts", min: 4 }),
    ])
    expect(ok.results[0].passed).toBe(true)

    const insufficient = evaluate(workspace, [
      rule({ kind: "path_matches", pattern: "src/**/*.ts", min: 10 }),
    ])
    expect(insufficient.results[0].passed).toBe(false)
  })

  it("path_absent proíbe padrão", () => {
    const ok = evaluate(workspace, [
      rule({ kind: "path_absent", pattern: "**/*.spec.js" }),
    ])
    expect(ok.results[0].passed).toBe(true)

    const violated = evaluate(
      [...workspace, file("src/legacy.spec.js")],
      [rule({ kind: "path_absent", pattern: "**/*.spec.js" })],
    )
    expect(violated.results[0].passed).toBe(false)
  })
})

describe("evaluate — file_name_pattern", () => {
  it("passa quando todos os arquivos da pasta seguem o padrão", () => {
    const result = evaluate(workspace, [
      rule({
        kind: "file_name_pattern",
        dir: "src/controllers",
        pattern: "*.controller.ts",
      }),
    ])
    expect(result.results[0].passed).toBe(true)
  })

  it("falha com arquivo fora do padrão na pasta", () => {
    const result = evaluate(
      [...workspace, file("src/controllers/helpers.ts")],
      [
        rule({
          kind: "file_name_pattern",
          dir: "src/controllers",
          pattern: "*.controller.ts",
        }),
      ],
    )
    expect(result.results[0].passed).toBe(false)
  })

  it("falha com pasta vazia (nada a verificar)", () => {
    const result = evaluate(workspace, [
      rule({
        kind: "file_name_pattern",
        dir: "src/middlewares",
        pattern: "*.middleware.ts",
      }),
    ])
    expect(result.results[0].passed).toBe(false)
  })
})

describe("evaluate — content_includes / content_excludes", () => {
  it("content_includes acha padrão no arquivo", () => {
    const result = evaluate(workspace, [
      rule({
        kind: "content_includes",
        path: "src/app.ts",
        regex: "express\\(\\)",
      }),
    ])
    expect(result.results[0].passed).toBe(true)
  })

  it("content_includes falha se arquivo não existe", () => {
    const result = evaluate(workspace, [
      rule({ kind: "content_includes", path: "src/server.ts", regex: "listen" }),
    ])
    expect(result.results[0].passed).toBe(false)
  })

  it("content_excludes reprova padrão proibido", () => {
    const result = evaluate(
      [file("src/app.ts", "console.log('debug')")],
      [
        rule({
          kind: "content_excludes",
          path: "src/app.ts",
          regex: "console\\.log",
        }),
      ],
    )
    expect(result.results[0].passed).toBe(false)
  })

  it("content_excludes passa quando arquivo não existe (nada viola)", () => {
    const result = evaluate(workspace, [
      rule({ kind: "content_excludes", path: "src/x.ts", regex: "eval" }),
    ])
    expect(result.results[0].passed).toBe(true)
  })

  it("regex inválida não derruba a avaliação (regra falha)", () => {
    const result = evaluate(workspace, [
      rule({ kind: "content_includes", path: "src/app.ts", regex: "([" }),
    ])
    expect(result.results[0].passed).toBe(false)
  })
})

describe("evaluate — pesos e categorias", () => {
  it("calcula pesos e percentuais por categoria", () => {
    const result = evaluate(workspace, [
      rule({ id: "a", kind: "path_exists", path: "src/app.ts", weight: 3, category: "structure" }),
      rule({ id: "b", kind: "path_exists", path: "src/nao-existe.ts", weight: 1, category: "structure" }),
      rule({ id: "c", kind: "content_includes", path: "src/app.ts", regex: "express", weight: 2, category: "code" }),
    ])
    expect(result.totalWeight).toBe(6)
    expect(result.passedWeight).toBe(5)
    expect(result.byCategory.structure).toBe(75) // 3 de 4
    expect(result.byCategory.code).toBe(100)
  })

  it("workspace vazio reprova tudo menos proibições", () => {
    const result = evaluate([], [
      rule({ id: "a", kind: "path_exists", path: "src" }),
      rule({ id: "b", kind: "path_absent", pattern: "**/*.js" }),
    ])
    expect(result.results[0].passed).toBe(false)
    expect(result.results[1].passed).toBe(true)
  })
})
