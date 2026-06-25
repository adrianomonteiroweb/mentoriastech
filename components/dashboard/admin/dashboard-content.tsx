"use client"

import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PrimaryIndicators } from "@/components/dashboard/admin/primary-indicators"
import { StatsCards } from "@/components/dashboard/admin/stats-cards"
import { TopicRanking } from "@/components/dashboard/admin/topic-ranking"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { DASHBOARD_BLOCKS, isBlockVisible } from "@/lib/dashboard-blocks"

export function DashboardContent() {
  const { preferences, updatePreference } = useUserPreferences()
  const blocks = preferences.dashboardBlocks

  const visible = (id: string) => isBlockVisible(blocks, id)

  function toggleBlock(id: string, value: boolean) {
    updatePreference("dashboardBlocks", { ...blocks, [id]: value })
  }

  const hiddenCount = DASHBOARD_BLOCKS.filter((b) => !visible(b.id)).length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Personalizar
              {hiddenCount > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">
                  {hiddenCount} oculto{hiddenCount > 1 ? "s" : ""}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Mostrar blocos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DASHBOARD_BLOCKS.map((block) => (
              <DropdownMenuCheckboxItem
                key={block.id}
                checked={visible(block.id)}
                onCheckedChange={(checked) => toggleBlock(block.id, checked)}
                onSelect={(event) => event.preventDefault()}
              >
                {block.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PrimaryIndicators isBlockVisible={visible} />
      {visible("outras-metricas") && <StatsCards />}
      {visible("ranking") && <TopicRanking />}
    </div>
  )
}
