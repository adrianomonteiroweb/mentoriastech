import { describe, it, expect } from "vitest"
import {
  bookingReducer,
  initialBookingState,
  getStepLabels,
  getTotalSteps,
  STEP_LABELS,
} from "@/lib/types/booking"

describe("bookingReducer", () => {
  it("should return initial state", () => {
    expect(initialBookingState.step).toBe(0)
    expect(initialBookingState.mentoringType).toBe("free")
    expect(initialBookingState.status).toBe("idle")
  })

  it("SET_STEP should update step and direction", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_STEP",
      step: 2,
      direction: "forward",
    })
    expect(state.step).toBe(2)
    expect(state.direction).toBe("forward")
  })

  it("SET_STEP backward should set direction backward", () => {
    const midState = { ...initialBookingState, step: 3 }
    const state = bookingReducer(midState, {
      type: "SET_STEP",
      step: 1,
      direction: "backward",
    })
    expect(state.step).toBe(1)
    expect(state.direction).toBe("backward")
  })

  it("SET_MENTORING_TYPE should reset dependent fields", () => {
    const stateWithData = {
      ...initialBookingState,
      mentoringType: "free" as const,
      topicId: "topic-1",
      topicName: "Test Topic",
      slotId: "slot-1",
      sessionDate: "2026-04-10",
      startTime: "14:00",
      dayName: "Quinta",
      customDate: "2026-04-15",
      customTime: "10:00",
    }

    const state = bookingReducer(stateWithData, {
      type: "SET_MENTORING_TYPE",
      mentoringType: "paid",
    })

    expect(state.mentoringType).toBe("paid")
    expect(state.topicId).toBe("")
    expect(state.topicName).toBe("")
    expect(state.slotId).toBe("")
    expect(state.sessionDate).toBe("")
    expect(state.startTime).toBe("")
    expect(state.dayName).toBe("")
    expect(state.customDate).toBe("")
    expect(state.customTime).toBe("")
  })

  it("SET_TOPIC should update topic fields", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_TOPIC",
      topicId: "abc-123",
      topicName: "Carreira em programação",
    })
    expect(state.topicId).toBe("abc-123")
    expect(state.topicName).toBe("Carreira em programação")
  })

  it("SET_FREE_SLOT should update all slot fields", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_FREE_SLOT",
      slotId: "slot-1",
      sessionDate: "2026-04-11",
      startTime: "20:00",
      dayName: "Sexta-feira",
    })
    expect(state.slotId).toBe("slot-1")
    expect(state.sessionDate).toBe("2026-04-11")
    expect(state.startTime).toBe("20:00")
    expect(state.dayName).toBe("Sexta-feira")
  })

  it("SET_CUSTOM_DATE should update customDate", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_CUSTOM_DATE",
      customDate: "2026-05-01",
    })
    expect(state.customDate).toBe("2026-05-01")
  })

  it("SET_CUSTOM_TIME should update customTime", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_CUSTOM_TIME",
      customTime: "15:30",
    })
    expect(state.customTime).toBe("15:30")
  })

  it("SET_CONTACT should update all contact fields", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_CONTACT",
      name: "Maria",
      email: "maria@test.com",
      whatsapp: "5585999990000",
    })
    expect(state.name).toBe("Maria")
    expect(state.email).toBe("maria@test.com")
    expect(state.whatsapp).toBe("5585999990000")
  })

  it("SET_NOTES should update notes", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_NOTES",
      notes: "Quero falar sobre React",
    })
    expect(state.notes).toBe("Quero falar sobre React")
  })

  it("SET_AUTH should update auth and contact fields", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_AUTH",
      isAuthenticated: true,
      menteeId: "user-123",
      name: "Adriano",
      email: "adriano@test.com",
      whatsapp: "5585999990001",
    })
    expect(state.isAuthenticated).toBe(true)
    expect(state.menteeId).toBe("user-123")
    expect(state.name).toBe("Adriano")
    expect(state.email).toBe("adriano@test.com")
    expect(state.whatsapp).toBe("5585999990001")
  })

  it("SET_STATUS should update status and errorMsg", () => {
    const state = bookingReducer(initialBookingState, {
      type: "SET_STATUS",
      status: "error",
      errorMsg: "Algo deu errado",
    })
    expect(state.status).toBe("error")
    expect(state.errorMsg).toBe("Algo deu errado")
  })

  it("SET_STATUS without errorMsg should clear it", () => {
    const errorState = { ...initialBookingState, errorMsg: "old error" }
    const state = bookingReducer(errorState, {
      type: "SET_STATUS",
      status: "loading",
    })
    expect(state.status).toBe("loading")
    expect(state.errorMsg).toBe("")
  })

  it("RESET should return to initial state", () => {
    const modifiedState = {
      ...initialBookingState,
      step: 3,
      mentoringType: "paid" as const,
      topicId: "abc",
      name: "Test",
      status: "error" as const,
    }
    const state = bookingReducer(modifiedState, { type: "RESET" })
    expect(state).toEqual(initialBookingState)
  })
})

describe("step config helpers", () => {
  it("all mentoring types should have 5 steps", () => {
    expect(getTotalSteps("free")).toBe(5)
    expect(getTotalSteps("paid")).toBe(5)
    expect(getTotalSteps("private")).toBe(5)
  })

  it("all mentoring types should return same step labels", () => {
    expect(getStepLabels("free")).toEqual(STEP_LABELS)
    expect(getStepLabels("paid")).toEqual(STEP_LABELS)
    expect(getStepLabels("private")).toEqual(STEP_LABELS)
  })

  it("STEP_LABELS should end with Confirmação", () => {
    expect(STEP_LABELS[STEP_LABELS.length - 1]).toBe("Confirmação")
  })
})
