// Estado unificado do stepper de booking
export interface UnifiedBookingState {
  step: number
  direction: "forward" | "backward"
  mentoringType: "free" | "paid" | "private"
  topicId: string
  topicName: string
  slotId: string
  sessionDate: string
  startTime: string
  dayName: string
  customDate: string
  customTime: string
  // Contact
  name: string
  email: string
  whatsapp: string
  notes: string
  isReturningMentee: boolean
  originCategory: OriginCategoryValue
  originDescription: string
  // Auth
  isAuthenticated: boolean
  menteeId: string | null
  // UI
  status: "idle" | "loading" | "success" | "error"
  errorMsg: string
}

export type BookingAction =
  | { type: "SET_STEP"; step: number; direction: "forward" | "backward" }
  | { type: "SET_MENTORING_TYPE"; mentoringType: UnifiedBookingState["mentoringType"] }
  | { type: "SET_TOPIC"; topicId: string; topicName: string }
  | { type: "SET_FREE_SLOT"; slotId: string; sessionDate: string; startTime: string; dayName: string }
  | { type: "SET_CUSTOM_DATE"; customDate: string }
  | { type: "SET_CUSTOM_TIME"; customTime: string }
  | { type: "SET_CONTACT"; name: string; email: string; whatsapp: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_RETURNING_MENTEE"; isReturningMentee: boolean }
  | { type: "SET_ORIGIN"; originCategory: OriginCategoryValue; originDescription: string }
  | { type: "SET_AUTH"; isAuthenticated: boolean; menteeId: string | null; name: string; email: string; whatsapp: string }
  | { type: "SET_STATUS"; status: UnifiedBookingState["status"]; errorMsg?: string }
  | { type: "RESET" }

export const ORIGIN_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "palestra", label: "Palestra" },
  { value: "indicacao", label: "Indicacao" },
  { value: "instagram", label: "Instagram" },
  { value: "evento", label: "Evento" },
] as const

export type OriginCategoryValue = "" | (typeof ORIGIN_OPTIONS)[number]["value"]

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
  isReturningMentee: false,
  originCategory: "",
  originDescription: "",
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
    case "SET_RETURNING_MENTEE":
      return {
        ...state,
        isReturningMentee: action.isReturningMentee,
        originCategory: action.isReturningMentee ? "" : state.originCategory,
        originDescription: action.isReturningMentee ? "" : state.originDescription,
      }
    case "SET_ORIGIN":
      return {
        ...state,
        originCategory: action.originCategory,
        originDescription: action.originDescription,
      }
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

export function getStepLabels(_mentoringType?: UnifiedBookingState["mentoringType"]): readonly string[] {
  return STEP_LABELS
}

export function getTotalSteps(_mentoringType?: UnifiedBookingState["mentoringType"]): number {
  return STEP_LABELS.length
}
