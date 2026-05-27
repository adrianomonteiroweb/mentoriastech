import { beforeEach, describe, expect, it, vi } from "vitest"
import { File as NodeFile } from "node:buffer"

const { mockPut } = vi.hoisted(() => ({
  mockPut: vi.fn(),
}))

vi.mock("@vercel/blob", () => ({
  put: mockPut,
  del: vi.fn(),
  get: vi.fn(),
}))

import { uploadPrivateResume } from "@/lib/utils/upload"

function pdfFile(name = "Curriculo Maria Silva.pdf") {
  return new NodeFile(
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
    name,
    { type: "application/pdf" },
  )
}

describe("secure uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockImplementation(async (pathname: string) => ({
      url: `https://private.example/${pathname}`,
      pathname,
      downloadUrl: `https://private.example/${pathname}?download=1`,
    }))
  })

  it("stores resumes privately without the original filename", async () => {
    const result = await uploadPrivateResume(
      pdfFile() as unknown as File,
      "user-1",
    )

    expect(mockPut).toHaveBeenCalledWith(
      expect.stringMatching(/^private\/resumes\/user-1\/.+\.pdf$/),
      expect.any(NodeFile),
      expect.objectContaining({
        access: "private",
        contentType: "application/pdf",
      }),
    )
    expect(result.pathname).not.toContain("Maria")
    expect(result.pathname).not.toContain("Curriculo")
  })

  it("rejects PDFs when the file signature does not match", async () => {
    const fakePdf = new NodeFile(["not a pdf"], "curriculo.pdf", {
      type: "application/pdf",
    })

    await expect(
      uploadPrivateResume(fakePdf as unknown as File, "user-1"),
    ).rejects.toMatchObject({
      status: 415,
    })
    expect(mockPut).not.toHaveBeenCalled()
  })
})
