/**
 * Cor constante por papel (viés de reconhecimento: o mesmo papel tem sempre a
 * mesma cor em todos os componentes). O token vem de formacao_papeis.cor.
 */
export interface RoleColorClasses {
  bg: string
  text: string
  border: string
  dot: string
}

const MAP: Record<string, RoleColorClasses> = {
  amber: {
    bg: "bg-amber-500/15",
    text: "text-amber-500",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-500",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  green: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  purple: {
    bg: "bg-purple-500/15",
    text: "text-purple-500",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-500",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
  },
}

const FALLBACK: RoleColorClasses = {
  bg: "bg-primary/15",
  text: "text-primary",
  border: "border-primary/30",
  dot: "bg-primary",
}

export function roleColor(cor: string | null | undefined): RoleColorClasses {
  return (cor && MAP[cor]) || FALLBACK
}
