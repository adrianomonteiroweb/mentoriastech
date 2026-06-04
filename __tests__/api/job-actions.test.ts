import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const approvedLimit = vi.fn()
  const approvedWhere = vi.fn(() => ({ limit: approvedLimit }))
  const approvedFrom = vi.fn(() => ({ where: approvedWhere }))
  const countWhere = vi.fn()
  const countFrom = vi.fn(() => ({ where: countWhere }))
  const select = vi.fn()

  const returning = vi.fn()
  const onConflictDoNothing = vi.fn(() => ({ returning }))
  const values = vi.fn(() => ({ onConflictDoNothing }))
  const insert = vi.fn(() => ({ values }))
  const deleteWhere = vi.fn()
  const deleteAction = vi.fn(() => ({ where: deleteWhere }))

  return {
    approvedFrom,
    approvedLimit,
    countFrom,
    countWhere,
    deleteAction,
    deleteWhere,
    insert,
    onConflictDoNothing,
    requireAuth: vi.fn(),
    returning,
    select,
    values,
  }
})

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  count: vi.fn(() => "count"),
  eq: vi.fn((...values: unknown[]) => ({ operator: "eq", values })),
  or: vi.fn((...conditions: unknown[]) => conditions),
}))

vi.mock("@/lib/db", () => ({
  db: {
    delete: mocks.deleteAction,
    insert: mocks.insert,
    select: mocks.select,
  },
  jobActions: {
    actionType: "job_actions.action_type",
    jobId: "job_actions.job_id",
    userId: "job_actions.user_id",
    visitorHash: "job_actions.visitor_hash",
  },
  jobs: {
    id: "jobs.id",
    status: "jobs.status",
  },
}))

vi.mock("@/lib/utils/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
  requireAuth: mocks.requireAuth,
}))

import { DELETE, POST } from "@/app/api/jobs/[id]/actions/route"

function makeRequest(actionType: string) {
  return new Request("http://localhost/api/jobs/job-1/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type: actionType }),
  })
}

const params = { params: Promise.resolve({ id: "job-1" }) }

describe("POST /api/jobs/[id]/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.select.mockReset()
    mocks.select
      .mockReturnValueOnce({ from: mocks.approvedFrom })
      .mockReturnValueOnce({ from: mocks.countFrom })
    mocks.approvedLimit.mockResolvedValue([{ id: "job-1" }])
    mocks.returning.mockResolvedValue([{ id: "like-1" }])
    mocks.countWhere.mockResolvedValue([{ value: 1 }])
  })

  it("allows a public visitor to like a job without authentication", async () => {
    mocks.requireAuth.mockRejectedValue(new Error("Nao autenticado"))

    const response = await POST(makeRequest("liked"), params)

    expect(response.status).toBe(201)
    expect(mocks.requireAuth).not.toHaveBeenCalled()
    expect(mocks.values).toHaveBeenCalledWith({
      actionType: "liked",
      jobId: "job-1",
      userId: null,
      visitorHash: expect.any(String),
    })
    expect(response.headers.get("set-cookie")).toContain("job_like_visitor_id=")
    await expect(response.json()).resolves.toEqual({
      data: { id: "like-1" },
      deactivated: false,
      like_count: 1,
    })
  })

  it("keeps non-like job actions authenticated", async () => {
    mocks.requireAuth.mockResolvedValue({ id: "user-1" })

    const response = await POST(makeRequest("applied"), params)

    expect(response.status).toBe(201)
    expect(mocks.requireAuth).toHaveBeenCalledTimes(1)
    expect(mocks.values).toHaveBeenCalledWith({
      actionType: "applied",
      jobId: "job-1",
      userId: "user-1",
    })
  })

  it("allows a public visitor to remove a job like without authentication", async () => {
    mocks.select.mockReset()
    mocks.select.mockReturnValueOnce({ from: mocks.countFrom })
    mocks.countWhere.mockResolvedValue([{ value: 0 }])
    mocks.requireAuth.mockRejectedValue(new Error("Nao autenticado"))

    const response = await DELETE(
      new Request(
        "http://localhost/api/jobs/job-1/actions?action_type=liked",
        { method: "DELETE" },
      ),
      params,
    )

    expect(response.status).toBe(200)
    expect(mocks.requireAuth).not.toHaveBeenCalled()
    expect(mocks.deleteAction).toHaveBeenCalledTimes(1)
    expect(response.headers.get("set-cookie")).toContain("job_like_visitor_id=")
    await expect(response.json()).resolves.toEqual({
      success: true,
      like_count: 0,
    })
  })
})
