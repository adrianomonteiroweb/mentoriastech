"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Props {
  sprintId: string
  menteeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
}

export function QuickMessageDialog({
  sprintId,
  menteeName,
  open,
  onOpenChange,
  onSent,
}: Props) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/sprints/${sprintId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed, kind: "daily" }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error || "Erro ao enviar mensagem")
        return
      }
      toast.success("Mensagem enviada")
      setBody("")
      onOpenChange(false)
      onSent?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensagem para {menteeName}</DialogTitle>
          <DialogDescription>
            Envie uma mensagem rápida que aparecerá na Daily do mentorado.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Sua mensagem ao mentorado…"
        />
        <DialogFooter>
          <Button
            disabled={sending || !body.trim()}
            onClick={handleSend}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
