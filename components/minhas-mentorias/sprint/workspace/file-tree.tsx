"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderPlus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WorkspaceEntry {
  path: string
  is_folder: boolean
  size?: number
}

interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  children: TreeNode[]
}

/** Monta a árvore a partir dos paths (pastas implícitas incluídas). */
function buildTree(entries: WorkspaceEntry[]): TreeNode[] {
  const root: TreeNode[] = []
  const folders = new Map<string, TreeNode>()

  function ensureFolder(path: string): TreeNode {
    const existing = folders.get(path)
    if (existing) return existing
    const name = path.split("/").pop() || path
    const node: TreeNode = { name, path, isFolder: true, children: [] }
    folders.set(path, node)
    const parentPath = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/"))
      : null
    if (parentPath) {
      ensureFolder(parentPath).children.push(node)
    } else {
      root.push(node)
    }
    return node
  }

  for (const entry of entries) {
    if (entry.is_folder) {
      ensureFolder(entry.path)
      continue
    }
    const name = entry.path.split("/").pop() || entry.path
    const node: TreeNode = {
      name,
      path: entry.path,
      isFolder: false,
      children: [],
    }
    const parentPath = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : null
    if (parentPath) {
      ensureFolder(parentPath).children.push(node)
    } else {
      root.push(node)
    }
  }

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(root)

  return root
}

interface Props {
  entries: WorkspaceEntry[]
  selectedPath: string | null
  readOnly?: boolean
  onSelect: (path: string) => void
  onCreate: (parentPath: string | null, isFolder: boolean) => void
  onDelete: (path: string, isFolder: boolean) => void
}

export function FileTree({
  entries,
  selectedPath,
  readOnly,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const tree = useMemo(() => buildTree(entries), [entries])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  function renderNode(node: TreeNode, depth: number) {
    const isCollapsed = collapsed.has(node.path)
    return (
      <li key={node.path} role="treeitem" aria-expanded={node.isFolder ? !isCollapsed : undefined}>
        <div
          className={`group flex items-center gap-1 rounded-md pr-1 ${
            selectedPath === node.path
              ? "bg-primary/15 text-primary"
              : "hover:bg-secondary/70"
          }`}
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          <button
            type="button"
            className="flex min-h-[36px] flex-1 items-center gap-1.5 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md min-w-0"
            onClick={() =>
              node.isFolder ? toggle(node.path) : onSelect(node.path)
            }
            aria-label={
              node.isFolder
                ? `Pasta ${node.name}${isCollapsed ? " (fechada)" : ""}`
                : `Abrir arquivo ${node.name}`
            }
          >
            {node.isFolder ? (
              <>
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
              </>
            ) : (
              <File className="h-4 w-4 shrink-0 ml-[18px] text-muted-foreground" aria-hidden="true" />
            )}
            <span className="truncate">{node.name}</span>
          </button>

          {!readOnly && (
            <span className="hidden shrink-0 gap-0.5 group-hover:flex group-focus-within:flex">
              {node.isFolder && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onCreate(node.path, false)}
                    aria-label={`Novo arquivo em ${node.name}`}
                  >
                    <FilePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onCreate(node.path, true)}
                    aria-label={`Nova pasta em ${node.name}`}
                  >
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(node.path, node.isFolder)}
                aria-label={`Excluir ${node.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </span>
          )}
        </div>

        {node.isFolder && !isCollapsed && node.children.length > 0 && (
          <ul role="group">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 text-xs"
            onClick={() => onCreate(null, false)}
          >
            <FilePlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Arquivo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 text-xs"
            onClick={() => onCreate(null, true)}
          >
            <FolderPlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Pasta
          </Button>
        </div>
      )}

      {tree.length === 0 ? (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          {readOnly
            ? "Workspace vazio."
            : "Crie seu primeiro arquivo ou pasta."}
        </p>
      ) : (
        <ul role="tree" aria-label="Arquivos do workspace" className="flex flex-col">
          {tree.map((node) => renderNode(node, 0))}
        </ul>
      )}
    </div>
  )
}
