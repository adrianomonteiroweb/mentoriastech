import { describe, it, expect } from "vitest"
import { buildRRule, describeRRule, expandRRuleDates } from "@/lib/rrule-utils"

describe("buildRRule", () => {
  it("should build rrule for single day", () => {
    expect(buildRRule([1])).toBe("FREQ=WEEKLY;BYDAY=MO")
  })

  it("should build rrule for multiple days", () => {
    expect(buildRRule([1, 3, 5])).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR")
  })

  it("should handle Sunday (0)", () => {
    expect(buildRRule([0])).toBe("FREQ=WEEKLY;BYDAY=SU")
  })

  it("should handle Saturday (6)", () => {
    expect(buildRRule([6])).toBe("FREQ=WEEKLY;BYDAY=SA")
  })

  it("should handle all days", () => {
    expect(buildRRule([0, 1, 2, 3, 4, 5, 6])).toBe(
      "FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA",
    )
  })

  it("should handle empty array", () => {
    expect(buildRRule([])).toBe("FREQ=WEEKLY;BYDAY=")
  })
})

describe("describeRRule", () => {
  it("should describe single day", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=MO")).toBe("Seg (semanal)")
  })

  it("should describe multiple days", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe(
      "Seg, Qua, Sex (semanal)",
    )
  })

  it("should describe weekend days in pt-BR", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=SA,SU")).toBe(
      "Sáb, Dom (semanal)",
    )
  })

  it("should return raw string for non-BYDAY rules", () => {
    const raw = "FREQ=DAILY"
    expect(describeRRule(raw)).toBe(raw)
  })
})

describe("expandRRuleDates", () => {
  it("should expand weekly MO,WE,FR within a date range", () => {
    const rrule = "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    const rangeStart = new Date("2026-04-06T00:00:00Z") // Monday
    const rangeEnd = new Date("2026-04-12T23:59:59Z") // Sunday

    const dates = expandRRuleDates(
      rrule,
      "2026-01-01",
      null,
      rangeStart,
      rangeEnd,
    )

    expect(dates).toContain("2026-04-06") // Monday
    expect(dates).toContain("2026-04-08") // Wednesday
    expect(dates).toContain("2026-04-10") // Friday
    expect(dates).not.toContain("2026-04-07") // Tuesday
    expect(dates).not.toContain("2026-04-11") // Saturday
  })

  it("should respect recurrence_end", () => {
    const rrule = "FREQ=WEEKLY;BYDAY=MO"
    const rangeStart = new Date("2026-04-01T00:00:00Z")
    const rangeEnd = new Date("2026-04-30T23:59:59Z")

    const dates = expandRRuleDates(
      rrule,
      "2026-01-01",
      "2026-04-15", // end mid-month
      rangeStart,
      rangeEnd,
    )

    // Should have Mondays up to April 13 (April 20 excluded)
    expect(dates).toContain("2026-04-06")
    expect(dates).toContain("2026-04-13")
    expect(dates).not.toContain("2026-04-20")
    expect(dates).not.toContain("2026-04-27")
  })

  it("should return empty array for invalid rrule", () => {
    const dates = expandRRuleDates(
      "INVALID",
      "2026-01-01",
      null,
      new Date("2026-04-01"),
      new Date("2026-04-30"),
    )
    expect(dates).toEqual([])
  })

  it("should return dates in YYYY-MM-DD format", () => {
    const dates = expandRRuleDates(
      "FREQ=WEEKLY;BYDAY=TU",
      "2026-04-01",
      null,
      new Date("2026-04-01T00:00:00Z"),
      new Date("2026-04-08T23:59:59Z"),
    )

    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("should not return dates before recurrence_start", () => {
    const dates = expandRRuleDates(
      "FREQ=WEEKLY;BYDAY=MO",
      "2026-04-13", // start from April 13
      null,
      new Date("2026-04-01T00:00:00Z"),
      new Date("2026-04-30T23:59:59Z"),
    )

    expect(dates).not.toContain("2026-04-06")
    expect(dates).toContain("2026-04-13")
    expect(dates).toContain("2026-04-20")
  })
})
