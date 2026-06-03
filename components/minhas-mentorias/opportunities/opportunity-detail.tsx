"use client"

import { useState } from "react"
import {
  ExternalLink,
  Linkedin,
  Trash2,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  FINALIZATION_LABELS,
  INTERVIEW_TYPE_LABELS,
  JOB_LEVEL_LABELS,
  STAGE_MAP,
  WORK_MODEL_LABELS,
} from "./constants"
import { MessageTemplates } from "./message-templates"
import { MoveStageDropdown } from "./move-stage-dropdown"
import { useOpportunities } from "./opportunities-context"
import { PriorityBadge } from "./priority-badge"
import { StageChecklist } from "./stage-checklist"
import { Timeline } from "./timeline"

function daysSince(d: string | null): string {
  if (!d) return ""
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Hoje"
  if (days === 1) return "ha 1 dia"
  return `ha ${days} dias`
}

function DetailContent() {
  const { selectedOpportunity: o, dispatch, deleteOpportunity } = useOpportunities()
  const [deleting, setDeleting] = useState(false)

  if (!o) return null

  const stage = STAGE_MAP[o.status]

  async function handleDelete() {
    if (!o) return
    setDeleting(true)
    try {
      await deleteOpportunity(o.id)
    } catch {
      // context handles
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-1">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {stage && (
            <Badge className={`text-[10px] ${stage.color} ${stage.bgColor} ${stage.borderColor} border`}>
              {stage.label}
            </Badge>
          )}
          <PriorityBadge priority={o.priority} />
          {o.status === "finalized" && o.finalization_type && (
            <Badge variant="outline" className="text-[10px]">
              {FINALIZATION_LABELS[o.finalization_type] || o.finalization_type}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {o.work_model && <span>{WORK_MODEL_LABELS[o.work_model]}</span>}
          {o.job_level && <span>· {JOB_LEVEL_LABELS[o.job_level]}</span>}
          {o.interview_type && <span>· Entrevista {INTERVIEW_TYPE_LABELS[o.interview_type]}</span>}
          {o.created_at && <span>· Cadastrada {daysSince(o.created_at)}</span>}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {o.company_linkedin_url && (
            <a
              href={o.company_linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Linkedin className="h-3 w-3" />
              {o.company_name}
            </a>
          )}
          {o.url && (
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Link da vaga
            </a>
          )}
          {o.contact_linkedin && (
            <a
              href={o.contact_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Linkedin className="h-3 w-3" />
              {o.contact_name || "Contato"}
            </a>
          )}
        </div>

        {/* Description */}
        {o.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {o.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checklist" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="mensagens" className="text-xs">Mensagens</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-3">
          <StageChecklist
            opportunityId={o.id}
            items={o.checklist || []}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <Timeline opportunityId={o.id} />
        </TabsContent>

        <TabsContent value="mensagens" className="mt-3">
          <MessageTemplates
            companyName={o.company_name}
            contactName={o.contact_name}
            jobTitle={o.title}
          />
        </TabsContent>
      </Tabs>

      {/* Actions footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        {o.status !== "finalized" ? (
          <MoveStageDropdown opportunityId={o.id} currentStage={o.status} />
        ) : (
          <div />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
          Excluir
        </Button>
      </div>
    </div>
  )
}

export function OpportunityDetail() {
  const { state, dispatch, selectedOpportunity } = useOpportunities()
  const isMobile = useIsMobile()

  const open = state.isDetailOpen && !!selectedOpportunity
  const title = selectedOpportunity
    ? `${selectedOpportunity.title || "Vaga"} · ${selectedOpportunity.company_name}`
    : ""

  function handleClose() {
    dispatch({ type: "CLOSE_DETAIL" })
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && handleClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-base">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <DetailContent />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <DetailContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}
