"use client"

import { Suspense, useEffect, useState } from "react"
import { AlertCircle, ArrowLeft, KeyRound, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

function VerifyForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !email) return

    fetch("/api/minhas-mentorias/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: "000000" }),
    }).then((res) => {
      if (res.ok) {
        router.push("/minhas-mentorias/historico")
        router.refresh()
      }
    })
  }, [email, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    setInfo("")

    const res = await fetch("/api/minhas-mentorias/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Código incorreto.")
      setLoading(false)
      return
    }

    router.push("/minhas-mentorias/historico")
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError("")
    setInfo("")

    const res = await fetch("/api/minhas-mentorias/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      setInfo("Novo código enviado. Verifique seu email.")
    } else {
      setError("Não foi possível reenviar agora. Aguarde 1 minuto e tente novamente.")
    }
    setResending(false)
  }

  if (!email) {
    return (
      <div className="w-full max-w-sm text-center flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Email não informado. Volte e tente novamente.
        </p>
        <Link href="/minhas-mentorias" className="text-sm text-primary hover:underline">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Digite o código</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para{" "}
          <span className="text-foreground font-medium">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => setCode(value)}
          disabled={loading}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        {error && (
          <div className="w-full rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-2 text-xs text-destructive">
              <p>{error}</p>
              <p className="text-destructive/80">
                Se o problema persistir, volte para a página anterior e solicite os dados
                da sua mentoria diretamente ao mentor pelos contatos da página inicial.
              </p>
            </div>
          </div>
        )}

        {info && (
          <p className="w-full text-xs text-primary text-center">{info}</p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {resending ? "Reenviando..." : "Não recebi o código — reenviar"}
        </button>
        <Link
          href="/minhas-mentorias"
          className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar e alterar email
        </Link>
      </div>
    </div>
  )
}

export default function VerificarPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
    </main>
  )
}
