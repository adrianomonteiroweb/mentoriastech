import Link from "next/link"
import { ArrowRight, Bot, Clock, Code2, GraduationCap } from "lucide-react"

const highlights = [
  { label: "Software", icon: Code2 },
  { label: "RPA", icon: Bot },
  { label: "Carreira tech", icon: GraduationCap },
]

function Logo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="h-16 w-16 drop-shadow-lg sm:h-20 sm:w-20"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0d1117" />
            <stop offset="1" stopColor="#161b22" />
          </linearGradient>
          <linearGradient id="hero-fg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#hero-bg)" />
        <g fill="none" stroke="url(#hero-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 19 20 L 12 32 L 19 44" />
          <path d="M 35 20 L 29 44" />
          <path d="M 45 20 L 52 32 L 45 44" />
        </g>
      </svg>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Mentorias
        <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          Tech
        </span>
      </h1>
    </div>
  )
}

export function HeroSection() {
  return (
    <header className="flex flex-col items-center gap-5 text-center">
      <Logo />

      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Conecte-se. Cresça. Transforme.
        </p>
        <p className="max-w-sm text-sm font-medium leading-relaxed text-foreground/85">
          Plataforma de mentorias em desenvolvimento de software, automações RPA
          e carreira em tecnologia.
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Mentoria prática para transformar dúvidas em próximos passos:
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

      <div className="flex w-full flex-col items-center gap-2">
        <Link
          href="#booking"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-all duration-200 hover:bg-primary/90 focus-visible:bg-primary/90"
        >
          Solicitar mentoria
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600/90 dark:text-amber-300/90">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Poucas vagas gratuitas por mês
        </p>
      </div>
    </header>
  )
}
