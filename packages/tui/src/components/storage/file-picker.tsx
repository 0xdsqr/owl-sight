// Fuzzy file picker for selecting local files
import { createSignal, createMemo, For, Show, onMount } from "solid-js"
import { Fzf } from "fzf"
import { readdirSync } from "fs"
import { join, dirname } from "path"

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
}

interface FilePickerProps {
  onSelect: (path: string) => void
  onCancel: () => void
  mode: "file" | "directory"
  title?: string
  accentColor?: string
}

function listDir(dirPath: string): FileEntry[] {
  try {
    const dirents = readdirSync(dirPath, { withFileTypes: true })
    return dirents
      .filter(e => !e.name.startsWith(".")) // hide hidden files by default
      .map(e => {
        const fullPath = join(dirPath, e.name)
        let size = 0
        // Use Bun.file() for size - lazy and fast
        try {
          if (!e.isDirectory()) {
            size = Bun.file(fullPath).size
          }
        } catch {}
        return {
          name: e.name,
          path: fullPath,
          isDirectory: e.isDirectory(),
          size,
        }
      })
      .sort((a, b) => {
        // Directories first
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}G`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}M`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${bytes}B`
}

export function FilePicker(props: FilePickerProps) {
  const accent = () => props.accentColor ?? "#58a6ff"
  const homedir = Bun.env.HOME ?? "/tmp"
  
  const [cwd, setCwd] = createSignal(homedir)
  const [query, setQuery] = createSignal("")
  const [selectedIdx, setSelectedIdx] = createSignal(0)
  const [showHidden, setShowHidden] = createSignal(false)
  const [entries, setEntries] = createSignal<FileEntry[]>([])

  // Load directory contents
  const loadDir = (dir: string) => {
    setCwd(dir)
    setEntries(listDir(dir))
    setSelectedIdx(0)
    setQuery("")
  }

  onMount(() => loadDir(cwd()))

  // Filtered entries with fuzzy search
  const filteredEntries = createMemo(() => {
    let list = entries()
    
    // Filter hidden if needed
    if (!showHidden()) {
      list = list.filter(e => !e.name.startsWith("."))
    }
    
    // Filter by mode
    if (props.mode === "file") {
      // Show both files and directories (need dirs to navigate)
    } else {
      // Only directories
      list = list.filter(e => e.isDirectory)
    }
    
    // Fuzzy filter
    const q = query()
    if (q) {
      const fzf = new Fzf(list, { selector: (e) => e.name })
      return fzf.find(q).map(r => r.item)
    }
    
    return list
  })

  const currentEntry = () => filteredEntries()[selectedIdx()]

  // Navigation
  const goUp = () => {
    const parent = dirname(cwd())
    if (parent !== cwd()) {
      loadDir(parent)
    }
  }

  const enter = () => {
    const entry = currentEntry()
    if (!entry) return
    
    if (entry.isDirectory) {
      loadDir(entry.path)
    } else if (props.mode === "file") {
      props.onSelect(entry.path)
    }
  }

  const select = () => {
    const entry = currentEntry()
    if (!entry) return
    
    if (props.mode === "directory" && entry.isDirectory) {
      props.onSelect(entry.path)
    } else if (props.mode === "file" && !entry.isDirectory) {
      props.onSelect(entry.path)
    }
  }

  // Colors
  const colors = {
    bg: "#161b22",
    bgAlt: "#21262d",
    border: "#30363d",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    textDim: "#484f58",
    blue: "#58a6ff",
  }

  return (
    <box
      position="absolute"
      left="50%"
      top="50%"
      marginLeft={-32}
      marginTop={-12}
      width={64}
      height={24}
      backgroundColor={colors.bg}
      border
      borderStyle="rounded"
      borderColor={accent()}
      flexDirection="column"
    >
      {/* Header */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt}>
        <text style={{ fg: accent() }}><b>{props.title ?? "Select File"}</b></text>
        <box flexGrow={1} />
        <text style={{ fg: colors.textDim }}>
          <span style={{ fg: colors.textMuted }}>.</span> toggle hidden
        </text>
      </box>

      {/* Current path */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt} borderColor={colors.border} border={["bottom"]}>
        <text style={{ fg: colors.textMuted }}>{cwd()}</text>
      </box>

      {/* Search input */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt}>
        <text style={{ fg: colors.textMuted }}>/</text>
        <text style={{ fg: colors.text }}>{query()}</text>
        <text style={{ fg: accent() }}>_</text>
      </box>

      {/* File list */}
      <scrollbox scrollbarOptions={{ visible: true }} flexGrow={1} contentOptions={{ gap: 0 }}>
        {/* Parent directory */}
        <box height={1} paddingLeft={1} paddingRight={1}>
          <text style={{ fg: colors.blue }}>..</text>
        </box>
        
        <For each={filteredEntries()}>
          {(entry, i) => {
            const isSel = () => i() === selectedIdx()
            return (
              <box
                height={1}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isSel() ? colors.bgAlt : "transparent"}
                flexDirection="row"
              >
                <text width={2} style={{ fg: entry.isDirectory ? colors.blue : colors.textDim }}>
                  {entry.isDirectory ? "/" : " "}
                </text>
                <text style={{ fg: isSel() ? colors.text : colors.textMuted }} flexGrow={1}>
                  {entry.name.length > 45 ? entry.name.slice(0, 43) + ".." : entry.name}
                </text>
                <text width={8} style={{ fg: colors.textDim }}>
                  {entry.isDirectory ? "" : formatSize(entry.size)}
                </text>
              </box>
            )
          }}
        </For>
      </scrollbox>

      {/* Footer */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt} borderColor={colors.border} border={["top"]}>
        <text style={{ fg: colors.textDim }}>
          <span style={{ fg: colors.textMuted }}>j/k</span> nav
          {" "}
          <span style={{ fg: colors.textMuted }}>Enter</span> {props.mode === "file" ? "open/select" : "enter/select"}
          {" "}
          <span style={{ fg: colors.textMuted }}>h</span> up
          {" "}
          <span style={{ fg: colors.textMuted }}>Esc</span> cancel
        </text>
      </box>
    </box>
  )
}

// Hook for keyboard handling - to be called from parent
export function useFilePickerKeys(
  query: () => string,
  setQuery: (fn: (q: string) => string) => void,
  selectedIdx: () => number,
  setSelectedIdx: (fn: (i: number) => number) => void,
  maxIdx: () => number,
  showHidden: () => boolean,
  setShowHidden: (fn: (h: boolean) => boolean) => void,
  enter: () => void,
  goUp: () => void,
  onCancel: () => void
) {
  return (key: { name?: string; raw?: string; ctrl?: boolean }) => {
    if (key.name === "escape") {
      onCancel()
      return true
    }
    if (key.name === "return") {
      enter()
      return true
    }
    if (key.name === "up" || key.raw === "k") {
      setSelectedIdx(i => Math.max(0, i - 1))
      return true
    }
    if (key.name === "down" || key.raw === "j") {
      setSelectedIdx(i => Math.min(maxIdx(), i + 1))
      return true
    }
    if (key.raw === "h" || key.name === "backspace") {
      if (query() === "") {
        goUp()
      } else {
        setQuery(q => q.slice(0, -1))
      }
      return true
    }
    if (key.raw === ".") {
      setShowHidden(h => !h)
      return true
    }
    if (key.raw && key.raw.length === 1 && !key.ctrl && key.raw !== "." ) {
      setQuery(q => q + key.raw)
      return true
    }
    return false
  }
}
