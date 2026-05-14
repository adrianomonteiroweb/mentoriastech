// Estado unificado do stepper de booking
export interface UnifiedBookingState {
  step: number
  direction: "forward" | "backward"
  topicId: string
  topicName: string
  slotId: string
  sessionDate: string
  startTime: string
  dayName: string
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
  | { type: "SET_TOPIC"; topicId: string; topicName: string }
  | { type: "SET_FREE_SLOT"; slotId: string; sessionDate: string; startTime: string; dayName: string }
  | { type: "SET_CONTACT"; name: string; email: string; whatsapp: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_AUTH"; isAuthenticated: boolean; menteeId: string | null; name: string; email: string; whatsapp: string }
  | { type: "SET_STATUS"; status: UnifiedBookingState["status"]; errorMsg?: string }
  | { type: "RESET" }

export const initialBookingState: UnifiedBookingState = {
  step: 0,
  direction: "forward",
  topicId: "",
  topicName: "",
  slotId: "",
  sessionDate: "",
  startTime: "",
  dayName: "",
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
export const STEP_LABELS = [
  "Tema",
  "Data e horário",
  "Seus dados",
  "Confirmação",
] as const

export const TOTAL_STEPS = STEP_LABELS.length

export function getStepLabels(): readonly string[] {
  return STEP_LABELS
}

export function getTotalSteps(): number {
  return STEP_LABELS.length
}
