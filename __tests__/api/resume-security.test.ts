import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockDbLimit,
  mockDbUpdateWhere,
  mockList,
  mockFetch,
  mockLogAuditEvent,
  mockRequireRole,
} = vi.hoisted(() => ({
  mockDbLimit: vi.fn(),
  mockDbUpdateWhere: vi.fn(),
  mockList: vi.fn(),
  mockFetch: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockRequireRole: vi.fn(),
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({ type: "eq" })),
}))

vi.mock("@/lib/db", () => ({
  profiles: { id: "profiles.id" },
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockDbLimit,
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockDbUpdateWhere,
      })),
    })),
  },
}))

vi.mock("@/lib/utils/auth", () => ({
  requireRole: mockRequireRole,
}))

vi.mock("@/lib/audit", () => ({
  logAuditEvent: mockLogAuditEvent,
}))

// Currículos são armazenados como blob público (ver lib/utils/upload.ts), então
// getPrivateFile usa list() + fetch() da URL pública, e não get({ access: "private" }).
vi.mock("@vercel/blob", () => ({
  list: mockList,
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

import { GET } from "@/app/api/admin/mentees/[id]/resume/route"

const RESUME_PATHNAME = "private/resumes/mentee-1/resume.pdf"
const RESUME_PUBLIC_URL =
  "https://store.public.blob.vercel-storage.com/private/resumes/mentee-1/resume.pdf"

function makeParams(id = "mentee-1") {
  return { params: Promise.resolve({ id }) }
}

function pdfStream() {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
      controller.close()
    },
  })
}

describe("protected resume access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESUME_DOWNLOAD_SIGNING_SECRET = "test-secret"
    mockRequireRole.mockResolvedValue({ id: "hr-1", role: "hr" })
    mockDbLimit.mockResolvedValue([
      {
        id: "mentee-1",
        role: "mentee",
        resumeUrl: RESUME_PATHNAME,
      },
    ])
    mockDbUpdateWhere.mockResolvedValue(undefined)
    mockList.mockResolvedValue({
      blobs: [
        {
          url: RESUME_PUBLIC_URL,
          downloadUrl: RESUME_PUBLIC_URL,
          pathname: RESUME_PATHNAME,
          size: 4,
        },
      ],
    })
    mockFetch.mockResolvedValue({ ok: true, body: pdfStream() })
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("blocks unauthenticated users before exposing a resume", async () => {
    mockRequireRole.mockRejectedValueOnce(
      Object.assign(new Error("Nao autenticado"), { status: 401 }),
    )

    const response = await GET(
      new Request("http://localhost/api/admin/mentees/mentee-1/resume"),
      makeParams(),
    )

    expect(response.status).toBe(401)
    expect(mockDbLimit).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("generates a short-lived signed download URL for authorized HR/admin users", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/mentees/mentee-1/resume"),
      makeParams(),
    )

    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("download=1")
    expect(location).toContain("signature=")
    expect(location).not.toContain("https%3A%2F%2F")
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "resume_signed_url_created",
        actorId: "hr-1",
        targetUserId: "mentee-1",
      }),
    )
  })

  it("streams the resume only through a valid signed URL", async () => {
    const redirect = await GET(
      new Request("http://localhost/api/admin/mentees/mentee-1/resume"),
      makeParams(),
    )
    const location = redirect.headers.get("location")
    expect(location).toBeTruthy()

    const response = await GET(new Request(location!), makeParams())

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Disposition")).toContain("curriculo.pdf")
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: RESUME_PATHNAME, limit: 1 }),
    )
    expect(mockFetch).toHaveBeenCalledWith(RESUME_PUBLIC_URL)
    // O download assinado não deve re-checar o papel (a assinatura já autoriza).
    expect(mockRequireRole).toHaveBeenCalledTimes(1)
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "resume_downloaded",
        actorId: "hr-1",
        targetUserId: "mentee-1",
      }),
    )
  })

  it("does not redirect to legacy public resume URLs", async () => {
    mockDbLimit.mockResolvedValueOnce([
      {
        id: "mentee-1",
        role: "mentee",
        resumeUrl: "https://store.public.blob.vercel-storage.com/cv.pdf",
      },
    ])

    const response = await GET(
      new Request("http://localhost/api/admin/mentees/mentee-1/resume"),
      makeParams(),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: "Curriculo nao encontrado",
    })
    expect(mockList).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
