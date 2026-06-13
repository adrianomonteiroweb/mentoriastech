"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Mentor {
  id: string
  name: string
  email: string
}

interface MentorFilterContextValue {
  mentorId: string | null
  buildUrl: (base: string) => string
}

const MentorFilterContext = createContext<MentorFilterContextValue>({
  mentorId: null,
  buildUrl: (base) => base,
})

export function useMentorFilter() {
  return useContext(MentorFilterContext)
}

export function MentorFilterProvider({ children }: { children: ReactNode }) {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/mentors")
      .then((r) => r.json())
      .then((json) => setMentors(json.data || []))
      .catch(console.error)
  }, [])

  function buildUrl(base: string) {
    if (!selectedId) return base
    const separator = base.includes("?") ? "&" : "?"
    return `${base}${separator}mentorId=${selectedId}`
  }

  return (
    <MentorFilterContext.Provider value={{ mentorId: selectedId, buildUrl }}>
      {mentors.length > 1 && (
        <div className="flex items-center gap-2 px-4 pt-4 md:px-6 md:pt-6">
          <span className="text-sm text-muted-foreground">Mentor:</span>
          <Select
            value={selectedId || "all"}
            onValueChange={(v) => setSelectedId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os mentores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os mentores</SelectItem>
              {mentors.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {children}
    </MentorFilterContext.Provider>
  )
}
