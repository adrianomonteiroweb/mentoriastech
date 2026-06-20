"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SummaryTab } from "./summary-tab"
import { NotesTab } from "./notes-tab"
import { DocumentsTab } from "./documents-tab"
import { TasksTab } from "./tasks-tab"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"
import type { BookingStatus } from "@/lib/types/database"

interface SessionTabsProps {
  booking: MenteeBookingItem
  attachmentCount: number
  taskCount: number
}

export function SessionTabs({ booking, attachmentCount, taskCount }: SessionTabsProps) {
  const hasNotes = Boolean(
    booking.topicsDiscussed || booking.menteeStrengths || booking.menteeGrowthAreas || booking.adminNotes
  )

  return (
    <Tabs defaultValue={hasNotes ? "notas" : "resumo"} className="w-full" aria-label="Seções da sessão de mentoria">
      <TabsList className="w-full justify-start overflow-x-auto scrollbar-none h-12 rounded-none border-b border-border bg-transparent p-0 gap-0">
        <TabsTrigger
          value="resumo"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px] px-4 text-base"
        >
          Resumo
        </TabsTrigger>
        <TabsTrigger
          value="notas"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px] px-4 text-base"
        >
          Notas
        </TabsTrigger>
        <TabsTrigger
          value="docs"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px] px-4 text-base"
        >
          Docs{attachmentCount > 0 && ` (${attachmentCount})`}
        </TabsTrigger>
        <TabsTrigger
          value="tarefas"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px] px-4 text-base"
        >
          Tarefas{taskCount > 0 && ` (${taskCount})`}
        </TabsTrigger>
      </TabsList>

      <div className="px-4 py-4">
        <TabsContent value="resumo" className="mt-0">
          <SummaryTab booking={booking} />
        </TabsContent>
        <TabsContent value="notas" className="mt-0">
          <NotesTab booking={booking} />
        </TabsContent>
        <TabsContent value="docs" className="mt-0">
          <DocumentsTab bookingId={booking.id} />
        </TabsContent>
        <TabsContent value="tarefas" className="mt-0">
          <TasksTab bookingId={booking.id} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
