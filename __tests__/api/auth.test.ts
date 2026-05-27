import { describe, expect, it, vi, beforeEach } from "vitest"

const { mockCreateClient, mockSignInWithPassword, mockSignOut } = vi.hoisted(
  () => ({
    mockCreateClient: vi.fn(),
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
  }),
)

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { POST as login } from "@/app/api/auth/login/route"
import { POST as logout } from "@/app/api/auth/logout/route"

function makeLoginRequest(body: Record<string, string>) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    })
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "maria@test.com" } },
      error: null,
    })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it("logs in through Supabase Auth", async () => {
    const response = await login(
      makeLoginRequest({
        email: " Maria@Test.com ",
        password: "secret123",
      }),
    )

    expect(response.status).toBe(200)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "maria@test.com",
      password: "secret123",
    })
    await expect(response.json()).resolves.toEqual({
      data: { id: "user-1", email: "maria@test.com" },
    })
  })

  it("rejects invalid login credentials without creating a local session", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Invalid login credentials"),
    })

    const response = await login(
      makeLoginRequest({
        email: "maria@test.com",
        password: "wrong",
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: "Email ou senha incorretos.",
    })
  })

  it("validates login payload", async () => {
    const response = await login(
      makeLoginRequest({
        email: "not-an-email",
        password: "",
      }),
    )

    expect(response.status).toBe(400)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it("logs out through Supabase Auth and clears the legacy cookie", async () => {
    const response = await logout()

    expect(response.status).toBe(200)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(response.headers.get("set-cookie")).toContain("session_id=")
    await expect(response.json()).resolves.toEqual({ success: true })
  })
})
