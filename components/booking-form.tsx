"use client"

import { useState } from "react"
import { CalendarDays, Clock, Send, CheckCircle2, Loader2 } from "lucide-react"

const AVAILABLE_SLOTS = [
  { date: "2026-02-16", day: "Seg", time: "09:00" },
  { date: "2026-02-16", day: "Seg", time: "14:00" },
  { date: "2026-02-17", day: "Ter", time: "10:00" },
  { date: "2026-02-17", day: "Ter", time: "15:00" },
  { date: "2026-02-18", day: "Qua", time: "09:00" },
  { date: "2026-02-18", day: "Qua", time: "11:00" },
  { date: "2026-02-19", day: "Qui", time: "14:00" },
  { date: "2026-02-20", day: "Sex", time: "10:00" },
  { date: "2026-02-20", day: "Sex", time: "16:00" },
]

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

export function BookingForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedSlot === null) return

    setStatus("loading")
    setErrorMsg("")

    const slot = AVAILABLE_SLOTS[selectedSlot]

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          whatsapp,
          date: formatDate(slot.date),
          time: slot.time,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar")
      }

      setStatus("success")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar solicitação")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-card p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Solicitação enviada!</h3>
        <p className="text-sm text-muted-foreground">
          Obrigado pelo interesse. Entrarei em contato em breve para confirmar o agendamento.
        </p>
        <button
          onClick={() => {
            setStatus("idle")
            setName("")
            setEmail("")
            setWhatsapp("")
            setSelectedSlot(null)
          }}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Fazer novo agendamento
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nome
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="Seu nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="whatsapp" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          type="tel"
          required
          placeholder="(85) 99999-9999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Escolha uma data e horário
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AVAILABLE_SLOTS.map((slot, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedSlot(i)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
                selectedSlot === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30"
              }`}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="font-medium">{slot.day} {formatDate(slot.date)}</span>
              <span className="ml-auto flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {slot.time}
              </span>
            </button>
          ))}
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={selectedSlot === null || status === "loading"}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {status === "loading" ? "Enviando..." : "Enviar solicitação"}
      </button>
    </form>
  )
}
