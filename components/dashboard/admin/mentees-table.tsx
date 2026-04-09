"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import type { Profile } from "@/lib/types/database"

export function MenteesTable() {
  const [mentees, setMentees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  function loadMentees() {
    setLoading(true)
    const params = search ? `?search=${encodeURIComponent(search)}` : ""
    fetch(`/api/admin/mentees${params}`)
      .then((r) => r.json())
      .then((json) => setMentees(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeout = setTimeout(loadMentees, 300)
    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
              <TableHead className="hidden md:table-cell">LinkedIn</TableHead>
              <TableHead>Curriculo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : mentees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum mentorado encontrado
                </TableCell>
              </TableRow>
            ) : (
              mentees.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                  <TableCell className="text-xs">{m.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{m.whatsapp || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {m.linkedin_url ? (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline">
                        LinkedIn
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {m.resume_url ? (
                      <a href={m.resume_url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
