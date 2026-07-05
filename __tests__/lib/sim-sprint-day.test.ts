import { describe, expect, it } from "vitest"
import { getSprintDay, isSprintOverdue } from "@/lib/sim/sprint-day"

describe("getSprintDay", () => {
  const start = new Date("2026-07-01T12:00:00Z")

  it("retorna dia 1 no momento do início", () => {
    expect(getSprintDay(start, 10, new Date("2026-07-01T12:00:00Z"))).toBe(1)
  })

  it("retorna dia 1 antes de completar 24h", () => {
    expect(getSprintDay(start, 10, new Date("2026-07-02T11:59:00Z"))).toBe(1)
  })

  it("retorna dia 2 após 24h", () => {
    expect(getSprintDay(start, 10, new Date("2026-07-02T12:00:00Z"))).toBe(2)
  })

  it("retorna o dia correto no meio da sprint", () => {
    expect(getSprintDay(start, 10, new Date("2026-07-05T15:00:00Z"))).toBe(5)
  })

  it("trava no último dia quando a sprint venceu", () => {
    expect(getSprintDay(start, 10, new Date("2026-08-01T12:00:00Z"))).toBe(10)
  })

  it("nunca retorna menos que 1 (relógio adiantado)", () => {
    expect(getSprintDay(start, 10, new Date("2026-06-30T12:00:00Z"))).toBe(1)
  })

  it("aceita startedAt como string ISO", () => {
    expect(
      getSprintDay("2026-07-01T12:00:00Z", 10, new Date("2026-07-03T13:00:00Z")),
    ).toBe(3)
  })
})

describe("isSprintOverdue", () => {
  const start = new Date("2026-07-01T12:00:00Z")

  it("não está vencida dentro do prazo", () => {
    expect(isSprintOverdue(start, 10, new Date("2026-07-10T12:00:00Z"))).toBe(false)
  })

  it("está vencida após o último dia", () => {
    expect(isSprintOverdue(start, 10, new Date("2026-07-11T12:00:00Z"))).toBe(true)
  })
})
