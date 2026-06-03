"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import type {
  ApiOpportunity,
  OpportunityFilters,
  OpportunityStatus,
  TodayAction,
  ViewTab,
  WeeklyStats,
} from "./types"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface OpportunitiesState {
  opportunities: ApiOpportunity[]
  todayActions: TodayAction[]
  stats: WeeklyStats | null
  activeTab: ViewTab
  selectedId: string | null
  isDetailOpen: boolean
  isCreateOpen: boolean
  filters: OpportunityFilters
  isLoading: boolean
  error: string | null
}

const DEFAULT_FILTERS: OpportunityFilters = {
  stage: "all",
  priority: "all",
  workModel: "all",
  level: "all",
  company: "",
  hasInterview: null,
  awaitingFollowUp: null,
}

const initialState: OpportunitiesState = {
  opportunities: [],
  todayActions: [],
  stats: null,
  activeTab: "hoje",
  selectedId: null,
  isDetailOpen: false,
  isCreateOpen: false,
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type Action =
  | { type: "SET_TAB"; tab: ViewTab }
  | { type: "SET_DATA"; opportunities: ApiOpportunity[]; todayActions: TodayAction[]; stats: WeeklyStats }
  | { type: "SET_OPPORTUNITIES"; opportunities: ApiOpportunity[] }
  | { type: "SELECT"; id: string }
  | { type: "CLOSE_DETAIL" }
  | { type: "OPEN_CREATE" }
  | { type: "CLOSE_CREATE" }
  | { type: "SET_FILTER"; filter: Partial<OpportunityFilters> }
  | { type: "RESET_FILTERS" }
  | { type: "ADD_OPPORTUNITY"; opportunity: ApiOpportunity }
  | { type: "UPDATE_OPPORTUNITY"; opportunity: ApiOpportunity }
  | { type: "REMOVE_OPPORTUNITY"; id: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }

function reducer(state: OpportunitiesState, action: Action): OpportunitiesState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab }
    case "SET_DATA":
      return {
        ...state,
        opportunities: action.opportunities,
        todayActions: action.todayActions,
        stats: action.stats,
        isLoading: false,
        error: null,
      }
    case "SET_OPPORTUNITIES":
      return { ...state, opportunities: action.opportunities }
    case "SELECT":
      return { ...state, selectedId: action.id, isDetailOpen: true }
    case "CLOSE_DETAIL":
      return { ...state, isDetailOpen: false, selectedId: null }
    case "OPEN_CREATE":
      return { ...state, isCreateOpen: true }
    case "CLOSE_CREATE":
      return { ...state, isCreateOpen: false }
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, ...action.filter } }
    case "RESET_FILTERS":
      return { ...state, filters: DEFAULT_FILTERS }
    case "ADD_OPPORTUNITY":
      return {
        ...state,
        opportunities: [action.opportunity, ...state.opportunities],
        isCreateOpen: false,
      }
    case "UPDATE_OPPORTUNITY":
      return {
        ...state,
        opportunities: state.opportunities.map((o) =>
          o.id === action.opportunity.id ? action.opportunity : o,
        ),
      }
    case "REMOVE_OPPORTUNITY":
      return {
        ...state,
        opportunities: state.opportunities.filter((o) => o.id !== action.id),
        isDetailOpen: state.selectedId === action.id ? false : state.isDetailOpen,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    case "SET_LOADING":
      return { ...state, isLoading: action.loading }
    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface OpportunitiesContextValue {
  state: OpportunitiesState
  dispatch: React.Dispatch<Action>
  selectedOpportunity: ApiOpportunity | null
  refetch: () => Promise<void>
  createOpportunity: (data: Record<string, unknown>) => Promise<void>
  moveToStage: (id: string, toStatus: OpportunityStatus, finalizationType?: string) => Promise<void>
  deleteOpportunity: (id: string) => Promise<void>
  updateChecklist: (id: string, itemId: string, checked: boolean) => Promise<void>
}

const Ctx = createContext<OpportunitiesContextValue | null>(null)

export function useOpportunities() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useOpportunities must be inside OpportunitiesProvider")
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface ProviderProps {
  children: ReactNode
  initialOpportunities: ApiOpportunity[]
  initialTodayActions: TodayAction[]
  initialStats: WeeklyStats
}

export function OpportunitiesProvider({
  children,
  initialOpportunities,
  initialTodayActions,
  initialStats,
}: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    opportunities: initialOpportunities,
    todayActions: initialTodayActions,
    stats: initialStats,
  })

  const selectedOpportunity = useMemo(
    () => state.opportunities.find((o) => o.id === state.selectedId) || null,
    [state.opportunities, state.selectedId],
  )

  const refetch = useCallback(async () => {
    dispatch({ type: "SET_LOADING", loading: true })
    try {
      const [oppsRes, todayRes, statsRes] = await Promise.all([
        fetch("/api/minhas-mentorias/opportunities"),
        fetch("/api/minhas-mentorias/opportunities/today"),
        fetch("/api/minhas-mentorias/opportunities/stats"),
      ])
      const [opps, today, stats] = await Promise.all([
        oppsRes.json(),
        todayRes.json(),
        statsRes.json(),
      ])
      dispatch({
        type: "SET_DATA",
        opportunities: opps.data || [],
        todayActions: today.data || [],
        stats: stats.data || initialStats,
      })
    } catch {
      dispatch({ type: "SET_ERROR", error: "Erro ao carregar dados" })
    }
  }, [initialStats])

  const createOpportunity = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch("/api/minhas-mentorias/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Erro ao criar oportunidade")
    dispatch({ type: "ADD_OPPORTUNITY", opportunity: json.data })
    // Refetch today + stats no background
    refetch()
  }, [refetch])

  const moveToStage = useCallback(async (
    id: string,
    toStatus: OpportunityStatus,
    finalizationType?: string,
  ) => {
    const payload: Record<string, string> = { to_status: toStatus }
    if (finalizationType) payload.finalization_type = finalizationType

    const res = await fetch(`/api/minhas-mentorias/opportunities/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Erro ao mover")
    dispatch({ type: "UPDATE_OPPORTUNITY", opportunity: json.data })
    refetch()
  }, [refetch])

  const deleteOpportunity = useCallback(async (id: string) => {
    const res = await fetch(`/api/minhas-mentorias/opportunities/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || "Erro ao excluir")
    }
    dispatch({ type: "REMOVE_OPPORTUNITY", id })
    refetch()
  }, [refetch])

  const updateChecklist = useCallback(async (
    id: string,
    itemId: string,
    checked: boolean,
  ) => {
    const res = await fetch(`/api/minhas-mentorias/opportunities/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: itemId, checked }] }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Erro ao atualizar checklist")

    // Atualizar checklist localmente
    const opp = state.opportunities.find((o) => o.id === id)
    if (opp) {
      dispatch({
        type: "UPDATE_OPPORTUNITY",
        opportunity: { ...opp, checklist: json.data },
      })
    }
  }, [state.opportunities])

  const value = useMemo<OpportunitiesContextValue>(
    () => ({
      state,
      dispatch,
      selectedOpportunity,
      refetch,
      createOpportunity,
      moveToStage,
      deleteOpportunity,
      updateChecklist,
    }),
    [state, selectedOpportunity, refetch, createOpportunity, moveToStage, deleteOpportunity, updateChecklist],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
