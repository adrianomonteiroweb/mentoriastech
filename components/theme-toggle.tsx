"use client"

import { useEffect, useState } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const THEME_COLORS = {
  light: "#f8fafc",
  dark: "#0A0E27",
}

const OPTIONS = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color =
      resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }

    meta.content = color
  }, [resolvedTheme])

  return null
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const Icon = !mounted || resolvedTheme === "dark" ? Moon : Sun
  const currentTheme = mounted ? theme || "system" : "system"

  return (
    <TooltipProvider delayDuration={200}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 h-10 w-10 rounded-full border-border/80 bg-background/90 shadow-sm backdrop-blur"
                aria-label="Alternar tema"
              >
                <Icon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Tema</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-36">
          {OPTIONS.map((option) => {
            const OptionIcon = option.icon
            const selected = currentTheme === option.value

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <OptionIcon className="h-4 w-4" />
                  {option.label}
                </span>
                {selected && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
