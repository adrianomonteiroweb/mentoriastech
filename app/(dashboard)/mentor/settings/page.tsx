"use client"

import { type FormEvent, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"

export default function MentorSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setMessage("")

    if (newPassword !== confirmPassword) {
      setMessage("As senhas nao coincidem.")
      setIsError(true)
      return
    }

    if (newPassword.length < 6) {
      setMessage("A nova senha deve ter pelo menos 6 caracteres.")
      setIsError(true)
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao alterar senha")
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Senha alterada com sucesso.")
      setIsError(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao alterar senha")
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DashboardHeader title="Configuracoes" description="Ajustes da sua conta" />
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alterar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setMessage("")
                    setCurrentPassword(e.target.value)
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setMessage("")
                    setNewPassword(e.target.value)
                  }}
                  placeholder="Minimo 6 caracteres"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setMessage("")
                    setConfirmPassword(e.target.value)
                  }}
                  required
                />
              </div>

              {message && (
                <p className={`text-sm ${isError ? "text-destructive" : "text-green-500"}`}>
                  {message}
                </p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar nova senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
