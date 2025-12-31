import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, WorkerSummary } from "../../providers/cloudflare/client"

export function CloudflareWorkers(props: { data: DashboardData }) {
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [sortBy, setSortBy] = createSignal<"name" | "requests" | "cost">("requests")

  const sortedWorkers = createMemo(() => {
    const workers = [...props.data.workers]
    const sort = sortBy()

    if (sort === "name") {
      workers.sort((a, b) => a.scriptName.localeCompare(b.scriptName))
    } else if (sort === "requests") {
      workers.sort((a, b) => b.requests30d - a.requests30d)
    } else if (sort === "cost") {
      workers.sort((a, b) => b.estimatedCost - a.estimatedCost)
    }

    return workers
  })

  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "up" || key.raw === "k") {
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (key.name === "down" || key.raw === "j") {
      setSelectedIndex(i => Math.min(sortedWorkers().length - 1, i + 1))
    } else if (key.raw === "s") {
      setSortBy(s => {
        if (s === "name") return "requests"
        if (s === "requests") return "cost"
        return "name"
      })
      setSelectedIndex(0)
    }
  })

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms.toFixed(0)}ms`
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const totalRequests = () => sortedWorkers().reduce((sum, w) => sum + w.requests30d, 0)
  const totalCost = () => sortedWorkers().reduce((sum, w) => sum + w.estimatedCost, 0)

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Sort bar */}
      <box
        flexDirection="row"
        height={2}
        backgroundColor="#161b22"
        borderColor="#30363d"
        border={["bottom"]}
        paddingLeft={1}
        paddingRight={1}
        alignItems="center"
        gap={1}
      >
        <text style={{ fg: "#8b949e" }}>Sort by:</text>
        <For each={[
          { key: "name", label: "Name" },
          { key: "requests", label: "Requests" },
          { key: "cost", label: "Cost" }
        ] as const}>
          {(option) => {
            const isActive = () => sortBy() === option.key
            return (
              <box
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isActive() ? "#21262d" : "transparent"}
                borderColor={isActive() ? "#f38020" : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? "#f38020" : "#8b949e" }}>
                  {option.label}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: "#484f58" }}>
          <span style={{ fg: "#8b949e" }}>s</span> sort
          <span style={{ fg: "#8b949e" }}>j/k</span> select
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Workers list */}
        <box
          border
          borderStyle="rounded"
          borderColor="#30363d"
          flexDirection="column"
          flexGrow={2}
          title=" Workers "
          titleAlignment="left"
        >
          {/* Header */}
          <box
            flexDirection="row"
            backgroundColor="#21262d"
            paddingLeft={1}
            paddingRight={1}
            height={1}
          >
            <text width={24} style={{ fg: "#8b949e" }}><b>Script Name</b></text>
            <text width={12} style={{ fg: "#8b949e" }}><b>Requests</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>CPU Time</b></text>
            <text width={8} style={{ fg: "#8b949e" }}><b>Errors</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>Cost</b></text>
          </box>

          {/* Scrollable content */}
          <Show
            when={sortedWorkers().length > 0}
            fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: "#484f58" }}>No workers found</text>
              </box>
            }
          >
            <scrollbox
              scrollbarOptions={{ visible: true }}
              flexGrow={1}
              contentOptions={{ gap: 0 }}
            >
              <For each={sortedWorkers()}>
                {(worker, index) => {
                  const isSelected = () => index() === selectedIndex()
                  const hasErrors = worker.errors30d > 0

                  return (
                    <box
                      flexDirection="row"
                      paddingLeft={1}
                      paddingRight={1}
                      height={1}
                      backgroundColor={isSelected() ? "#21262d" : "transparent"}
                    >
                      <text
                        width={24}
                        style={{ fg: isSelected() ? "#c9d1d9" : "#8b949e" }}
                      >
                        {worker.scriptName.length > 22
                          ? worker.scriptName.slice(0, 20) + ".."
                          : worker.scriptName}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? "#58a6ff" : "#8b949e" }}
                      >
                        {formatNumber(worker.requests30d)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? "#7ee787" : "#8b949e" }}
                      >
                        {formatDuration(worker.cpuTime30d)}
                      </text>
                      <text
                        width={8}
                        style={{ fg: hasErrors ? "#f85149" : "#484f58" }}
                      >
                        {hasErrors ? formatNumber(worker.errors30d) : "--"}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? "#f38020" : "#8b949e" }}
                      >
                        {formatCurrency(worker.estimatedCost)}
                      </text>
                    </box>
                  )
                }}
              </For>
            </scrollbox>

            {/* Total row */}
            <box
              flexDirection="row"
              backgroundColor="#21262d"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              borderColor="#30363d"
              border={["top"]}
            >
              <text width={24} style={{ fg: "#f38020" }}><b>TOTAL</b></text>
              <text width={12} style={{ fg: "#58a6ff" }}><b>{formatNumber(totalRequests())}</b></text>
              <text width={10} style={{ fg: "#484f58" }}>--</text>
              <text width={8} style={{ fg: "#484f58" }}>--</text>
              <text width={10} style={{ fg: "#f38020" }}><b>{formatCurrency(totalCost())}</b></text>
            </box>
          </Show>
        </box>

        {/* Side panel - selected worker details */}
        <box
          border
          borderStyle="rounded"
          borderColor="#30363d"
          flexDirection="column"
          width={32}
          title=" Details "
          titleAlignment="left"
        >
          <Show
            when={sortedWorkers()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: "#484f58" }}>Select a worker</text>
              </box>
            }
          >
            {(() => {
              const worker = () => sortedWorkers()[selectedIndex()]!
              const errorRate = () => {
                const total = worker().requests30d
                return total > 0 ? (worker().errors30d / total) * 100 : 0
              }

              return (
                <box flexDirection="column" padding={1} gap={1}>
                  <text style={{ fg: "#f38020" }}><b>{worker().scriptName}</b></text>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Account ID</text>
                    <text style={{ fg: "#484f58" }}>{worker().accountId.slice(0, 12)}...</text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Requests (30d)</text>
                    <text style={{ fg: "#58a6ff" }}>{formatNumber(worker().requests30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>CPU Time (30d)</text>
                    <text style={{ fg: "#7ee787" }}>{formatDuration(worker().cpuTime30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Errors (30d)</text>
                    <text style={{ fg: worker().errors30d > 0 ? "#f85149" : "#7ee787" }}>
                      {formatNumber(worker().errors30d)}
                    </text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Error Rate</text>
                    <text style={{ fg: errorRate() > 5 ? "#f85149" : errorRate() > 1 ? "#d29922" : "#7ee787" }}>
                      {errorRate().toFixed(2)}%
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Est. Cost</text>
                    <text style={{ fg: "#f38020" }}><b>{formatCurrency(worker().estimatedCost)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Last Deployed</text>
                    <text style={{ fg: "#484f58" }}>{formatDate(new Date(worker().lastDeployed))}</text>
                  </box>

                  {/* Request volume indicator */}
                  <box marginTop={2}>
                    <text style={{ fg: "#484f58" }}>Request volume:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: "#58a6ff" }}>
                          {"█".repeat(Math.min(20, Math.round(worker().requests30d / (totalRequests() / 20))))}
                        </span>
                        <span style={{ fg: "#21262d" }}>
                          {"░".repeat(Math.max(0, 20 - Math.min(20, Math.round(worker().requests30d / (totalRequests() / 20)))))}
                        </span>
                      </text>
                    </box>
                  </box>

                  <Show when={worker().requests30d === 0}>
                    <box marginTop={2} padding={1} backgroundColor="#21262d" borderColor="#d29922" border>
                      <text style={{ fg: "#d29922" }}>⚠ Idle worker (no requests)</text>
                    </box>
                  </Show>
                </box>
              )
            })()}
          </Show>
        </box>
      </box>

      {/* Summary footer */}
      <box
        paddingTop={1}
        paddingLeft={1}
        flexDirection="row"
        gap={2}
      >
        <text style={{ fg: "#484f58" }}>
          <span style={{ fg: "#58a6ff" }}>{sortedWorkers().length}</span> worker{sortedWorkers().length !== 1 ? "s" : ""}
        </text>
        <text style={{ fg: "#30363d" }}>|</text>
        <text style={{ fg: "#484f58" }}>
          Total requests: <span style={{ fg: "#58a6ff" }}>{formatNumber(totalRequests())}</span>
        </text>
        <text style={{ fg: "#30363d" }}>|</text>
        <text style={{ fg: "#484f58" }}>
          Est. cost: <span style={{ fg: "#f38020" }}>{formatCurrency(totalCost())}</span>
        </text>
      </box>
    </box>
  )
}
