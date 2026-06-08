"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function MinhasMentoriasPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const emailParam = new URLSearchParams(window.location.search).get("email")
    if (emailParam) setEmail(emailParam)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/minhas-mentorias/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Erro ao enviar código.")
      setLoading(false)
      return
    }

    router.push(`/minhas-mentorias/verificar?email=${encodeURIComponent(email)}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Minhas Mentorias</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse o histórico de anotações das suas mentorias. Informe o email que
            você usou no agendamento para receber um código de acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          O código tem validade de 15 minutos e será enviado para o email informado.
        </p>

        <Link
          href="/"
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}
