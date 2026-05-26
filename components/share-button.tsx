"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { Check, Share2 } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ShareTracking =
  | { type: "page"; path: string; label: string }
  | { type: "content"; id: string }
  | { type: "job"; id: string }

type ShareButtonProps = {
  path: string
  title: string
  text?: string
  label?: string
  copiedLabel?: string
  labelVisibility?: "always" | "desktop" | "sr-only"
  className?: string
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  tracking?: ShareTracking
}

function getAbsoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

function trackShare(tracking?: ShareTracking) {
  if (!tracking) return

  const payload =
    tracking.type === "page"
      ? {
          target_type: "page",
          path: tracking.path,
          label: tracking.label,
        }
      : {
          target_type: tracking.type,
          target_id: tracking.id,
        }

  fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function ShareButton({
  path,
  title,
  text,
  label = "Compartilhar",
  copiedLabel = "Link copiado",
  labelVisibility = "always",
  className,
  variant = "secondary",
  size = "sm",
  tracking,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function handleShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const url = getAbsoluteUrl(path)
    const shareData: ShareData = { title, text, url }
    trackShare(tracking)

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await copyToClipboard(url)
      setCopied(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }

      await copyToClipboard(url)
      setCopied(true)
    }
  }

  const currentLabel = copied ? copiedLabel : label

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      onClick={handleShare}
      title={currentLabel}
      aria-label={currentLabel}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span
        className={cn(
          labelVisibility === "desktop" && "hidden sm:inline",
          labelVisibility === "sr-only" && "sr-only",
        )}
      >
        {currentLabel}
      </span>
    </Button>
  )
}
