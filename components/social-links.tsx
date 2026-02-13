"use client"

import { Linkedin, MessageCircle, Instagram } from "lucide-react"

const links = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/adrianomonteirodev",
    icon: Linkedin,
    color: "hover:border-[#0A66C2] hover:text-[#0A66C2]",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/5585986663753",
    icon: MessageCircle,
    color: "hover:border-[#25D366] hover:text-[#25D366]",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/adrianomonteirobeck",
    icon: Instagram,
    color: "hover:border-[#E4405F] hover:text-[#E4405F]",
  },
]

export function SocialLinks() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm font-medium text-card-foreground transition-all duration-200 ${link.color}`}
        >
          <link.icon className="h-5 w-5" />
          <span>{link.label}</span>
          <svg
            className="ml-auto h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
          </svg>
        </a>
      ))}
    </div>
  )
}
