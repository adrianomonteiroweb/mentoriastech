import { cn } from "@/lib/utils";

const SIZES = {
  sm: { icon: "h-8 w-8", text: "text-base" },
  md: { icon: "h-9 w-9", text: "text-lg" },
} as const;

/**
 * Marca horizontal (ícone + wordmark) usada no header e no rodapé.
 * Reaproveita o mesmo mark SVG "</>" do hero.
 */
export function SiteLogo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { icon, text } = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className={cn("shrink-0 drop-shadow-sm", icon)}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="logo-bg"
            x1="0"
            y1="0"
            x2="64"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0d1117" />
            <stop offset="1" stopColor="#161b22" />
          </linearGradient>
          <linearGradient
            id="logo-fg"
            x1="0"
            y1="0"
            x2="64"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
        <g
          fill="none"
          stroke="url(#logo-fg)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 19 20 L 12 32 L 19 44" />
          <path d="M 35 20 L 29 44" />
          <path d="M 45 20 L 52 32 L 45 44" />
        </g>
      </svg>
      <span className={cn("font-bold tracking-tight text-foreground", text)}>
        Mentorias
        <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          Tech
        </span>
      </span>
    </span>
  );
}
