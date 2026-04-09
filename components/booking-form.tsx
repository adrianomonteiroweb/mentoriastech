"use client"

import { useEffect, useState } from "react"
import {
  CalendarDays,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface ScheduleSlot {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  slotType: string
  date: string
  bookings: { id: string }[]
  isAvailable: boolean
}

interface Topic {
  id: string
  name: string
  category: string
}

// Fallback hardcoded caso a API falhe
const FALLBACK_SLOTS = [
  { day: "Sexta-feira", time: "20:00" },
  { day: "Sábado", time: "09:00" },
  { day: "Sábado", time: "14:00" },
  { day: "Domingo", time: "09:00" },
  { day: "Domingo", time: "14:00" },
]

const FALLBACK_TOPICS = [
  "Programação para outras profissões",
  "Carreira em programação",
  "Preparação para entrevistas",
  "Busca de oportunidades",
  "Desenvolvimento Web",
  "Automações RPA",
]

export function BookingForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [selectedTopicName, setSelectedTopicName] = useState<string>("")
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Dados do banco
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  // Fallback state (quando API falha)
  const [fallbackSlotIdx, setFallbackSlotIdx] = useState<number | null>(null)
  const [fallbackTopic, setFallbackTopic] = useState<string>("")

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
    ])
      .then(([scheduleData, topicsData]) => {
        if (scheduleData.schedule && topicsData.topics) {
          setSlots(scheduleData.schedule)
          setTopics(topicsData.topics)
          setDataLoaded(true)
        } else {
          setUsingFallback(true)
          setDataLoaded(true)
        }
      })
      .catch(() => {
        setUsingFallback(true)
        setDataLoaded(true)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (usingFallback) {
      if (fallbackSlotIdx === null || !fallbackTopic) return
    } else {
      if (!selectedSlot || !selectedTopic) return
    }

    setStatus("loading")
    setErrorMsg("")

    let body: Record<string, string>

    if (usingFallback) {
      const slot = FALLBACK_SLOTS[fallbackSlotIdx!]
      body = {
        name,
        email,
        whatsapp,
        day: slot.day,
        time: slot.time,
        topic: fallbackTopic,
      }
    } else {
      const slot = slots.find((s) => s.id === selectedSlot)!
      body = {
        name,
        email,
        whatsapp,
        day: slot.dayName,
        time: slot.startTime,
        topic: selectedTopicName,
        slotId: slot.id,
        topicId: selectedTopic,
        sessionDate: slot.date,
      }
    }

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao enviar")
      }

      setStatus("success")
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao enviar solicitação",
      )
      setStatus("error")
    }
  }

  function resetForm() {
    setStatus("idle")
    setName("")
    setEmail("")
    setWhatsapp("")
    setSelectedSlot(null)
    setSelectedTopic("")
    setSelectedTopicName("")
    setFallbackSlotIdx(null)
    setFallbackTopic("")
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-card p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Solicitacao enviada!
        </h3>
        <p className="text-sm text-muted-foreground">
          Obrigado pelo interesse na mentoria! Entrarei em contato via WhatsApp
          em breve para confirmar o agendamento.
        </p>
        <button
          onClick={resetForm}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Solicitar nova mentoria
        </button>
      </div>
    )
  }

  const freeTopics = usingFallback
    ? FALLBACK_TOPICS
    : topics.filter((t) => t.category === "free")
  const availableSlots = usingFallback
    ? FALLBACK_SLOTS
    : slots.filter((s) => s.isAvailable && s.slotType === "free")

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" id="booking">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Nome e sobrenome
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="Seu nome e sobrenome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
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
        <label
          htmlFor="whatsapp"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
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
          Escolha um tema de interesse
        </label>
        <div className="flex flex-wrap gap-2">
          {!dataLoaded ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando temas...
            </div>
          ) : usingFallback ? (
            (freeTopics as string[]).map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setFallbackTopic(topic)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  fallbackTopic === topic
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30"
                }`}
              >
                {topic}
              </button>
            ))
          ) : (
            (freeTopics as Topic[]).map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  setSelectedTopic(topic.id)
                  setSelectedTopicName(topic.name)
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  selectedTopic === topic.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30"
                }`}
              >
                {topic.name}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Dia e horario disponivel
        </label>
        <div className="grid grid-cols-1 gap-2">
          {!dataLoaded ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando horarios...
            </div>
          ) : usingFallback ? (
            FALLBACK_SLOTS.map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFallbackSlotIdx(i)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
                  fallbackSlotIdx === i
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30"
                }`}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="font-medium">{slot.day}</span>
                <span className="ml-auto flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {slot.time}
                </span>
              </button>
            ))
          ) : (availableSlots as ScheduleSlot[]).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Todos os horarios desta semana ja foram preenchidos. Volte na
              proxima semana!
            </p>
          ) : (
            (availableSlots as ScheduleSlot[]).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot.id)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
                  selectedSlot === slot.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30"
                }`}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="font-medium">{slot.dayName}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  {slot.date.split("-").reverse().slice(0, 2).join("/")}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {slot.startTime}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={
          (usingFallback
            ? fallbackSlotIdx === null || !fallbackTopic
            : !selectedSlot || !selectedTopic) || status === "loading"
        }
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {status === "loading" ? "Enviando..." : "Solicitar mentoria"}
      </button>
    </form>
  )
}
