import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JobShareForm } from "@/components/jobs/job-share-form"

const mockFetch = vi.fn()

describe("JobShareForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { id: "job-1" } }),
    })
    vi.stubGlobal("fetch", mockFetch)
  })

  it("sends the informed active hours when sharing a job", async () => {
    const user = userEvent.setup()
    render(<JobShareForm />)

    await user.type(screen.getByLabelText("Titulo da vaga"), "Desenvolvedor Junior")
    await user.type(screen.getByLabelText("Link da vaga"), "https://example.com/vaga")
    await user.type(
      screen.getByLabelText("Há quantas horas a vaga está ativa?"),
      "6",
    )
    await user.type(
      screen.getByLabelText("Por que achou interessante?"),
      "Uma boa oportunidade para a comunidade.",
    )
    await user.click(screen.getByRole("button", { name: "Enviar indicacao" }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    const request = mockFetch.mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toEqual(
      expect.objectContaining({
        active_hours: 6,
      }),
    )
  })
})
