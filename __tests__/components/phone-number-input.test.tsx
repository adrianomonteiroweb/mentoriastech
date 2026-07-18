import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"

function ControlledPhoneInput() {
  const [value, setValue] = useState("")
  return (
    <div>
      <label htmlFor="phone">WhatsApp</label>
      <PhoneNumberInput id="phone" value={value} onChange={setValue} />
      <output>{value}</output>
    </div>
  )
}

describe("PhoneNumberInput", () => {
  it("troca o país ao receber um número internacional completo", () => {
    render(<ControlledPhoneInput />)

    fireEvent.change(screen.getByLabelText("WhatsApp"), {
      target: { value: "+2389841098" },
    })

    expect(screen.getByText("+2389841098")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "País" })).toHaveValue("CV")
  })
})
