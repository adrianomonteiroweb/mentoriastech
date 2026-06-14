import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl sm:text-5xl",
} as const;

interface BrandLogoProps {
  /** Visual scale of the wordmark. Defaults to "md". */
  size?: keyof typeof SIZE_CLASSES;
  /** Render "By Adriano Monteiro" below the wordmark. */
  showByline?: boolean;
  className?: string;
}

/**
 * MentoriasTech wordmark — "Mentorias" (foreground) + "Tech" (primary/azul).
 * Recriado em texto para escalar e acompanhar o tema, sem depender de arquivo.
 */
export function BrandLogo({
  size = "md",
  showByline = false,
  className,
}: BrandLogoProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span
        className={cn(
          "font-bold leading-none tracking-tight text-foreground",
          SIZE_CLASSES[size],
        )}
      >
        Mentorias<span className="text-primary">Tech</span>
      </span>
      {showByline && (
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          By Adriano Monteiro
        </span>
      )}
    </div>
  );
}
