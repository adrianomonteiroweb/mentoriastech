"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import {
  isInternationalPhone,
  getTimezoneDisplay,
  convertBrazilTimeToTimezone,
  getTimezoneFromPhone,
  getCountryFromPhone,
  getCountryNamePT,
} from "@/lib/timezone"

interface ScheduleSlot {
  id: string
  slotId?: string
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
  { day: "Segunda-feira", time: "21:00" },
  { day: "Terça-feira", time: "21:00" },
  { day: "Quarta-feira", time: "21:00" },
  { day: "Quinta-feira", time: "21:00" },
  { day: "Sexta-feira", time: "21:00" },
  { day: "Sábado", time: "10:00" },
  { day: "Sábado", time: "14:00" },
  { day: "Domingo", time: "10:00" },
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

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  return d.toISOString().split("T")[0]
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function formatShort(dateStr: string) {
  const [, month, day] = dateStr.split("-")
  return `${day}/${month}`
}

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
  const [activeWeek, setActiveWeek] = useState<string | null>(null)

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

  const isIntl = useMemo(() => {
    return whatsapp ? isInternationalPhone(whatsapp) : false
  }, [whatsapp])

  const intlTimezone = useMemo(() => {
    return whatsapp ? getTimezoneFromPhone(whatsapp) : null
  }, [whatsapp])

  const intlCountryName = useMemo(() => {
    if (!whatsapp) return ""
    const country = getCountryFromPhone(whatsapp)
    return country ? getCountryNamePT(country) : ""
  }, [whatsapp])

  const availableSlots = useMemo(
    () => slots.filter((s) => s.isAvailable && s.slotType === "free"),
    [slots],
  )

  const weeks = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>()
    for (const slot of availableSlots) {
      const key = mondayOf(slot.date)
      const list = map.get(key) || []
      list.push(slot)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .map(([key, weekSlots]) => ({
        key,
        slots: weekSlots.sort((a, b) =>
          a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
        ),
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [availableSlots])

  useEffect(() => {
    if (!weeks.length) {
      setActiveWeek(null)
      return
    }
    if (!activeWeek || !weeks.some((w) => w.key === activeWeek)) {
      setActiveWeek(weeks[0].key)
    }
  }, [weeks, activeWeek])

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
        slotId: slot.slotId || slot.id,
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
    const confirmedSlot = usingFallback
      ? fallbackSlotIdx !== null ? FALLBACK_SLOTS[fallbackSlotIdx] : null
      : slots.find((s) => s.id === selectedSlot)

    const confirmedTz = confirmedSlot && isIntl && intlTimezone && !usingFallback
      ? (() => {
          const slot = confirmedSlot as ScheduleSlot
          return getTimezoneDisplay(whatsapp, slot.date, slot.startTime)
        })()
      : null

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
        {confirmedTz && confirmedTz.localTime && (
          <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <Globe className="h-3.5 w-3.5" />
              Atenção ao fuso horário
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {confirmedTz.label}
            </p>
          </div>
        )}
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

  const currentIdx = activeWeek ? weeks.findIndex((w) => w.key === activeWeek) : -1
  const currentWeek = currentIdx >= 0 ? weeks[currentIdx] : null

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
        <PhoneNumberInput
          id="whatsapp"
          required
          value={whatsapp}
          onChange={setWhatsapp}
          className="min-h-12 px-4"
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

        {!dataLoaded ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando horarios...
          </div>
        ) : usingFallback ? (
          <div className="grid grid-cols-1 gap-2">
            {FALLBACK_SLOTS.map((slot, i) => (
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
            ))}
          </div>
        ) : weeks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Todos os horarios das proximas semanas ja foram preenchidos. Tente novamente em breve.
          </p>
        ) : (
          <>
            {isIntl && intlCountryName && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <Globe className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <p className="text-[11px] text-muted-foreground">
                  Horários exibidos no fuso de Brasília (Brasil). O horário no seu país ({intlCountryName}) é mostrado ao lado.
                </p>
              </div>
            )}

            {weeks.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentIdx > 0) {
                      setActiveWeek(weeks[currentIdx - 1].key)
                      setSelectedSlot(null)
                    }
                  }}
                  disabled={currentIdx <= 0}
                  className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="text-xs text-muted-foreground">
                  {currentWeek
                    ? `${formatShort(currentWeek.key)} a ${formatShort(addDaysISO(currentWeek.key, 6))}`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (currentIdx < weeks.length - 1) {
                      setActiveWeek(weeks[currentIdx + 1].key)
                      setSelectedSlot(null)
                    }
                  }}
                  disabled={currentIdx >= weeks.length - 1}
                  className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {currentWeek && currentWeek.slots.length > 0 ? (
                currentWeek.slots.map((slot) => {
                  const localTime = isIntl && intlTimezone
                    ? convertBrazilTimeToTimezone(slot.date, slot.startTime, intlTimezone)
                    : null
                  const showLocal = localTime && localTime !== slot.startTime.substring(0, 5)

                  return (
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
                        {formatShort(slot.date)}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {slot.startTime}
                        {showLocal && (
                          <span className="text-amber-400 font-medium ml-1">
                            · {localTime}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Esta semana esta cheia. Navegue para a proxima.
                </p>
              )}
            </div>
          </>
        )}
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
