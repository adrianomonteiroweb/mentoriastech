import type { BookingType } from "./database"

// Estado unificado do stepper de booking
export interface UnifiedBookingState {
  step: number
  direction: "forward" | "backward"
  mentoringType: BookingType
  topicId: string
  topicName: string
  // Free path
  slotId: string
  sessionDate: string
  startTime: string
  dayName: string
  // Paid path
  customDate: string
  customTime: string
  // Contact
  name: string
  email: string
  whatsapp: string
  notes: string
  // Auth
  isAuthenticated: boolean
  menteeId: string | null
  // UI
  status: "idle" | "loading" | "success" | "error"
  errorMsg: string
}

export type BookingAction =
  | { type: "SET_STEP"; step: number; direction: "forward" | "backward" }
  | { type: "SET_MENTORING_TYPE"; mentoringType: BookingType }
  | { type: "SET_TOPIC"; topicId: string; topicName: string }
  | { type: "SET_FREE_SLOT"; slotId: string; sessionDate: string; startTime: string; dayName: string }
  | { type: "SET_CUSTOM_DATE"; customDate: string }
  | { type: "SET_CUSTOM_TIME"; customTime: string }
  | { type: "SET_CONTACT"; name: string; email: string; whatsapp: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_AUTH"; isAuthenticated: boolean; menteeId: string | null; name: string; email: string; whatsapp: string }
  | { type: "SET_STATUS"; status: UnifiedBookingState["status"]; errorMsg?: string }
  | { type: "RESET" }

export const initialBookingState: UnifiedBookingState = {
  step: 0,
  direction: "forward",
  mentoringType: "free",
  topicId: "",
  topicName: "",
  slotId: "",
  sessionDate: "",
  startTime: "",
  dayName: "",
  customDate: "",
  customTime: "",
  name: "",
  email: "",
  whatsapp: "",
  notes: "",
  isAuthenticated: false,
  menteeId: null,
  status: "idle",
  errorMsg: "",
}

export function bookingReducer(
  state: UnifiedBookingState,
  action: BookingAction,
): UnifiedBookingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, direction: action.direction }
    case "SET_MENTORING_TYPE":
      return {
        ...state,
        mentoringType: action.mentoringType,
        // Reset dependent fields when type changes
        topicId: "",
        topicName: "",
        slotId: "",
        sessionDate: "",
        startTime: "",
        dayName: "",
        customDate: "",
        customTime: "",
      }
    case "SET_TOPIC":
      return { ...state, topicId: action.topicId, topicName: action.topicName }
    case "SET_FREE_SLOT":
      return {
        ...state,
        slotId: action.slotId,
        sessionDate: action.sessionDate,
        startTime: action.startTime,
        dayName: action.dayName,
      }
    case "SET_CUSTOM_DATE":
      return { ...state, customDate: action.customDate }
    case "SET_CUSTOM_TIME":
      return { ...state, customTime: action.customTime }
    case "SET_CONTACT":
      return { ...state, name: action.name, email: action.email, whatsapp: action.whatsapp }
    case "SET_NOTES":
      return { ...state, notes: action.notes }
    case "SET_AUTH":
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        menteeId: action.menteeId,
        name: action.name,
        email: action.email,
        whatsapp: action.whatsapp,
      }
    case "SET_STATUS":
      return { ...state, status: action.status, errorMsg: action.errorMsg || "" }
    case "RESET":
      return initialBookingState
    default:
      return state
  }
}

// Interfaces para dados da API
export interface ScheduleSlot {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  slotType: string
  date: string
  bookings: { id: string }[]
  isAvailable: boolean
}

export interface TopicItem {
  id: string
  name: string
  category: string
  description: string | null
}

// Steps config
export const FREE_STEP_LABELS = [
  "Tipo",
  "Tema",
  "Data e horário",
  "Seus dados",
  "Confirmação",
] as const

export const PAID_STEP_LABELS = [
  "Tipo",
  "Tema",
  "Data e horário",
  "Seus dados",
  "Revisão",
  "Pagamento",
] as const

// Backward compatibility
export const STEP_LABELS = FREE_STEP_LABELS
export const TOTAL_STEPS = FREE_STEP_LABELS.length

export function getStepLabels(mentoringType: string): readonly string[] {
  return mentoringType === "free" ? FREE_STEP_LABELS : PAID_STEP_LABELS
}

export function getTotalSteps(mentoringType: string): number {
  return mentoringType === "free" ? FREE_STEP_LABELS.length : PAID_STEP_LABELS.length
}
