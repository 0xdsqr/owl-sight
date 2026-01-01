// Shared storage browser component for S3 and R2
// Based on ranger/lf UX patterns

import { createSignal, createMemo, For, Show, onMount, type JSX } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { Fzf } from "fzf"
import { readdirSync } from "fs"
import { join, dirname } from "path"
import {
  createStorageClient,
  listBuckets,
  listObjects,
  deleteObjects,
  uploadObject,
  downloadObject,
  createFolder,
  deleteFolder,
  createBucket,
  getFileName,
  getParentPrefix,
  formatBytes,
  type StorageObject,
  type BucketInfo,
  type StorageConfig,
} from "../../providers/storage/s3-client"
import type { S3Client } from "@aws-sdk/client-s3"

// Types
type ViewMode = "buckets" | "objects"
type ModalType = "none" | "delete" | "upload" | "download" | "newfolder" | "newbucket" | "help" | "error" | "filepicker"
type SortMode = "name" | "size" | "date"

interface StorageBrowserProps {
  provider: "s3" | "r2"
  // S3 config
  profile?: string
  region?: string
  // R2 config  
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  // R2 bucket list (from Cloudflare API)
  bucketList?: Array<{ name: string; size?: number; objectCount?: number }>
  // Colors
  accentColor?: string
}

// Relative time formatting
function relativeTime(date?: Date): string {
  if (!date) return "--"
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return date.toLocaleDateString()
}

