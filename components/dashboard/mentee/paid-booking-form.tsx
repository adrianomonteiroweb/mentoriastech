"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Send, CheckCircle2 } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import type { MentoringTopic } from "@/lib/types/database"

export function PaidBookingForm() {
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [topicId, setTopicId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [bookingType, setBookingType] = useState<"paid" | "private">("paid")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((json) => {
        const paidTopics = (json.topics || []).filter(
          (t: MentoringTopic) => t.category === "paid",
        )
        setTopics(paidTopics)
      })
      .catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Nao autenticado")

      const topic = topics.find((t) => t.id === topicId)

      const { error: insertError } = await supabase.from("bookings").insert({
        mentee_id: user.id,
        topic_id: topicId,
        session_date: date,
        start_time: time + ":00",
        booking_type: bookingType,
        status: "pending",
        notes: `${topic?.name || "Mentoria"} - ${notes}`,
      })

      if (insertError) throw new Error(insertError.message)

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold">Solicitacao enviada!</h3>
        <p className="text-sm text-muted-foreground text-center">
          Sua solicitacao de mentoria foi registrada. O mentor vai analisar e entrar em contato para confirmar o agendamento e informar os dados para pagamento via PIX.
        </p>
        <Button variant="outline" onClick={() => setSuccess(false)}>
          Nova solicitacao
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <Label>Tipo de mentoria</Label>
        <Select value={bookingType} onValueChange={(v) => setBookingType(v as "paid" | "private")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Mentoria Paga</SelectItem>
            <SelectItem value="private">Mentoria Particular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tema</Label>
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger><SelectValue placeholder="Selecione um tema" /></SelectTrigger>
          <SelectContent>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time">Horario</Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observacoes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Descreva o que gostaria de abordar na mentoria..." />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !topicId || !date || !time}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
        {loading ? "Enviando..." : "Solicitar mentoria"}
      </Button>
    </form>
  )
}
