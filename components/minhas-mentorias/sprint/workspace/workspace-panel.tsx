"use client"

import { useState } from "react"
import { Check, Code2, Loader2 } from "lucide-react"
import { CodeEditor } from "./code-editor"
import { FileTabs } from "./file-tabs"
import { FileTree } from "./file-tree"
import { useSprintWorkspace } from "./use-sprint-workspace"
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

interface Props {
  /** GET árvore; POST criar; DELETE ?path= (ignorados quando readOnly) */
  treeEndpoint: string
  /** GET ?path= conteúdo; PUT salvar */
  fileEndpoint: string
  readOnly?: boolean
}

/**
 * Workspace estilo IDE: árvore de arquivos + abas + Monaco.
 * A lógica de arquivos/save vive em `useSprintWorkspace` (compartilhada com a
 * IDE de execução de task). Aqui ficam só o layout em card e os diálogos.
 */
export function WorkspacePanel({ treeEndpoint, fileEndpoint, readOnly }: Props) {
  const ws = useSprintWorkspace({ treeEndpoint, fileEndpoint, readOnly })
  const [creating, setCreating] = useState<{
    parent: string | null
    isFolder: boolean
  } | null>(null)
  const [newName, setNewName] = useState("")
  const [deleting, setDeleting] = useState<{
    path: string
    isFolder: boolean
  } | null>(null)

  async function handleCreate() {
    if (!creating || !newName.trim()) return
    const ok = await ws.createEntry(creating.parent, newName.trim(), creating.isFolder)
    if (ok) {
      setCreating(null)
      setNewName("")
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const ok = await ws.deleteEntry(deleting.path)
    if (ok) setDeleting(null)
  }

  if (ws.loading) {
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
            {ws.saveState === "saving" && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Salvando…
              </span>
            )}
            {ws.saveState === "saved" && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" aria-hidden="true" />
                Salvo
              </span>
            )}
            {ws.saveState === "error" && (
              <span className="text-destructive">Erro ao salvar</span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row">
        <aside className="max-h-[240px] shrink-0 overflow-y-auto border-b border-border p-2 md:max-h-[60vh] md:w-64 md:border-b-0 md:border-r">
          <FileTree
            entries={ws.entries}
            selectedPath={ws.activePath}
            readOnly={readOnly}
            onSelect={ws.openFile}
            onCreate={(parent, isFolder) => {
              setCreating({ parent, isFolder })
              setNewName("")
            }}
            onDelete={(path, isFolder) => setDeleting({ path, isFolder })}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <FileTabs
            tabs={ws.tabs}
            activePath={ws.activePath}
            onActivate={ws.setActivePath}
            onClose={ws.closeTab}
          />
          <div className="h-[50vh] md:h-[60vh]">
            {ws.activePath != null && ws.contents[ws.activePath] !== undefined ? (
              <CodeEditor
                path={ws.activePath}
                value={ws.contents[ws.activePath]}
                readOnly={readOnly}
                onChange={(value) => ws.handleChange(ws.activePath!, value)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
                <Code2 className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-base text-muted-foreground">
                  {ws.entries.length === 0 && !readOnly
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
