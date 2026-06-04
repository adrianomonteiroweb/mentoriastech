import { describe, expect, it } from "vitest"
import {
  formatJobActiveHours,
  getJobActiveHours,
  getJobSourcePostedAt,
} from "@/lib/job-active-time"

describe("job active time", () => {
  it("calculates the source posting time from informed active hours", () => {
    const now = new Date("2026-06-04T12:00:00.000Z")

    expect(getJobSourcePostedAt(5, now).toISOString()).toBe(
      "2026-06-04T07:00:00.000Z",
    )
  })

  it("keeps counting complete hours after the job enters the platform", () => {
    const postedAt = "2026-06-04T07:00:00.000Z"
    const now = new Date("2026-06-04T14:35:00.000Z").getTime()

    expect(getJobActiveHours(postedAt, now)).toBe(7)
  })

  it("formats singular and plural active hours", () => {
    expect(formatJobActiveHours(1)).toBe("Ativa há 1 hora")
    expect(formatJobActiveHours(24)).toBe("Ativa há 24 horas")
  })
})
