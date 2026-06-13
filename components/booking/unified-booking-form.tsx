"use client";

import { useEffect, useReducer, useCallback, useState, useMemo } from "react";
import {
  bookingReducer,
  initialBookingState,
  getStepLabels,
  getTotalSteps,
  type ScheduleSlot,
  type TopicItem,
} from "@/lib/types/booking";
import { BookingStepper } from "./booking-stepper";
import { BookingSuccess } from "./booking-success";
import { TopicStep } from "./steps/topic-step";
import { DateTimeStep } from "./steps/datetime-step";
import { ContactStep } from "./steps/contact-step";
import { ReviewStep } from "./steps/review-step";
import { PaidPaymentStep } from "./steps/paid-payment-step";
import type { PublicPaidMentorship } from "@/lib/types/database";

// Fallback topics keep the form readable when topic loading fails.
// Time slots must come from /api/schedule so occupied dates are never offered.
const FALLBACK_TOPICS: TopicItem[] = [
  {
    id: "f1",
    name: "Programação para outras profissões",
    category: "free",
    description: null,
  },
  {
    id: "f2",
    name: "Carreira em programação",
    category: "free",
    description: null,
  },
  {
    id: "f3",
    name: "Preparação para entrevistas",
    category: "free",
    description: null,
  },
  {
    id: "f4",
    name: "Busca de oportunidades",
    category: "free",
    description: null,
  },
  {
    id: "f5",
    name: "Desenvolvimento Web",
    category: "free",
    description: null,
  },
  { id: "f6", name: "Automações RPA", category: "free", description: null },
];

interface UnifiedBookingFormProps {
  defaultType?: string;
}

