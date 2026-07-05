"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Code2, Loader2 } from "lucide-react"
import { CodeEditor } from "./code-editor"
import { FileTabs } from "./file-tabs"
import { FileTree, type WorkspaceEntry } from "./file-tree"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type SaveState = "idle" | "saving" | "saved" | "error"

interface Props {
  /** GET árvore; POST criar; DELETE ?path= (ignorados quando readOnly) */
  treeEndpoint: string
  /** GET ?path= conteúdo; PUT salvar */
  fileEndpoint: string
  readOnly?: boolean
}

/**
 * Workspace estilo IDE: árvore de arquivos + abas + Monaco.
 * Saves são por arquivo com debounce de 1s e indicador "Salvando…/Salvo ✓".
 */
export function WorkspacePanel({ treeEndpoint, fileEndpoint, readOnly }: Props) {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tabs, setTabs] = useState<string[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [contents, setContents] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [creating, setCreating] = useState<{
    parent: string | null
    isFolder: boolean
  } | null>(null)
  const [newName, setNewName] = useState("")
  const [deleting, setDeleting] = useState<{
    path: string
    isFolder: boolean
  } | null>(null)
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
      const res = await fetch(
        `${fileEndpoint}?path=${encodeURIComponent(path)}`,
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao abrir arquivo")
        return
      }
      setContents((current) => ({ ...current, [path]: json.data.content }))
    }
    setTabs((current) =>
      current.includes(path) ? current : [...current, path],
    )
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

  async function handleCreate() {
    if (!creating || !newName.trim()) return
    const name = newName.trim()
    const path = creating.parent ? `${creating.parent}/${name}` : name
    const res = await fetch(treeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, is_folder: creating.isFolder }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao criar")
      return
    }
    setCreating(null)
    setNewName("")
    await loadTree()
    if (!creating.isFolder) {
      setContents((current) => ({ ...current, [path]: "" }))
      setTabs((current) => [...current, path])
      setActivePath(path)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const res = await fetch(
      `${treeEndpoint}?path=${encodeURIComponent(deleting.path)}`,
      { method: "DELETE" },
    )
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(json?.error || "Erro ao excluir")
      setDeleting(null)
      return
    }
    // Fecha abas do arquivo/pasta excluídos
    setTabs((current) => {
      const next = current.filter(
        (tab) =>
          tab !== deleting.path && !tab.startsWith(`${deleting.path}/`),
      )
      if (activePath && !next.includes(activePath)) {
        setActivePath(next[next.length - 1] ?? null)
      }
      return next
    })
    setDeleting(null)
    loadTree()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando workspace">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Code2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Workspace
          {readOnly && (
            <span className="text-xs text-muted-foreground">
              (somente leitura)
            </span>
          )}
        </p>
        {!readOnly && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saveState === "saving" && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Salvando…
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" aria-hidden="true" />
                Salvo
              </span>
            )}
            {saveState === "error" && (
              <span className="text-destructive">Erro ao salvar</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row">
        <aside className="max-h-[240px] shrink-0 overflow-y-auto border-b border-border p-2 md:max-h-[60vh] md:w-64 md:border-b-0 md:border-r">
          <FileTree
            entries={entries}
            selectedPath={activePath}
            readOnly={readOnly}
            onSelect={openFile}
            onCreate={(parent, isFolder) => {
              setCreating({ parent, isFolder })
              setNewName("")
            }}
            onDelete={(path, isFolder) => setDeleting({ path, isFolder })}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <FileTabs
            tabs={tabs}
            activePath={activePath}
            onActivate={setActivePath}
            onClose={closeTab}
          />
          <div className="h-[50vh] md:h-[60vh]">
            {activePath != null && contents[activePath] !== undefined ? (
              <CodeEditor
                path={activePath}
                value={contents[activePath]}
                readOnly={readOnly}
                onChange={(value) => handleChange(activePath, value)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
                <Code2 className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-base text-muted-foreground">
                  {entries.length === 0 && !readOnly
                    ? "Crie a estrutura do projeto conforme o documento do Tech Lead."
                    : "Selecione um arquivo para abrir no editor."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(creating)}
        onOpenChange={(open) => {
          if (!open) setCreating(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creating?.isFolder ? "Nova pasta" : "Novo arquivo"}
            </DialogTitle>
            <DialogDescription>
              {creating?.parent
                ? `Dentro de ${creating.parent}/`
                : "Na raiz do projeto"}
              {!creating?.isFolder &&
                " — use a extensão correta (ex.: service.ts)"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={creating?.isFolder ? "controllers" : "app.ts"}
              aria-label="Nome"
              pattern="[\w\-./]+"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreating(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!newName.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deleting?.isFolder ? "pasta" : "arquivo"} {deleting?.path}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.isFolder
                ? "Todos os arquivos dentro dela também serão excluídos."
                : "Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
