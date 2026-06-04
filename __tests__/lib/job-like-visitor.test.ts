import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { resolveJobLikeVisitor } from "@/lib/job-like-visitor"

describe("job like visitor", () => {
  it("reuses a valid anonymous visitor cookie", () => {
    const id = "3c8459e6-4ae2-4f7a-9257-b78489f01b17"
    const visitor = resolveJobLikeVisitor(id)

    expect(visitor).toEqual({
      id,
      hash: createHash("sha256").update(id).digest("hex"),
      isNew: false,
    })
  })

  it("replaces an invalid visitor cookie", () => {
    const visitor = resolveJobLikeVisitor("invalid")

    expect(visitor.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(visitor.hash).toHaveLength(64)
    expect(visitor.isNew).toBe(true)
  })
})
