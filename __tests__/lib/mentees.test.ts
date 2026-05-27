import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const selectLimit = vi.fn()
  const updateReturning = vi.fn()
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  const updateSet = vi.fn(() => ({ where: updateWhere }))
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: selectLimit })),
      })),
    })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(),
  }

  return {
    db,
    selectLimit,
    updateReturning,
    updateWhere,
    updateSet,
  }
})

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq"),
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
  profiles: {
    id: "profiles.id",
    email: "profiles.email",
  },
}))

import { ensureMenteeProfile } from "@/lib/db/mentees"

const existingProfile = {
  id: "profile-1",
  email: "mentorado@stage.local",
  fullName: "Mentorado Original",
  whatsapp: "5585999990000",
}

describe("ensureMenteeProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not update an existing profile by default", async () => {
    mocks.selectLimit.mockResolvedValue([existingProfile])

    const result = await ensureMenteeProfile({
      email: "Mentorado@Stage.Local",
      fullName: "Nome do formulario publico",
      whatsapp: "5585000000000",
    })

    expect(result).toBe(existingProfile)
    expect(mocks.db.update).not.toHaveBeenCalled()
  })

  it("allows trusted admin flows to update an existing profile", async () => {
    const updatedProfile = {
      ...existingProfile,
      fullName: "Nome atualizado pelo admin",
      whatsapp: "5585111111111",
    }
    mocks.selectLimit.mockResolvedValue([existingProfile])
    mocks.updateReturning.mockResolvedValue([updatedProfile])

    const result = await ensureMenteeProfile({
      email: "mentorado@stage.local",
      fullName: "Nome atualizado pelo admin",
      whatsapp: "5585111111111",
      updateExisting: true,
    })

    expect(result).toBe(updatedProfile)
    expect(mocks.updateSet).toHaveBeenCalledWith({
      fullName: "Nome atualizado pelo admin",
      whatsapp: "5585111111111",
      updatedAt: expect.any(Date),
    })
  })
})