export function UnifiedBookingForm(_props: UnifiedBookingFormProps = {}) {
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);

  // API data
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [paidMentorships, setPaidMentorships] = useState<
    PublicPaidMentorship[]
  >([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [scheduleLoadError, setScheduleLoadError] = useState(false);

  // Load schedule + topics + paid mentorships + auth
  useEffect(() => {
    const loadJson = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
      return response.json();
    };

    Promise.allSettled([
      loadJson("/api/schedule"),
      loadJson("/api/topics"),
      loadJson("/api/paid-mentorships"),
    ])
      .then(([scheduleResult, topicsResult, paidResult]) => {
        const scheduleData =
          scheduleResult.status === "fulfilled" ? scheduleResult.value : null;
        const topicsData =
          topicsResult.status === "fulfilled" ? topicsResult.value : null;
        const paidData =
          paidResult.status === "fulfilled" ? paidResult.value : null;

        if (Array.isArray(scheduleData?.schedule)) {
          setSlots(scheduleData.schedule);
          setScheduleLoadError(false);
        } else {
          setSlots([]);
          setScheduleLoadError(true);
        }

        if (Array.isArray(topicsData?.topics)) {
          setTopics(topicsData.topics);
        } else {
          setTopics(FALLBACK_TOPICS);
        }

        if (Array.isArray(paidData?.data)) {
          setPaidMentorships(paidData.data);
        }
      })
      .finally(() => setDataLoading(false));

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
          });
        }
      })
      .catch(() => {});
  }, []);

  // Merge free topics + paid mentorships into a single unified list
  const allTopics: TopicItem[] = useMemo(() => {
    const freeItems = topics.filter((t) => t.category === "free");
    const paidItems: TopicItem[] = paidMentorships.map((pm) => ({
      id: `paid-${pm.id}`,
      name: pm.title,
      category: "paid" as const,
      description: pm.description,
      amountCents: pm.amount_cents,
      currency: pm.currency,
      paidMentorshipId: pm.id,
      imageUrl: pm.image_url,
    }));
    return [...paidItems, ...freeItems];
  }, [topics, paidMentorships]);

  // Count available free slots for scarcity cue
  const availableFreeSlots = useMemo(
    () => slots.filter((s) => s.isAvailable && s.slotType === "free").length,
    [slots],
  );

  const stepLabels = getStepLabels(state.mentoringType);
  const totalSteps = getTotalSteps(state.mentoringType);

  const goToStep = useCallback(
    (step: number) => {
      const direction = step > state.step ? "forward" : "backward";
      dispatch({ type: "SET_STEP", step, direction });
    },
    [state.step],
  );

  const goNext = useCallback(() => {
    if (state.step < totalSteps - 1) {
      goToStep(state.step + 1);
    }
  }, [state.step, totalSteps, goToStep]);

  const goBack = useCallback(() => {
    if (state.step > 0) {
      goToStep(state.step - 1);
    }
  }, [state.step, goToStep]);

  async function handleSubmit() {
    dispatch({ type: "SET_STATUS", status: "loading" });

    try {
      const body: Record<string, string | boolean> = {
        name: state.name,
        email: state.email,
        whatsapp: state.whatsapp,
        day: state.dayName,
        time: state.startTime,
        topic: state.topicName,
        isReturningMentee: state.isReturningMentee,
      };

      if (state.sessionDate) {
        body.sessionDate = state.sessionDate;
      }

      if (state.slotId) {
        body.slotId = state.slotId;
      }

      if (state.topicId) {
        body.topicId = state.topicId;
      }

      if (!state.isReturningMentee && state.originCategory) {
        body.originCategory = state.originCategory;
      }

      if (!state.isReturningMentee && state.originDescription.trim()) {
        body.originDescription = state.originDescription.trim();
      }

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao enviar");
      }

      dispatch({ type: "SET_STATUS", status: "success" });
    } catch (err) {
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMsg:
          err instanceof Error ? err.message : "Erro ao enviar solicitação",
      });
    }
  }

  if (state.status === "success") {
    return (
      <BookingSuccess
        email={state.email}
        onReset={() => dispatch({ type: "RESET" })}
      />
    );
  }

  // Find the selected paid mentorship (if paid flow)
  const selectedPaidMentorship =
    state.mentoringType === "paid"
      ? paidMentorships.find((pm) => state.topicId === `paid-${pm.id}`)
      : null;

  function renderStep() {
    if (state.mentoringType === "paid") {
      // Paid flow: Tema → Horário → Seus dados → Pagamento
      switch (state.step) {
        case 0:
          return (
            <TopicStep
              topics={allTopics}
              selectedTopicId={state.topicId}
              loading={dataLoading}
              availableFreeSlots={availableFreeSlots}
              onSelect={(id, name, category) => {
                dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
                if (category === "paid" && state.mentoringType !== "paid") {
                  dispatch({
                    type: "SET_MENTORING_TYPE",
                    mentoringType: "paid",
                  });
                  // Re-set topic since SET_MENTORING_TYPE clears it
                  dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
                } else if (
                  category === "free" &&
                  state.mentoringType !== "free"
                ) {
                  dispatch({
                    type: "SET_MENTORING_TYPE",
                    mentoringType: "free",
                  });
                  dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
                }
              }}
              onNext={goNext}
              onBack={() => {}}
            />
          );
        case 1:
          return (
            <DateTimeStep
              slots={slots.filter(
                (s) => s.isAvailable && s.slotType === "paid",
              )}
              slotsLoading={dataLoading}
              slotsError={scheduleLoadError}
              selectedSlotId={state.slotId}
              onSelectSlot={(id, date, time, day) =>
                dispatch({
                  type: "SET_FREE_SLOT",
                  slotId: id,
                  sessionDate: date,
                  startTime: time,
                  dayName: day,
                })
              }
              onNext={goNext}
              onBack={goBack}
            />
          );
        case 2:
          return (
            <ContactStep
              name={state.name}
              email={state.email}
              whatsapp={state.whatsapp}
              notes={state.notes}
              isReturningMentee={state.isReturningMentee}
              originCategory={state.originCategory}
              originDescription={state.originDescription}
              isAuthenticated={state.isAuthenticated}
              onChangeName={(v) =>
                dispatch({
                  type: "SET_CONTACT",
                  name: v,
                  email: state.email,
                  whatsapp: state.whatsapp,
                })
              }
              onChangeEmail={(v) =>
                dispatch({
                  type: "SET_CONTACT",
                  name: state.name,
                  email: v,
                  whatsapp: state.whatsapp,
                })
              }
              onChangeWhatsapp={(v) =>
                dispatch({
                  type: "SET_CONTACT",
                  name: state.name,
                  email: state.email,
                  whatsapp: v,
                })
              }
              onChangeNotes={(v) => dispatch({ type: "SET_NOTES", notes: v })}
              onChangeReturningMentee={(v) =>
                dispatch({ type: "SET_RETURNING_MENTEE", isReturningMentee: v })
              }
              onChangeOrigin={(originCategory, originDescription) =>
                dispatch({
                  type: "SET_ORIGIN",
                  originCategory,
                  originDescription,
                })
              }
              onNext={goNext}
              onBack={goBack}
            />
          );
        case 3:
          return (
            <PaidPaymentStep
              state={state}
              paidMentorship={selectedPaidMentorship!}
              onBack={goBack}
            />
          );
        default:
          return null;
      }
    }

    // Free flow: Tema → Data e horário → Seus dados → Confirmação
    switch (state.step) {
      case 0:
        return (
          <TopicStep
            topics={allTopics}
            selectedTopicId={state.topicId}
            loading={dataLoading}
            availableFreeSlots={availableFreeSlots}
            onSelect={(id, name, category) => {
              dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
              if (category === "paid" && state.mentoringType !== "paid") {
                dispatch({ type: "SET_MENTORING_TYPE", mentoringType: "paid" });
                dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
              } else if (
                category === "free" &&
                state.mentoringType !== "free"
              ) {
                dispatch({ type: "SET_MENTORING_TYPE", mentoringType: "free" });
                dispatch({ type: "SET_TOPIC", topicId: id, topicName: name });
              }
            }}
            onNext={goNext}
            onBack={() => {}}
          />
        );
      case 1:
        return (
          <DateTimeStep
            slots={slots.filter((s) => s.isAvailable && s.slotType === "free")}
            slotsLoading={dataLoading}
            slotsError={scheduleLoadError}
            selectedSlotId={state.slotId}
            onSelectSlot={(id, date, time, day) =>
              dispatch({
                type: "SET_FREE_SLOT",
                slotId: id,
                sessionDate: date,
                startTime: time,
                dayName: day,
              })
            }
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 2:
        return (
          <ContactStep
            name={state.name}
            email={state.email}
            whatsapp={state.whatsapp}
            notes={state.notes}
            isReturningMentee={state.isReturningMentee}
            originCategory={state.originCategory}
            originDescription={state.originDescription}
            isAuthenticated={state.isAuthenticated}
            onChangeName={(v) =>
              dispatch({
                type: "SET_CONTACT",
                name: v,
                email: state.email,
                whatsapp: state.whatsapp,
              })
            }
            onChangeEmail={(v) =>
              dispatch({
                type: "SET_CONTACT",
                name: state.name,
                email: v,
                whatsapp: state.whatsapp,
              })
            }
            onChangeWhatsapp={(v) =>
              dispatch({
                type: "SET_CONTACT",
                name: state.name,
                email: state.email,
                whatsapp: v,
              })
            }
            onChangeNotes={(v) => dispatch({ type: "SET_NOTES", notes: v })}
            onChangeReturningMentee={(v) =>
              dispatch({ type: "SET_RETURNING_MENTEE", isReturningMentee: v })
            }
            onChangeOrigin={(originCategory, originDescription) =>
              dispatch({
                type: "SET_ORIGIN",
                originCategory,
                originDescription,
              })
            }
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <ReviewStep
            state={state}
            onGoToStep={goToStep}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
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
  );
}
