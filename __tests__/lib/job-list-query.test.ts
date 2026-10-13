import { describe, expect, it } from "vitest"
import {
  buildJobListFilters,
  buildKeysetCondition,
  composeWhere,
  decodeCursor,
  encodeCursor,
  jobListQuerySchema,
  parseJobListQuery,
  relevanceRank,
  resolveSort,
} from "@/lib/job-list-query"

function query(search: string) {
  return parseJobListQuery(new URLSearchParams(search))
}

describe("parse da query", () => {
  it("usa defaults quando nao vem nada", () => {
    const q = query("")
    expect(q.limit).toBe(20)
    expect(q.scope).toBe("all")
    expect(q.family).toEqual([])
    expect(q.sort).toBeUndefined()
  })

  it("aceita multivalor por virgula e por repeticao", () => {
    expect(query("family=dados,design").family).toEqual(["dados", "design"])
    expect(query("family=dados&family=design").family).toEqual(["dados", "design"])
  })

  it("deduplica e ignora espaco e caixa", () => {
    expect(query("family=Dados, dados , DADOS").family).toEqual(["dados"])
  })

  // Um link compartilhado tem de abrir a lista mesmo quando um filtro saiu do
  // catalogo. Erro aqui seria uma pagina quebrada por uma URL antiga.
  it("descarta valor fora do catalogo em vez de rejeitar", () => {
    expect(query("family=dados,familia-que-nao-existe").family).toEqual(["dados"])
    expect(query("level=senior,nivel-invalido").level).toEqual(["senior"])
  })

  it("nunca lanca com query malformada", () => {
    expect(() => query("limit=abc&scope=marte&sort=aleatorio")).not.toThrow()
    expect(query("limit=abc&scope=marte").limit).toBe(20)
  })

  it("limita o tamanho da pagina", () => {
    expect(query("limit=9999").limit).toBe(20)
    expect(query("limit=50").limit).toBe(50)
    expect(jobListQuerySchema.parse({ limit: "30" }).limit).toBe(30)
  })

  it("normaliza pais para maiuscula", () => {
    expect(query("country=br,pt").country).toEqual(["BR", "PT"])
  })
})

describe("montagem do WHERE", () => {
  it("sempre restringe a vagas aprovadas", () => {
    const where = composeWhere(buildJobListFilters(query("")))
    expect(JSON.stringify(where)).toContain("approved")
  })

  it("cria um fragmento por dimensao ativa", () => {
    const parts = buildJobListFilters(query("family=dados&level=senior&scope=br"))
    expect(Array.from(parts.keys()).sort()).toEqual(["family", "level", "scope"])
  })

  it("dimensao ausente nao vira fragmento", () => {
    expect(buildJobListFilters(query("")).size).toBe(0)
  })

  // O coracao das facetas: ao escolher "Front-end", as outras especialidades
  // precisam continuar contando. Se a propria dimensao entrasse no filtro, elas
  // apareceriam todas como 0 e o filtro viraria beco sem saida.
  it("composeWhere consegue excluir a propria dimensao", () => {
    const parts = buildJobListFilters(query("family=dados&level=senior"))

    const comTudo = JSON.stringify(composeWhere(parts))
    const semFamilia = JSON.stringify(composeWhere(parts, { except: "family" }))

    expect(comTudo).toContain("area_family")
    expect(semFamilia).not.toContain("area_family")
    // as outras dimensoes continuam valendo
    expect(semFamilia).toContain("level")
  })
})

describe("escopo Brasil / internacional", () => {
  it("br e world produzem condicoes opostas", () => {
    const br = JSON.stringify(composeWhere(buildJobListFilters(query("scope=br"))))
    const world = JSON.stringify(composeWhere(buildJobListFilters(query("scope=world"))))

    expect(br).toContain("country_code")
    expect(world).toContain("not")
  })

  it("scope=all nao filtra nada", () => {
    expect(buildJobListFilters(query("scope=all")).has("scope")).toBe(false)
  })
})