export function StorageBrowser(props: StorageBrowserProps) {
  const accent = () => props.accentColor ?? (props.provider === "r2" ? "#f38020" : "#ff9900")
  
  // State
  const [view, setView] = createSignal<ViewMode>("buckets")
  const [bucketIdx, setBucketIdx] = createSignal(0)
  const [objectIdx, setObjectIdx] = createSignal(0)
  const [prefix, setPrefix] = createSignal("")
  const [sort, setSort] = createSignal<SortMode>("name")
  const [filter, setFilter] = createSignal("")
  const [isFiltering, setIsFiltering] = createSignal(false)
  
  // Data
  const [buckets, setBuckets] = createSignal<BucketInfo[]>([])
  const [objects, setObjects] = createSignal<StorageObject[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  
  // Operations
  const [modal, setModal] = createSignal<ModalType>("none")
  const [modalInput, setModalInput] = createSignal("")
  const [status, setStatus] = createSignal<string | null>(null)
  const [selected, setSelected] = createSignal<Set<string>>(new Set())
  
  // Client
  const [client, setClient] = createSignal<S3Client | null>(null)
  const [needsCreds, setNeedsCreds] = createSignal(false)

  // File picker state - use Bun.env.HOME for homedir
  const homedir = Bun.env.HOME ?? "/tmp"
  const [pickerCwd, setPickerCwd] = createSignal(homedir)
  const [pickerQuery, setPickerQuery] = createSignal("")
  const [pickerIdx, setPickerIdx] = createSignal(0)
  const [pickerShowHidden, setPickerShowHidden] = createSignal(false)
  const [pickerEntries, setPickerEntries] = createSignal<Array<{name: string, path: string, isDir: boolean, size: number}>>([])

  // Load directory for file picker using Bun-optimized fs
  const loadPickerDir = (dir: string) => {
    try {
      const dirents = readdirSync(dir, { withFileTypes: true })
      const entries = dirents
        .filter(e => pickerShowHidden() || !e.name.startsWith("."))
        .map(e => {
          const fullPath = join(dir, e.name)
          let size = 0
          // Use Bun.file() for size - it's lazy and fast
          try { if (!e.isDirectory()) size = Bun.file(fullPath).size } catch {}
          return { name: e.name, path: fullPath, isDir: e.isDirectory(), size }
        })
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      setPickerCwd(dir)
      setPickerEntries(entries)
      setPickerIdx(0)
      setPickerQuery("")
    } catch {}
  }

  // Filtered picker entries
  const filteredPickerEntries = createMemo(() => {
    let list = pickerEntries()
    const q = pickerQuery()
    if (q) {
      const fzf = new Fzf(list, { selector: e => e.name })
      return fzf.find(q).map(r => r.item)
    }
    return list
  })

  const currentPickerEntry = () => filteredPickerEntries()[pickerIdx()]

  // Initialize
  onMount(async () => {
    // For R2, check if we have S3 API credentials
    if (props.provider === "r2") {
      if (!props.accessKeyId || !props.secretAccessKey) {
        setNeedsCreds(true)
        // Still populate bucket list from props if available
        if (props.bucketList) {
          setBuckets(props.bucketList.map(b => ({ name: b.name, creationDate: undefined })))
        }
        return
      }
      try {
        const cfg: StorageConfig = {
          type: "r2",
          accountId: props.accountId,
          accessKeyId: props.accessKeyId,
          secretAccessKey: props.secretAccessKey,
        }
        setClient(createStorageClient(cfg))
        if (props.bucketList) {
          setBuckets(props.bucketList.map(b => ({ name: b.name, creationDate: undefined })))
        }
      } catch (e) {
        setError(`Failed to init: ${e}`)
      }
    } else {
      // S3
      try {
        const cfg: StorageConfig = {
          type: "s3",
          profile: props.profile,
          region: props.region,
        }
        const c = createStorageClient(cfg)
        setClient(c)
        setLoading(true)
        const list = await listBuckets(c)
        setBuckets(list)
        setLoading(false)
      } catch (e) {
        setError(`Failed to init: ${e}`)
        setLoading(false)
      }
    }
  })

  // Sorted/filtered buckets
  const filteredBuckets = createMemo(() => {
    let list = [...buckets()]
    const f = filter().toLowerCase()
    if (f) list = list.filter(b => b.name.toLowerCase().includes(f))
    
    const s = sort()
    if (s === "name") list.sort((a, b) => a.name.localeCompare(b.name))
    else if (s === "date") list.sort((a, b) => (b.creationDate?.getTime() ?? 0) - (a.creationDate?.getTime() ?? 0))
    return list
  })

  // Sorted/filtered objects
  const filteredObjects = createMemo(() => {
    let list = [...objects()]
    const f = filter().toLowerCase()
    if (f) list = list.filter(o => getFileName(o.key).toLowerCase().includes(f))
    
    // Directories first
    list.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      const s = sort()
      if (s === "name") return getFileName(a.key).localeCompare(getFileName(b.key))
      if (s === "size") return b.size - a.size
      if (s === "date") return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
      return 0
    })
    return list
  })

  const currentBucket = () => filteredBuckets()[bucketIdx()]
  const currentObject = () => filteredObjects()[objectIdx()]

  // Load objects
  const loadObjects = async () => {
    const c = client()
    const b = currentBucket()
    if (!c || !b) return

    setLoading(true)
    setError(null)
    try {
      const result = await listObjects(c, b.name, prefix())
      setObjects(result.objects.filter(o => o.key !== prefix()))
      setObjectIdx(0)
      setSelected(new Set<string>())
    } catch (e) {
      setError(`Load failed: ${e}`)
      setObjects([])
    }
    setLoading(false)
  }

  // Navigation
  const enter = () => {
    if (view() === "buckets") {
      if (needsCreds()) {
        setModal("error")
        return
      }
      if (!currentBucket()) return
      setView("objects")
      setPrefix("")
      setFilter("")
      loadObjects()
    } else {
      const obj = currentObject()
      if (obj?.isDirectory) {
        setPrefix(obj.key)
        setFilter("")
        loadObjects()
      }
    }
  }

  const back = () => {
    if (view() === "objects") {
      const p = prefix()
      if (!p) {
        setView("buckets")
        setObjects([])
        setFilter("")
      } else {
        setPrefix(getParentPrefix(p))
        setFilter("")
        loadObjects()
      }
    }
  }

  // Selection
  const toggleSelect = () => {
    const obj = currentObject()
    if (!obj) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(obj.key) ? next.delete(obj.key) : next.add(obj.key)
      return next
    })
  }

  const selectAll = () => {
    const objs = filteredObjects()
    setSelected(prev => prev.size === objs.length ? new Set<string>() : new Set<string>(objs.map(o => o.key)))
  }

  // Operations
  const doDelete = async () => {
    const c = client()
    const b = currentBucket()
    if (!c || !b) return

    const keys = selected().size > 0 ? Array.from(selected()) : currentObject() ? [currentObject()!.key] : []
    if (!keys.length) return

    setModal("none")
    setStatus(`Deleting ${keys.length} item(s)...`)

    try {
      const dirs = keys.filter(k => k.endsWith("/"))
      const files = keys.filter(k => !k.endsWith("/"))
      await Promise.all(dirs.map(d => deleteFolder(c, b.name, d)))
      if (files.length) await deleteObjects(c, b.name, files)
      setStatus(`Deleted ${keys.length} item(s)`)
      setSelected(new Set<string>())
      await loadObjects()
    } catch (e) {
      setStatus(`Delete failed: ${e}`)
    }
    setTimeout(() => setStatus(null), 3000)
  }

  const doUpload = async () => {
    const c = client()
    const b = currentBucket()
    const filePath = modalInput().trim()
    if (!c || !b || !filePath) return

    setModal("none")
    const name = filePath.split("/").pop() ?? filePath
    setStatus(`Uploading ${name}...`)

    try {
      await uploadObject(c, b.name, prefix() + name, filePath)
      setStatus(`Uploaded ${name}`)
      await loadObjects()
    } catch (e) {
      setStatus(`Upload failed: ${e}`)
    }
    setModalInput("")
    setTimeout(() => setStatus(null), 3000)
  }

  // Upload from file picker
  const doUploadFile = async (filePath: string) => {
    const c = client()
    const b = currentBucket()
    if (!c || !b || !filePath) return

    setModal("none")
    const name = filePath.split("/").pop() ?? filePath
    setStatus(`Uploading ${name}...`)

    try {
      await uploadObject(c, b.name, prefix() + name, filePath)
      setStatus(`Uploaded ${name}`)
      await loadObjects()
    } catch (e) {
      setStatus(`Upload failed: ${e}`)
    }
    setPickerQuery("")
    setTimeout(() => setStatus(null), 3000)
  }

  const doDownload = async () => {
    const c = client()
    const b = currentBucket()
    const obj = currentObject()
    const dest = modalInput().trim()
    if (!c || !b || !obj || obj.isDirectory || !dest) return

    setModal("none")
    const name = getFileName(obj.key)
    setStatus(`Downloading ${name}...`)

    try {
      const finalPath = dest.endsWith("/") ? dest + name : dest
      await downloadObject(c, b.name, obj.key, finalPath)
      setStatus(`Saved to ${finalPath}`)
    } catch (e) {
      setStatus(`Download failed: ${e}`)
    }
    setModalInput("")
    setTimeout(() => setStatus(null), 3000)
  }

  const doNewFolder = async () => {
    const c = client()
    const b = currentBucket()
    const name = modalInput().trim()
    if (!c || !b || !name) return

    setModal("none")
    setStatus(`Creating ${name}/...`)

    try {
      await createFolder(c, b.name, prefix() + name)
      setStatus(`Created ${name}/`)
      await loadObjects()
    } catch (e) {
      setStatus(`Failed: ${e}`)
    }
    setModalInput("")
    setTimeout(() => setStatus(null), 3000)
  }

  const doNewBucket = async () => {
    const c = client()
    const name = modalInput().trim()
    if (!c || !name) return

    setModal("none")
    setStatus(`Creating bucket ${name}...`)

    try {
      await createBucket(c, name, props.region)
      setStatus(`Created bucket ${name}`)
      // Reload bucket list
      const list = await listBuckets(c)
      setBuckets(list)
    } catch (e) {
      setStatus(`Failed: ${e}`)
    }
    setModalInput("")
    setTimeout(() => setStatus(null), 3000)
  }

  const copyPath = () => {
    const b = currentBucket()
    if (!b) return
    const path = view() === "buckets" 
      ? `${props.provider}://${b.name}`
      : `${props.provider}://${b.name}/${currentObject()?.key ?? prefix()}`
    // Note: clipboard access in TUI is limited, show in status instead
    setStatus(`Path: ${path}`)
    setTimeout(() => setStatus(null), 5000)
  }

  // Keyboard
  useKeyboard((key) => {
    // Filter mode
    if (isFiltering()) {
      if (key.name === "escape" || key.name === "return") {
        setIsFiltering(false)
        return
      }
      if (key.name === "backspace") {
        setFilter(f => f.slice(0, -1))
        return
      }
      if (key.raw?.length === 1 && !key.ctrl) {
        setFilter(f => f + key.raw)
        return
      }
      return
    }

    // Modal input
    if (["upload", "download", "newfolder", "newbucket"].includes(modal())) {
      if (key.name === "escape") { setModal("none"); setModalInput(""); return }
      if (key.name === "return") {
        if (modal() === "upload") doUpload()
        else if (modal() === "download") doDownload()
        else if (modal() === "newfolder") doNewFolder()
        else if (modal() === "newbucket") doNewBucket()
        return
      }
      if (key.name === "backspace") { setModalInput(v => v.slice(0, -1)); return }
      if (key.raw?.length === 1 && !key.ctrl) { setModalInput(v => v + key.raw); return }
      return
    }

    // Delete confirm
    if (modal() === "delete") {
      if (key.raw === "y" || key.raw === "Y") doDelete()
      else if (key.raw === "n" || key.name === "escape") setModal("none")
      return
    }

    // Help/error modal
    if (modal() === "help" || modal() === "error") {
      if (key.name === "escape" || key.name === "return" || key.raw === "?") setModal("none")
      return
    }

    // File picker modal
    if (modal() === "filepicker") {
      const entries = filteredPickerEntries()
      const max = entries.length - 1

      if (key.name === "escape") {
        setModal("none")
        setPickerQuery("")
        return
      }
      if (key.name === "up" || key.raw === "k") {
        setPickerIdx(i => Math.max(0, i - 1))
        return
      }
      if (key.name === "down" || key.raw === "j") {
        setPickerIdx(i => Math.min(max, i + 1))
        return
      }
      if (key.raw === "g") {
        setPickerIdx(0)
        return
      }
      if (key.raw === "G") {
        setPickerIdx(max)
        return
      }
      if (key.name === "return" || key.raw === "l") {
        const entry = currentPickerEntry()
        if (entry) {
          if (entry.isDir) {
            loadPickerDir(entry.path)
          } else {
            // Select file for upload
            doUploadFile(entry.path)
          }
        }
        return
      }
      if (key.raw === "h") {
        // Go to parent directory
        const parent = dirname(pickerCwd())
        if (parent !== pickerCwd()) {
          loadPickerDir(parent)
        }
        return
      }
      if (key.name === "backspace") {
        if (pickerQuery()) {
          setPickerQuery(q => q.slice(0, -1))
        } else {
          // Go up if no query
          const parent = dirname(pickerCwd())
          if (parent !== pickerCwd()) {
            loadPickerDir(parent)
          }
        }
        return
      }
      if (key.raw === ".") {
        setPickerShowHidden(h => !h)
        loadPickerDir(pickerCwd()) // Reload with new setting
        return
      }
      // Typing adds to fuzzy query
      if (key.raw && key.raw.length === 1 && !key.ctrl) {
        setPickerQuery(q => q + key.raw)
        setPickerIdx(0) // Reset selection when typing
        return
      }
      return
    }

    const items = view() === "buckets" ? filteredBuckets() : filteredObjects()
    const idx = view() === "buckets" ? bucketIdx : objectIdx
    const setIdx = view() === "buckets" ? setBucketIdx : setObjectIdx
    const max = items.length - 1

    // Navigation (vim + arrows)
    if (key.name === "up" || key.raw === "k") setIdx(i => Math.max(0, i - 1))
    else if (key.name === "down" || key.raw === "j") setIdx(i => Math.min(max, i + 1))
    else if (key.raw === "g") setIdx(0) // top
    else if (key.raw === "G") setIdx(max) // bottom
    else if (key.name === "return" || key.raw === "l") enter()
    else if (key.name === "backspace" || key.raw === "h") back()
    else if (key.name === "escape") {
      if (filter()) setFilter("")
      else back()
    }
    // Sort
    else if (key.raw === "s") setSort(s => s === "name" ? "size" : s === "size" ? "date" : "name")
    // Filter
    else if (key.raw === "/") { setIsFiltering(true); setFilter("") }
    // Selection (only in objects view)
    else if (key.raw === " " && view() === "objects") toggleSelect()
    else if (key.raw === "a" && key.ctrl && view() === "objects") selectAll()
    // Operations
    else if ((key.raw === "d" || key.raw === "x") && view() === "objects") {
      if (selected().size > 0 || currentObject()) setModal("delete")
    }
    else if (key.raw === "u" && view() === "objects") { setModal("filepicker"); loadPickerDir(homedir) }
    else if (key.raw === "o" && view() === "objects" && currentObject() && !currentObject()!.isDirectory) {
      setModal("download"); setModalInput("")
    }
    else if (key.raw === "n" && view() === "objects") { setModal("newfolder"); setModalInput("") }
    else if (key.raw === "N" && view() === "buckets" && !needsCreds()) { setModal("newbucket"); setModalInput("") }
    else if (key.raw === "c") copyPath()
    else if (key.raw === "R") view() === "objects" ? loadObjects() : null
    else if (key.raw === "?") setModal("help")
  })

  // Breadcrumb
  const breadcrumb = () => {
    const b = currentBucket()
    if (!b) return props.provider.toUpperCase()
    const p = prefix()
    return p ? `${b.name}/${p}` : b.name
  }

  // UI colors
  const colors = {
    bg: "#0d1117",
    bgAlt: "#161b22", 
    bgHover: "#21262d",
    border: "#30363d",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    textDim: "#484f58",
    blue: "#58a6ff",
    green: "#7ee787",
    red: "#f85149",
    yellow: "#d29922",
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box height={1} backgroundColor={colors.bgAlt} paddingLeft={1} paddingRight={1} flexDirection="row" alignItems="center" gap={1}>
        <text style={{ fg: accent() }}>{breadcrumb()}</text>
        <box flexGrow={1} />
        <Show when={isFiltering() || filter()}>
          <text style={{ fg: colors.yellow }}>/{filter()}{isFiltering() ? "_" : ""}</text>
        </Show>
        <Show when={loading()}>
          <text style={{ fg: colors.blue }}>Loading...</text>
        </Show>
        <Show when={!loading() && view() === "objects"}>
          <text style={{ fg: colors.textMuted }}>{filteredObjects().length} items</text>
        </Show>
        <text style={{ fg: colors.textDim }}>sort:{sort()}</text>
        <text style={{ fg: colors.textDim }}>?:help</text>
      </box>

      {/* Status bar */}
      <Show when={status() || error()}>
        <box height={1} backgroundColor={colors.bgHover} paddingLeft={1}>
          <text style={{ fg: error() ? colors.red : colors.blue }}>{status() ?? error()}</text>
        </box>
      </Show>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} marginTop={1}>
        {/* List panel */}
        <box border borderStyle="rounded" borderColor={colors.border} flexDirection="column" flexGrow={1}>
          {/* Column headers */}
          <box flexDirection="row" backgroundColor={colors.bgHover} paddingLeft={1} paddingRight={1} height={1}>
            <Show when={view() === "objects"}>
              <text width={2} style={{ fg: colors.textMuted }}></text>
            </Show>
            <text width={view() === "buckets" ? 50 : 36} style={{ fg: colors.textMuted }}>Name</text>
            <Show when={view() === "objects"}>
              <text width={10} style={{ fg: colors.textMuted }}>Size</text>
            </Show>
            <text width={12} style={{ fg: colors.textMuted }}>{view() === "buckets" ? "Created" : "Modified"}</text>
          </box>

          {/* Content */}
          <Show when={view() === "buckets"}>
            <Show when={filteredBuckets().length > 0} fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: colors.textDim }}>{loading() ? "Loading..." : "No buckets"}</text>
              </box>
            }>
              <scrollbox scrollbarOptions={{ visible: true }} flexGrow={1} contentOptions={{ gap: 0 }}>
                <For each={filteredBuckets()}>
                  {(bucket, i) => {
                    const isSel = () => i() === bucketIdx()
                    return (
                      <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1} 
                           backgroundColor={isSel() ? colors.bgHover : "transparent"}>
                        <text width={50} style={{ fg: isSel() ? accent() : colors.text }}>
                          {isSel() ? "> " : "  "}{bucket.name.slice(0, 46)}
                        </text>
                        <text width={12} style={{ fg: colors.textDim }}>{relativeTime(bucket.creationDate)}</text>
                      </box>
                    )
                  }}
                </For>
              </scrollbox>
            </Show>
          </Show>

          <Show when={view() === "objects"}>
            <scrollbox scrollbarOptions={{ visible: true }} flexGrow={1} contentOptions={{ gap: 0 }}>
              {/* Parent dir */}
              <Show when={prefix()}>
                <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}>
                  <text width={2} style={{ fg: colors.textDim }}></text>
                  <text width={36} style={{ fg: colors.blue }}>..</text>
                  <text width={10} style={{ fg: colors.textDim }}>--</text>
                  <text width={12} style={{ fg: colors.textDim }}>--</text>
                </box>
              </Show>
              <For each={filteredObjects()}>
                {(obj, i) => {
                  const isSel = () => i() === objectIdx()
                  const isChk = () => selected().has(obj.key)
                  const name = getFileName(obj.key)
                  return (
                    <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}
                         backgroundColor={isSel() ? colors.bgHover : "transparent"}>
                      <text width={2} style={{ fg: isChk() ? colors.green : colors.textDim }}>
                        {isChk() ? "*" : " "}
                      </text>
                      <text width={36} style={{ fg: isSel() ? colors.text : colors.textMuted }}>
                        <Show when={obj.isDirectory}><span style={{ fg: colors.blue }}>/</span></Show>
                        {name.slice(0, obj.isDirectory ? 33 : 34)}
                      </text>
                      <text width={10} style={{ fg: obj.isDirectory ? colors.textDim : colors.blue }}>
                        {obj.isDirectory ? "--" : formatBytes(obj.size)}
                      </text>
                      <text width={12} style={{ fg: colors.textDim }}>{relativeTime(obj.lastModified)}</text>
                    </box>
                  )
                }}
              </For>
            </scrollbox>
          </Show>
        </box>

        {/* Details panel */}
        <box border borderStyle="rounded" borderColor={colors.border} width={26} flexDirection="column" marginLeft={1}>
          <box padding={1} flexDirection="column" gap={0}>
            <Show when={view() === "buckets"}>
              <Show when={currentBucket()}>
                <text style={{ fg: accent() }}><b>{currentBucket()!.name}</b></text>
                <text style={{ fg: colors.textMuted }} marginTop={1}>Created</text>
                <text style={{ fg: colors.text }}>{relativeTime(currentBucket()!.creationDate)}</text>
              </Show>
              <text style={{ fg: colors.text }} marginTop={1}><b>Keys</b></text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>j/k</span> navigate</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>Enter</span> browse</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.green }}>N</span> new bucket</text>
              <Show when={needsCreds()}>
                <box marginTop={1} padding={1} backgroundColor={colors.bgAlt} border borderColor={colors.yellow}>
                  <text style={{ fg: colors.yellow }}>S3 keys needed</text>
                </box>
              </Show>
            </Show>

            <Show when={view() === "objects"}>
              <text style={{ fg: colors.text }}><b>Keys</b></text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>j/k</span> navigate</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>g/G</span> top/bottom</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>l/h</span> enter/back</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.blue }}>/</span> filter</text>
              <text style={{ fg: colors.textMuted }} marginTop={1}><span style={{ fg: colors.green }}>u</span> upload</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.green }}>o</span> download</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.green }}>n</span> new folder</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.red }}>d/x</span> delete</text>
              <text style={{ fg: colors.textMuted }}><span style={{ fg: colors.textDim }}>c</span> copy path</text>
              <Show when={selected().size > 0}>
                <box marginTop={1} padding={1} backgroundColor={colors.bgHover} border borderColor={colors.blue}>
                  <text style={{ fg: colors.blue }}>{selected().size} selected</text>
                </box>
              </Show>
            </Show>
          </box>
        </box>
      </box>

      {/* Footer */}
      <box height={1} paddingLeft={1} flexDirection="row" gap={2}>
        <Show when={view() === "buckets"}>
          <text style={{ fg: colors.textDim }}><span style={{ fg: accent() }}>{filteredBuckets().length}</span> buckets</text>
        </Show>
        <Show when={view() === "objects"}>
          <text style={{ fg: colors.textDim }}><span style={{ fg: colors.blue }}>{filteredObjects().length}</span> items</text>
          <Show when={selected().size > 0}>
            <text style={{ fg: colors.textDim }}><span style={{ fg: colors.green }}>{selected().size}</span> selected</text>
          </Show>
        </Show>
      </box>

      {/* Modals */}
      <Show when={modal() === "delete"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-16} marginTop={-3} width={32} height={6}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={colors.red} padding={1}>
          <text style={{ fg: colors.red }}><b>Delete {selected().size || 1} item(s)?</b></text>
          <text style={{ fg: colors.textMuted }}>Cannot be undone.</text>
          <box flexDirection="row" gap={2} marginTop={1}>
            <text><span style={{ fg: colors.green }}>y</span> yes</text>
            <text><span style={{ fg: colors.red }}>n</span> no</text>
          </box>
        </box>
      </Show>

      <Show when={modal() === "upload"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-20} marginTop={-3} width={40} height={6}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={colors.blue} padding={1}>
          <text style={{ fg: colors.blue }}><b>Upload</b></text>
          <box backgroundColor={colors.bgHover} paddingLeft={1} height={1} marginTop={1}>
            <text style={{ fg: colors.text }}>{modalInput()}<span style={{ fg: colors.blue }}>_</span></text>
          </box>
          <text style={{ fg: colors.textDim }}>Enter path, press Enter</text>
        </box>
      </Show>

      <Show when={modal() === "download"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-20} marginTop={-3} width={40} height={6}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={colors.green} padding={1}>
          <text style={{ fg: colors.green }}><b>Download to</b></text>
          <box backgroundColor={colors.bgHover} paddingLeft={1} height={1} marginTop={1}>
            <text style={{ fg: colors.text }}>{modalInput()}<span style={{ fg: colors.blue }}>_</span></text>
          </box>
          <text style={{ fg: colors.textDim }}>Enter path, press Enter</text>
        </box>
      </Show>

      <Show when={modal() === "newfolder"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-20} marginTop={-3} width={40} height={6}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={accent()} padding={1}>
          <text style={{ fg: accent() }}><b>New folder</b></text>
          <box backgroundColor={colors.bgHover} paddingLeft={1} height={1} marginTop={1}>
            <text style={{ fg: colors.text }}>{modalInput()}<span style={{ fg: colors.blue }}>_</span></text>
          </box>
          <text style={{ fg: colors.textDim }}>Enter name, press Enter</text>
        </box>
      </Show>

      <Show when={modal() === "newbucket"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-22} marginTop={-3} width={44} height={6}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={accent()} padding={1}>
          <text style={{ fg: accent() }}><b>New bucket</b></text>
          <box backgroundColor={colors.bgHover} paddingLeft={1} height={1} marginTop={1}>
            <text style={{ fg: colors.text }}>{modalInput()}<span style={{ fg: colors.blue }}>_</span></text>
          </box>
          <text style={{ fg: colors.textDim }}>Enter bucket name, press Enter</text>
        </box>
      </Show>

      <Show when={modal() === "error"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-26} marginTop={-6} width={52} height={12}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={colors.yellow} padding={1}>
          <text style={{ fg: colors.yellow }}><b>R2 S3 API Credentials Required</b></text>
          <text style={{ fg: colors.textMuted }} marginTop={1}>To browse objects, set these env vars:</text>
          <text style={{ fg: colors.blue }} marginTop={1}>export R2_ACCESS_KEY_ID="..."</text>
          <text style={{ fg: colors.blue }}>export R2_SECRET_ACCESS_KEY="..."</text>
          <text style={{ fg: colors.textMuted }} marginTop={1}>Get them from: Cloudflare Dashboard</text>
          <text style={{ fg: colors.textMuted }}> {">"} R2 {">"} Manage R2 API Tokens</text>
          <text style={{ fg: colors.textDim }} marginTop={1}>Press Esc to close</text>
        </box>
      </Show>

      <Show when={modal() === "help"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-24} marginTop={-9} width={48} height={18}
             backgroundColor={colors.bgAlt} border borderStyle="rounded" borderColor={colors.blue} padding={1}>
          <text style={{ fg: accent() }}><b>Storage Browser</b></text>
          <text style={{ fg: colors.text }} marginTop={1}>Navigation</text>
          <text style={{ fg: colors.textMuted }}>  j/k, arrows   up/down</text>
          <text style={{ fg: colors.textMuted }}>  g/G           top/bottom</text>
          <text style={{ fg: colors.textMuted }}>  l, Enter      enter folder/bucket</text>
          <text style={{ fg: colors.textMuted }}>  h, Backspace  go back</text>
          <text style={{ fg: colors.textMuted }}>  /             filter</text>
          <text style={{ fg: colors.textMuted }}>  s             cycle sort</text>
          <text style={{ fg: colors.text }} marginTop={1}>Operations</text>
          <text style={{ fg: colors.textMuted }}>  Space         toggle select</text>
          <text style={{ fg: colors.textMuted }}>  u/o/n/d       upload/download/new/delete</text>
          <text style={{ fg: colors.textMuted }}>  N             new bucket (in bucket list)</text>
          <text style={{ fg: colors.textMuted }}>  c             copy path</text>
          <text style={{ fg: colors.textMuted }}>  R             refresh</text>
          <text style={{ fg: colors.textDim }} marginTop={1}>Press Esc to close</text>
        </box>
      </Show>

      <Show when={modal() === "filepicker"}>
        <box position="absolute" left="50%" top="50%" marginLeft={-32} marginTop={-12} width={64} height={24}
             backgroundColor={colors.bg} border borderStyle="rounded" borderColor={accent()} flexDirection="column">
          {/* Header */}
          <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt} flexDirection="row">
            <text style={{ fg: accent() }}><b>Upload File</b></text>
            <box flexGrow={1} />
            <text style={{ fg: colors.textDim }}>
              <span style={{ fg: colors.textMuted }}>.</span> hidden
            </text>
          </box>

          {/* Current path */}
          <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgHover}>
            <text style={{ fg: colors.textMuted }}>{pickerCwd()}</text>
          </box>

          {/* Search input */}
          <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt}>
            <text style={{ fg: colors.yellow }}>/</text>
            <text style={{ fg: colors.text }}>{pickerQuery()}</text>
            <text style={{ fg: accent() }}>_</text>
          </box>

          {/* File list */}
          <scrollbox scrollbarOptions={{ visible: true }} flexGrow={1} contentOptions={{ gap: 0 }}>
            {/* Parent directory */}
            <box height={1} paddingLeft={1} paddingRight={1}>
              <text width={2} style={{ fg: colors.blue }}>/</text>
              <text style={{ fg: colors.blue }}>..</text>
            </box>
            
            <For each={filteredPickerEntries()}>
              {(entry, i) => {
                const isSel = () => i() === pickerIdx()
                return (
                  <box height={1} paddingLeft={1} paddingRight={1}
                       backgroundColor={isSel() ? colors.bgHover : "transparent"} flexDirection="row">
                    <text width={2} style={{ fg: entry.isDir ? colors.blue : colors.textDim }}>
                      {entry.isDir ? "/" : " "}
                    </text>
                    <text style={{ fg: isSel() ? colors.text : colors.textMuted }} flexGrow={1}>
                      {entry.name.length > 45 ? entry.name.slice(0, 43) + ".." : entry.name}
                    </text>
                    <text width={8} style={{ fg: colors.textDim }}>
                      {entry.isDir ? "" : formatBytes(entry.size)}
                    </text>
                  </box>
                )
              }}
            </For>
          </scrollbox>

          {/* Footer */}
          <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={colors.bgAlt} flexDirection="row">
            <text style={{ fg: colors.textDim }}>
              <span style={{ fg: colors.textMuted }}>j/k</span> nav
              {" "}
              <span style={{ fg: colors.textMuted }}>l/Enter</span> open/select
              {" "}
              <span style={{ fg: colors.textMuted }}>h</span> up
              {" "}
              <span style={{ fg: colors.textMuted }}>Esc</span> cancel
            </text>
          </box>
        </box>
      </Show>
    </box>
  )
}
