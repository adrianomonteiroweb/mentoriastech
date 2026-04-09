import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  MessageSquare,
  Globe,
  Bot,
  CalendarDays,
} from "lucide-react";

const TOPICS = [
  { icon: Briefcase, label: "Carreira em programação" },
  { icon: MessageSquare, label: "Preparação para entrevistas" },
  { icon: GraduationCap, label: "Busca de oportunidades" },
  { icon: Globe, label: "Desenvolvimento Web" },
  { icon: Bot, label: "Automações RPA" },
];

export function MentoringInfo() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold text-foreground">
          Mentoria Gratuita de Programação
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ofereço mentorias gratuitas para iniciantes na programação e para quem
          deseja migrar de carreira para a área de tecnologia. Agende uma
          conversa comigo!
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

      <Link
        href="/schedule"
        className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-medium text-primary transition-all duration-200 hover:bg-primary/20"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Ver agenda da semana
      </Link>
    </div>
  );
}
