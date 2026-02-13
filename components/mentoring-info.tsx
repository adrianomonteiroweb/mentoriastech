import { GraduationCap, Briefcase, MessageSquare, Globe, Bot } from "lucide-react"

const TOPICS = [
  { icon: Briefcase, label: "Carreira em programacao" },
  { icon: MessageSquare, label: "Preparacao para entrevistas" },
  { icon: GraduationCap, label: "Busca de oportunidades" },
  { icon: Globe, label: "Desenvolvimento Web" },
  { icon: Bot, label: "Automacoes RPA" },
]

export function MentoringInfo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold text-foreground">
          Mentoria Gratuita de Programacao
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {"Ofereco mentorias gratuitas para iniciantes na programacao e para quem deseja migrar de carreira para a area de tecnologia. Agende uma conversa comigo!"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Principais temas
        </span>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
            >
              <Icon className="h-3 w-3 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
