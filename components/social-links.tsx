"use client"

import { Instagram, Linkedin, MessageCircle } from "lucide-react"
import { SUPPORT_WHATSAPP_NUMBER } from "@/lib/whatsapp"

const links = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/adrianomonteirodev",
    icon: Linkedin,
    color: "hover:border-[#0A66C2]/70 hover:bg-[#0A66C2]/10 hover:text-[#69aef5]",
  },
  {
    label: "WhatsApp",
    href: `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`,
    icon: MessageCircle,
    color: "hover:border-[#25D366]/70 hover:bg-[#25D366]/10 hover:text-[#4ade80]",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/mentoriastech/",
    icon: Instagram,
    color: "hover:border-[#E4405F]/70 hover:bg-[#E4405F]/10 hover:text-[#fb7185]",
  },
]

export function SocialLinks() {
  return (
    <nav className="flex justify-center gap-3" aria-label="Redes sociais">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/70 text-muted-foreground shadow-sm shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 ${link.color}`}
        >
          <link.icon className="h-5 w-5" />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </nav>
  )
}
