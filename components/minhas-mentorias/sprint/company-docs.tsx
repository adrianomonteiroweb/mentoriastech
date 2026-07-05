"use client"

import { Building2 } from "lucide-react"
import { SimMarkdown } from "./sim-markdown"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SimSprintHubApi } from "@/lib/types/database"

const ARCHETYPE_LABELS: Record<string, string> = {
  startup: "Startup",
  saas: "SaaS",
  enterprise: "Enterprise",
}

const CONTEXT_SECTIONS = [
  { key: "description", title: "Sobre a empresa" },
  { key: "product_description", title: "Produto" },
  { key: "client_description", title: "Cliente" },
  { key: "service_description", title: "Serviço" },
  { key: "process_description", title: "Processo de trabalho" },
] as const

/**
 * Documentação da empresa fictícia: contexto em accordion (progressive
 * disclosure) + docs de PO/PM/Tech Lead em sub-abas.
 */
export function CompanyDocs({ docs }: { docs: SimSprintHubApi["company_docs"] }) {
  if (!docs) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-center text-base text-muted-foreground">
        A empresa desta sprint não está mais disponível.
      </p>
    )
  }

  const sections = CONTEXT_SECTIONS.filter((section) => docs[section.key])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{docs.name}</h2>
          <Badge variant="outline" className="mt-0.5">
            {ARCHETYPE_LABELS[docs.archetype]}
          </Badge>
        </div>
      </div>

      {sections.length > 0 && (
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
          {sections.map((section) => (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="text-base font-semibold min-h-[48px]">
                {section.title}
              </AccordionTrigger>
              <AccordionContent>
                <SimMarkdown markdown={docs[section.key] || ""} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <section aria-label="Documentos da equipe" className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground mb-3">
          Documentos da equipe
        </h2>
        <Tabs defaultValue="po">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="po" className="min-h-[44px]">PO</TabsTrigger>
            <TabsTrigger value="pm" className="min-h-[44px]">PM</TabsTrigger>
            <TabsTrigger value="techlead" className="min-h-[44px]">Tech Lead</TabsTrigger>
          </TabsList>
          <TabsContent value="po" className="mt-3">
            <SimMarkdown markdown={docs.po_doc_markdown || ""} />
          </TabsContent>
          <TabsContent value="pm" className="mt-3">
            <SimMarkdown markdown={docs.pm_doc_markdown || ""} />
          </TabsContent>
          <TabsContent value="techlead" className="mt-3">
            <SimMarkdown markdown={docs.tech_lead_doc_markdown || ""} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
