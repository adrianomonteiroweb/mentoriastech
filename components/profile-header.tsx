import Link from "next/link"
import { ArrowRight, Bot, Code2, GraduationCap } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

const highlights = [
  { label: "Software", icon: Code2 },
  { label: "RPA", icon: Bot },
  { label: "Carreira tech", icon: GraduationCap },
]

export function ProfileHeader() {
  return (
    <header className="flex flex-col items-center gap-5 text-center">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo size="lg" showByline />
        <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          plataforma de mentorias
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Conecte-se. Cresça. Transforme.
        </p>
        <p className="max-w-sm text-sm font-medium leading-relaxed text-foreground/85">
          Mentorias em desenvolvimento de software, automações RPA e carreira em
          tecnologia, com mentores que já trilharam o caminho.
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Conversas práticas para transformar dúvidas soltas em próximos passos:
          carreira, portfólio, entrevistas, automações e desenvolvimento web.
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {highlights.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2 text-[11px] font-medium text-secondary-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </span>
        ))}
      </div>

      <Link
        href="#booking"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-all duration-200 hover:bg-primary/90 focus-visible:bg-primary/90"
      >
        Solicitar mentoria
        <ArrowRight className="h-4 w-4" />
      </Link>
    </header>
  )
}
