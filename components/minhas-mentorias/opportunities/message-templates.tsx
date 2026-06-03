"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ApiMessageTemplate } from "./types"

interface Props {
  companyName: string
  contactName: string | null
  jobTitle: string | null
}

function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || `[${key}]`)
  }
  return result
}

function TemplateCard({
  template,
  vars,
}: {
  template: ApiMessageTemplate
  vars: Record<string, string>
}) {
  const [copied, setCopied] = useState(false)

  const text = interpolate(template.body, vars)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">
            {template.title}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-400" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
          {text}
        </p>
      </CardContent>
    </Card>
  )
}

export function MessageTemplates({ companyName, contactName, jobTitle }: Props) {
  const [templates, setTemplates] = useState<ApiMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/minhas-mentorias/opportunities/templates")
      const json = await res.json()
      setTemplates(json.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const vars: Record<string, string> = {
    empresa: companyName,
    contato: contactName || "[Nome]",
    vaga: jobTitle || "[Vaga]",
    area: "[sua area]",
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Nenhum template disponivel.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Copie e personalize antes de enviar. Os campos entre colchetes precisam ser preenchidos.
      </p>
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} vars={vars} />
      ))}
    </div>
  )
}
