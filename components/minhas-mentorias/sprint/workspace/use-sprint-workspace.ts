"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { WorkspaceEntry } from "./file-tree"

export type SaveState = "idle" | "saving" | "saved" | "error"

interface Options {
  /** GET árvore; POST criar; DELETE ?path= (ignorados quando readOnly) */
  treeEndpoint: string
  /** GET ?path= conteúdo; PUT salvar */
  fileEndpoint: string
  readOnly?: boolean
}

export interface SprintWorkspace {
  entries: WorkspaceEntry[]
  loading: boolean
  tabs: string[]
  activePath: string | null
  contents: Record<string, string>
  saveState: SaveState
  setActivePath: (path: string | null) => void
  openFile: (path: string) => Promise<void>
  closeTab: (path: string) => void
  handleChange: (path: string, value: string) => void
  /** Cria arquivo/pasta e (se arquivo) já abre a aba. Retorna sucesso. */
  createEntry: (
    parent: string | null,
    name: string,
    isFolder: boolean,
  ) => Promise<boolean>
  /** Exclui arquivo/pasta e fecha abas afetadas. Retorna sucesso. */
  deleteEntry: (path: string) => Promise<boolean>
  reload: () => Promise<void>
}

/**
 * Estado e I/O do workspace estilo IDE (árvore + abas + conteúdos).
 * Saves são por arquivo com debounce de 1s e indicador de estado.
 * Extraído de WorkspacePanel para ser compartilhado com a IDE de execução
 * de task (SprintIde) sem duplicar a lógica de fetch/save.
 */
export function useSprintWorkspace({
  treeEndpoint,
  fileEndpoint,
  readOnly,
}: Options): SprintWorkspace {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tabs, setTabs] = useState<string[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [contents, setContents] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadTree = useCallback(async () => {
    const res = await fetch(treeEndpoint)
    const json = await res.json()
    if (res.ok) setEntries(json.data || [])
    setLoading(false)
  }, [treeEndpoint])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  // Limpa debounces pendentes ao desmontar
  useEffect(() => {
    const timers = saveTimers.current
    return () => {
      for (const timer of Object.values(timers)) clearTimeout(timer)
    }
  }, [])

  async function openFile(path: string) {
    if (!(path in contents)) {
      const res = await fetch(`${fileEndpoint}?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao abrir arquivo")
        return
      }
      setContents((current) => ({ ...current, [path]: json.data.content }))
    }
    setTabs((current) => (current.includes(path) ? current : [...current, path]))
    setActivePath(path)
  }

  function closeTab(path: string) {
    setTabs((current) => {
      const next = current.filter((tab) => tab !== path)
      if (activePath === path) {
        setActivePath(next[next.length - 1] ?? null)
      }
      return next
    })
  }

  function handleChange(path: string, value: string) {
    setContents((current) => ({ ...current, [path]: value }))
    if (readOnly) return
    setSaveState("saving")
    clearTimeout(saveTimers.current[path])
    saveTimers.current[path] = setTimeout(async () => {
      const res = await fetch(fileEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error || "Erro ao salvar arquivo")
        setSaveState("error")
        return
      }
      setSaveState("saved")
      // Atualiza tamanho na árvore sem refetch
      setEntries((current) =>
        current.map((entry) =>
          entry.path === path ? { ...entry, size: value.length } : entry,
        ),
      )
    }, 1000)
  }

  async function createEntry(
    parent: string | null,
    name: string,
    isFolder: boolean,
  ): Promise<boolean> {
    const path = parent ? `${parent}/${name}` : name
    const res = await fetch(treeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, is_folder: isFolder }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao criar")
      return false
    }
    await loadTree()
    if (!isFolder) {
      setContents((current) => ({ ...current, [path]: "" }))
      setTabs((current) => (current.includes(path) ? current : [...current, path]))
      setActivePath(path)
    }
    return true
  }

  async function deleteEntry(path: string): Promise<boolean> {
    const res = await fetch(`${treeEndpoint}?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(json?.error || "Erro ao excluir")
      return false
    }
    // Fecha abas do arquivo/pasta excluídos
    setTabs((current) => {
      const next = current.filter(
        (tab) => tab !== path && !tab.startsWith(`${path}/`),
      )
      if (activePath && !next.includes(activePath)) {
        setActivePath(next[next.length - 1] ?? null)
      }
      return next
    })
    await loadTree()
    return true
  }

  return {
    entries,
    loading,
    tabs,
    activePath,
    contents,
    saveState,
    setActivePath,
    openFile,
    closeTab,
    handleChange,
    createEntry,
    deleteEntry,
    reload: loadTree,
  }
}