describe("busca", () => {
  it("procura em titulo, empresa e stack", () => {
    const parts = buildJobListFilters(query("q=react"))
    const fragment = JSON.stringify(parts.get("q"))

    expect(fragment).toContain("title")
    expect(fragment).toContain("company")
    expect(fragment).toContain("stack_tags")
  })

  // Sem escape, buscar "100%" viraria um curinga e devolveria a base inteira.
  it("escapa curingas do LIKE no termo buscado", () => {
    const fragment = JSON.stringify(buildJobListFilters(query("q=100%")).get("q"))
    expect(fragment).toContain("\\\\%")
  })
})

// A paginacao por keyset so e correta se o cursor voltar EXATAMENTE o que
// entrou: um campo perdido no caminho faz a proxima pagina pular ou repetir
// vagas, e num feed que recebe vagas o tempo todo isso e invisivel em teste
// manual.
describe("cursor", () => {
  const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
  const CREATED = "2026-10-12T12:00:00.000Z"

  it("faz round-trip da ordenacao por data", () => {
    const cursor = encodeCursor({ createdAt: CREATED, id: UUID })
    expect(decodeCursor(cursor)).toEqual({
      rank: undefined,
      likeCount: undefined,
      createdAt: CREATED,
      id: UUID,
    })
  })

  it("preserva like_count e rank quando existem", () => {
    expect(decodeCursor(encodeCursor({ likeCount: 42, createdAt: CREATED, id: UUID })))
      .toMatchObject({ likeCount: 42 })
    expect(decodeCursor(encodeCursor({ rank: 0, createdAt: CREATED, id: UUID })))
      .toMatchObject({ rank: 0 })
  })

  it("rank zero sobrevive (nao pode virar undefined)", () => {
    // `0` e o rank do melhor resultado da busca. Se um `||` o tratasse como
    // ausente, a segunda pagina de uma busca recomecaria do zero.
    expect(decodeCursor(encodeCursor({ rank: 0, createdAt: CREATED, id: UUID }))?.rank).toBe(0)
  })

  // Cursor corrompido tem de reiniciar a lista, nunca quebrar a pagina.
  it("devolve null para cursor invalido em vez de lancar", () => {
    for (const bad of ["", "nao-e-base64!!", Buffer.from("lixo").toString("base64url"),
                       Buffer.from("||data-ruim|nao-uuid").toString("base64url")]) {
      expect(() => decodeCursor(bad)).not.toThrow()
      expect(decodeCursor(bad)).toBeNull()
    }
    expect(decodeCursor(undefined)).toBeNull()
  })

  it("rejeita id que nao e uuid", () => {
    expect(decodeCursor(encodeCursor({ createdAt: CREATED, id: "1; drop table jobs" }))).toBeNull()
  })

  it("a condicao de keyset usa o desempate por id", () => {
    const sqlText = JSON.stringify(
      buildKeysetCondition("recent", null, { createdAt: CREATED, id: UUID }),
    )
    expect(sqlText).toContain("created_at")
    expect(sqlText).toContain("id")
  })

  it("keyset de popular compara like_count antes da data", () => {
    const sqlText = JSON.stringify(
      buildKeysetCondition("popular", null, { likeCount: 7, createdAt: CREATED, id: UUID }),
    )
    expect(sqlText).toContain("like_count")
  })
})

describe("ordenacao padrao", () => {
  // Quase todas as vagas sao do mesmo dia: dentro de uma busca, "mais recente"
  // e praticamente aleatorio. Por isso busca cai em relevancia.
  it("sem busca ordena por recentes; com busca, por relevancia", () => {
    expect(resolveSort(query(""))).toBe("recent")
    expect(resolveSort(query("q=react"))).toBe("relevant")
  })

  it("escolha explicita vence o default", () => {
    expect(resolveSort(query("q=react&sort=recent"))).toBe("recent")
    expect(resolveSort(query("sort=popular"))).toBe("popular")
  })

  it("relevancia prioriza titulo que comeca com o termo", () => {
    const rank = JSON.stringify(relevanceRank("react"))
    expect(rank).toContain("title")
    expect(rank).toContain("company")
  })
})
