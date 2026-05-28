"use client"

import { useEffect, useReducer, useCallback, useState } from "react"
import {
  bookingReducer,
  initialBookingState,
  getStepLabels,
  getTotalSteps,
  type ScheduleSlot,
  type TopicItem,
} from "@/lib/types/booking"
import { BookingStepper } from "./booking-stepper"
import { BookingSuccess } from "./booking-success"
import { TopicStep } from "./steps/topic-step"
import { DateTimeStep } from "./steps/datetime-step"
import { ContactStep } from "./steps/contact-step"
import { ReviewStep } from "./steps/review-step"

// Fallback topics keep the form readable when topic loading fails.
// Time slots must come from /api/schedule so occupied dates are never offered.
const FALLBACK_TOPICS: TopicItem[] = [
  { id: "f1", name: "Programação para outras profissões", category: "free", description: null },
  { id: "f2", name: "Carreira em programação", category: "free", description: null },
  { id: "f3", name: "Preparação para entrevistas", category: "free", description: null },
  { id: "f4", name: "Busca de oportunidades", category: "free", description: null },
  { id: "f5", name: "Desenvolvimento Web", category: "free", description: null },
  { id: "f6", name: "Automações RPA", category: "free", description: null },
]

export function UnifiedBookingForm() {
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState)

  // API data
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [scheduleLoadError, setScheduleLoadError] = useState(false)

  // Load schedule + topics + auth
  useEffect(() => {
    const loadJson = async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Falha ao carregar ${url}`)
      return response.json()
    }

    Promise.allSettled([
      loadJson("/api/schedule"),
      loadJson("/api/topics"),
    ])
      .then(([scheduleResult, topicsResult]) => {
        const scheduleData = scheduleResult.status === "fulfilled" ? scheduleResult.value : null
        const topicsData = topicsResult.status === "fulfilled" ? topicsResult.value : null

        if (Array.isArray(scheduleData?.schedule)) {
          setSlots(scheduleData.schedule)
          setScheduleLoadError(false)
        } else {
          setSlots([])
          setScheduleLoadError(true)
        }

        if (Array.isArray(topicsData?.topics)) {
          setTopics(topicsData.topics)
        } else {
          setTopics(FALLBACK_TOPICS)
        }
      })
      .finally(() => setDataLoading(false))

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) {
          dispatch({
            type: "SET_AUTH",
            isAuthenticated: true,
            menteeId: user.id,
            name: user.full_name || "",
            email: user.email || "",
            whatsapp: user.whatsapp || "",
          })
        }
      })
      .catch(() => {})
  }, [])

  // Only free topics
  const filteredTopics = topics.filter((t) => t.category === "free")

  const stepLabels = getStepLabels()
  const totalSteps = getTotalSteps()

  const goToStep = useCallback(
    (step: number) => {
      const direction = step > state.step ? "forward" : "backward"
      dispatch({ type: "SET_STEP", step, direction })
    },
    [state.step],
  )

  const goNext = useCallback(() => {
    if (state.step < totalSteps - 1) {
      goToStep(state.step + 1)
    }
  }, [state.step, totalSteps, goToStep])

  const goBack = useCallback(() => {
    if (state.step > 0) {
      goToStep(state.step - 1)
    }
  }, [state.step, goToStep])

  async function handleSubmit() {
    dispatch({ type: "SET_STATUS", status: "loading" })

    try {
      const body: Record<string, string> = {
        name: state.name,
        email: state.email,
        whatsapp: state.whatsapp,
        day: state.dayName,
        time: state.startTime,
        topic: state.topicName,
      }

      if (state.sessionDate) {
        body.sessionDate = state.sessionDate
      }

      if (state.slotId) {
        body.slotId = state.slotId
      }

      if (state.topicId) {
        body.topicId = state.topicId
      }

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar")
      }

      dispatch({ type: "SET_STATUS", status: "success" })
    } catch (err) {
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Erro ao enviar solicitação",
      })
    }
  }

  if (state.status === "success") {
    return <BookingSuccess onReset={() => dispatch({ type: "RESET" })} />
  }

  function renderStep() {
    switch (state.step) {
      case 0:
        return (
          <TopicStep
            topics={filteredTopics}
            selectedTopicId={state.topicId}
            loading={dataLoading}
            onSelect={(id, name) => dispatch({ type: "SET_TOPIC", topicId: id, topicName: name })}
            onNext={goNext}
            onBack={() => {}}
          />
        )
      case 1:
        return (
          <DateTimeStep
            slots={slots}
            slotsLoading={dataLoading}
            slotsError={scheduleLoadError}
            selectedSlotId={state.slotId}
            onSelectSlot={(id, date, time, day) =>
              dispatch({ type: "SET_FREE_SLOT", slotId: id, sessionDate: date, startTime: time, dayName: day })
            }
            onNext={goNext}
            onBack={goBack}
          />
        )
      case 2:
        return (
          <ContactStep
            name={state.name}
            email={state.email}
            whatsapp={state.whatsapp}
            notes={state.notes}
            isAuthenticated={state.isAuthenticated}
            onChangeName={(v) => dispatch({ type: "SET_CONTACT", name: v, email: state.email, whatsapp: state.whatsapp })}
            onChangeEmail={(v) => dispatch({ type: "SET_CONTACT", name: state.name, email: v, whatsapp: state.whatsapp })}
            onChangeWhatsapp={(v) => dispatch({ type: "SET_CONTACT", name: state.name, email: state.email, whatsapp: v })}
            onChangeNotes={(v) => dispatch({ type: "SET_NOTES", notes: v })}
            onNext={goNext}
            onBack={goBack}
          />
        )
      case 3:
        return (
          <ReviewStep
            state={state}
            onGoToStep={goToStep}
            onSubmit={handleSubmit}
          />
        )
      default:
        return null
    }
  }

  return (
    <BookingStepper
      steps={[...stepLabels]}
      currentStep={state.step}
      direction={state.direction}
    >
      {renderStep()}
    </BookingStepper>
  )
}
