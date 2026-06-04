import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const returning = vi.fn()
  const where = vi.fn(() => ({ returning }))
  const set = vi.fn(() => ({ where }))
  const db = {
    update: vi.fn(() => ({ set })),
  }

  return {
    db,
    returning,
    set,
  }
})

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq"),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    query: strings.join("?"),
    values,
  })),
}))

vi.mock("@/lib/utils/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin-1" }),
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
  ads: {
    id: "ads.id",
    isActive: "ads.is_active",
    clickCount: "ads.click_count",
  },
}))

vi.mock("@/lib/db/mappers", () => ({
  toAd: vi.fn((ad) => ad),
}))

import { PUT } from "@/app/api/admin/ads/[id]/route"

const ad = {
  id: "ad-1",
  title: "Anuncio teste",
  isActive: false,
  clickCount: 2,
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/ads/ad-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: ad.id }) }

describe("PUT /api/admin/ads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.returning.mockResolvedValue([ad])
  })

  it("resets click_count when activating an ad", async () => {
    const response = await PUT(makeRequest({ is_active: true }), params)

    expect(response.status).toBe(200)
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        clickCount: expect.objectContaining({
          query: expect.stringContaining("CASE"),
          values: ["ads.is_active", "ads.click_count"],
        }),
      }),
    )
  })

  it("does not reset click_count when deactivating an ad", async () => {
    const response = await PUT(makeRequest({ is_active: false }), params)

    expect(response.status).toBe(200)
    expect(mocks.set).toHaveBeenCalledWith(
      expect.not.objectContaining({
        clickCount: expect.anything(),
      }),
    )
  })

  it("does not reset click_count when editing without changing activation", async () => {
    const response = await PUT(makeRequest({ title: "Anuncio atualizado" }), params)

    expect(response.status).toBe(200)
    expect(mocks.set).toHaveBeenCalledWith(
      expect.not.objectContaining({
        clickCount: expect.anything(),
      }),
    )
  })
})
