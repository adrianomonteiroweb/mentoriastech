import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const returning = vi.fn()
  const where = vi.fn(() => ({ returning }))
  const set = vi.fn(() => ({ where }))
  const update = vi.fn(() => ({ set }))

  return {
    returning,
    set,
    update,
  }
})

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  eq: vi.fn((...values: unknown[]) => ({ operator: "eq", values })),
  isNull: vi.fn((value: unknown) => ({ operator: "isNull", value })),
  lt: vi.fn((...values: unknown[]) => ({ operator: "lt", values })),
  or: vi.fn((...conditions: unknown[]) => conditions),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    query: strings.join("?"),
    values,
  })),
}))

vi.mock("@/lib/db", () => ({
  db: {
    update: mocks.update,
  },
  ads: {
    id: "ads.id",
    isActive: "ads.is_active",
    clickCount: "ads.click_count",
    maxClicks: "ads.max_clicks",
    updatedAt: "ads.updated_at",
  },
}))

import { POST } from "@/app/api/ads/[id]/track/route"

function makeRequest(event: "view" | "click") {
  return new Request("http://localhost/api/ads/ad-1/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  })
}

const params = { params: Promise.resolve({ id: "ad-1" }) }

describe("POST /api/ads/[id]/track", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("increments and deactivates an ad at its click limit in one update", async () => {
    mocks.returning.mockResolvedValue([
      { clickCount: 1, maxClicks: 1, isActive: false },
    ])

    const response = await POST(makeRequest("click"), params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        clickCount: expect.anything(),
        isActive: expect.objectContaining({
          query: expect.stringContaining("CASE"),
        }),
        updatedAt: expect.any(Date),
      }),
    )
    expect(body).toEqual({
      success: true,
      data: {
        click_count: 1,
        max_clicks: 1,
        is_active: false,
      },
    })
  })
})
