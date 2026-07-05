import { describe, expect, it } from "vitest"
import {
  SIM_TASK_STATUSES,
  canTransition,
  getAllowedTransitions,
} from "@/lib/sim/task-transitions"

describe("transições do mentee", () => {
  it("segue o fluxo backlog → todo → doing → review", () => {
    expect(canTransition("mentee", "backlog", "todo")).toBe(true)
    expect(canTransition("mentee", "todo", "doing")).toBe(true)
    expect(canTransition("mentee", "doing", "review")).toBe(true)
  })

  it("pode devolver task para trás antes do review", () => {
    expect(canTransition("mentee", "todo", "backlog")).toBe(true)
    expect(canTransition("mentee", "doing", "todo")).toBe(true)
  })

  it("não pode pular etapas", () => {
    expect(canTransition("mentee", "backlog", "doing")).toBe(false)
    expect(canTransition("mentee", "backlog", "done")).toBe(false)
    expect(canTransition("mentee", "todo", "review")).toBe(false)
  })

  it("não mexe em tasks em review ou done (só o mentor)", () => {
    expect(getAllowedTransitions("mentee", "review")).toEqual([])
    expect(getAllowedTransitions("mentee", "done")).toEqual([])
  })

  it("nunca aprova a própria task", () => {
    for (const from of SIM_TASK_STATUSES) {
      expect(canTransition("mentee", from, "done")).toBe(false)
    }
  })
})

describe("transições do mentor", () => {
  it("aprova entrega (review → done)", () => {
    expect(canTransition("mentor", "review", "done")).toBe(true)
  })

  it("solicita ajustes (review → doing)", () => {
    expect(canTransition("mentor", "review", "doing")).toBe(true)
  })

  it("reabre task aprovada (done → doing)", () => {
    expect(canTransition("mentor", "done", "doing")).toBe(true)
  })

  it("também pode mover como o mentee", () => {
    expect(canTransition("mentor", "backlog", "todo")).toBe(true)
    expect(canTransition("mentor", "doing", "review")).toBe(true)
  })

  it("não pula do backlog direto para done", () => {
    expect(canTransition("mentor", "backlog", "done")).toBe(false)
  })
})
