"use client"

import { useState } from "react"
import {
  JOB_LEVEL_LABELS,
  JOB_TYPE_LABELS,
  LANGUAGE_LEVEL_LABELS,
} from "@/lib/job-labels"
import { Briefcase, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useJobSearch, type JobSearchItem } from "@/hooks/use-job-search"
import { getJobCategoryLabel } from "@/lib/job-options"

export interface PickedJob {
  title: string
  description: string
  jobUrl: string
  level?: string
}

function buildDescription(job: JobSearchItem): string {
  const lines: (string | null)[] = [
    `Título: ${job.title}`,
    job.company ? `Empresa: ${job.company}` : null,
    job.location ? `Local: ${job.location}` : null,
    `Modelo: ${JOB_TYPE_LABELS[job.job_type] || job.job_type}`,
    `Nível: ${JOB_LEVEL_LABELS[job.level] || job.level}`,
    job.category ? `Categoria: ${getJobCategoryLabel(job.category)}` : null,
    job.salary_range ? `Faixa salarial: ${job.salary_range}` : null,
    job.is_international ? "Vaga internacional: sim" : null,
    job.required_language
      ? `Idioma exigido: ${job.required_language}${
          job.language_level
            ? ` (${LANGUAGE_LEVEL_LABELS[job.language_level] || job.language_level})`
            : ""
        }`
      : null,
    job.stack_tags && job.stack_tags.length > 0
      ? `Tecnologias: ${job.stack_tags.join(", ")}`
      : null,
    job.application_url ? `Link: ${job.application_url}` : null,
    "",
    "Descrição:",
    job.description || job.description_en || "",
  ]
  return lines
    .filter((line) => line !== null)
    .join("\n")
    .trim()
}

export function JobPicker({ onPick }: { onPick: (job: PickedJob) => void }) {
  const [open, setOpen] = useState(false)
  // A busca acontece no banco. Antes este seletor baixava TODAS as vagas
  // aprovadas para filtrar no cliente — insustentavel com ~1500 vagas/dia.
  const { term, setTerm, jobs, loading } = useJobSearch({ enabled: open })

  function pick(job: JobSearchItem) {
    onPick({
      title: job.title,
      description: buildDescription(job),
      jobUrl: job.application_url || "",
      level: job.level,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Briefcase className="h-4 w-4" />
          Escolher uma vaga da plataforma
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 px-4 pb-2 pt-4">
          <DialogTitle>Vagas da plataforma</DialogTitle>
          <DialogDescription>
            Selecione uma vaga da curadoria para preencher a descrição e anexar o
            link automaticamente.
          </DialogDescription>
        </DialogHeader>
        {/* shouldFilter=false: quem filtra agora e o servidor, que casa titulo,
            empresa E stack — o filtro do cliente so via o que ja estava na tela. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={term}
            onValueChange={setTerm}
            placeholder="Buscar por cargo, empresa ou tecnologia…"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando vagas…
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {term
                    ? `Nenhuma vaga encontrada para "${term}".`
                    : "Nenhuma vaga disponivel no momento."}
                </CommandEmpty>
                <CommandGroup>
                  {jobs.map((job) => (
                    <CommandItem
                      key={job.id}
                      value={`${job.title} ${job.company ?? ""} ${(job.stack_tags ?? []).join(" ")} ${job.id}`}
                      onSelect={() => pick(job)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {job.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          job.company,
                          JOB_LEVEL_LABELS[job.level] || job.level,
                          JOB_TYPE_LABELS[job.job_type] || job.job_type,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
