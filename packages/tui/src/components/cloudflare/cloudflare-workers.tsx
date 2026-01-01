import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, WorkerSummary } from "../providers/cloudflare/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS } from "../../constants/colors"

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
        backgroundColor={THEME_COLORS.background.secondary}
        borderColor={THEME_COLORS.border.default}
        border={["bottom"]}
        paddingLeft={1}
        paddingRight={1}
        alignItems="center"
        gap={1}
      >
        <text style={{ fg: THEME_COLORS.text.secondary }}>Sort by:</text>
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
                backgroundColor={isActive() ? THEME_COLORS.background.tertiary : "transparent"}
                borderColor={isActive() ? PROVIDER_COLORS.cloudflare.primary : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? PROVIDER_COLORS.cloudflare.primary : THEME_COLORS.text.secondary }}>
                  {option.label}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: THEME_COLORS.text.muted }}>
          <span style={{ fg: THEME_COLORS.text.secondary }}>s</span> sort
          <span style={{ fg: THEME_COLORS.text.secondary }}>j/k</span> select
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Workers list */}
        <box
          border
          borderStyle="rounded"
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          flexGrow={2}
          title=" Workers "
          titleAlignment="left"
        >
          {/* Header */}
          <box
            flexDirection="row"
            backgroundColor={THEME_COLORS.background.tertiary}
            paddingLeft={1}
            paddingRight={1}
            height={1}
          >
            <text width={24} style={{ fg: THEME_COLORS.text.secondary }}><b>Script Name</b></text>
            <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Requests</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>CPU Time</b></text>
            <text width={8} style={{ fg: THEME_COLORS.text.secondary }}><b>Errors</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Cost</b></text>
          </box>

          {/* Scrollable content */}
          <Show
            when={sortedWorkers().length > 0}
            fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: THEME_COLORS.text.muted }}>No workers found</text>
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
                      backgroundColor={isSelected() ? THEME_COLORS.background.tertiary : "transparent"}
                    >
                      <text
                        width={24}
                        style={{ fg: isSelected() ? THEME_COLORS.text.primary : THEME_COLORS.text.secondary }}
                      >
                        {worker.scriptName.length > 22
                          ? worker.scriptName.slice(0, 20) + ".."
                          : worker.scriptName}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? STATUS_COLORS.info : THEME_COLORS.text.secondary }}
                      >
                        {formatNumber(worker.requests30d)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? STATUS_COLORS.success : THEME_COLORS.text.secondary }}
                      >
                        {formatDuration(worker.cpuTime30d)}
                      </text>
                      <text
                        width={8}
                        style={{ fg: hasErrors ? FINDING_COLORS.error : THEME_COLORS.text.muted }}
                      >
                        {hasErrors ? formatNumber(worker.errors30d) : "--"}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? PROVIDER_COLORS.cloudflare.primary : THEME_COLORS.text.secondary }}
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
              backgroundColor={THEME_COLORS.background.tertiary}
              paddingLeft={1}
              paddingRight={1}
              height={1}
              borderColor={THEME_COLORS.border.default}
              border={["top"]}
            >
              <text width={24} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>TOTAL</b></text>
              <text width={12} style={{ fg: STATUS_COLORS.info }}><b>{formatNumber(totalRequests())}</b></text>
              <text width={10} style={{ fg: THEME_COLORS.text.muted }}>--</text>
              <text width={8} style={{ fg: THEME_COLORS.text.muted }}>--</text>
              <text width={10} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{formatCurrency(totalCost())}</b></text>
            </box>
          </Show>
        </box>

        {/* Side panel - selected worker details */}
        <box
          border
          borderStyle="rounded"
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          width={32}
          title=" Details "
          titleAlignment="left"
        >
          <Show
            when={sortedWorkers()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: THEME_COLORS.text.muted }}>Select a worker</text>
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
                  <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{worker().scriptName}</b></text>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Account ID</text>
                    <text style={{ fg: THEME_COLORS.text.muted }}>{worker().accountId.slice(0, 12)}...</text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Requests (30d)</text>
                    <text style={{ fg: STATUS_COLORS.info }}>{formatNumber(worker().requests30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>CPU Time (30d)</text>
                    <text style={{ fg: STATUS_COLORS.success }}>{formatDuration(worker().cpuTime30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Errors (30d)</text>
                    <text style={{ fg: worker().errors30d > 0 ? FINDING_COLORS.error : STATUS_COLORS.success }}>
                      {formatNumber(worker().errors30d)}
                    </text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Error Rate</text>
                    <text style={{ fg: errorRate() > 5 ? FINDING_COLORS.error : errorRate() > 1 ? FINDING_COLORS.warning : STATUS_COLORS.success }}>
                      {errorRate().toFixed(2)}%
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Est. Cost</text>
                    <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{formatCurrency(worker().estimatedCost)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Last Deployed</text>
                    <text style={{ fg: THEME_COLORS.text.muted }}>{formatDate(new Date(worker().lastDeployed))}</text>
                  </box>

                  {/* Request volume indicator */}
                  <box marginTop={2}>
                    <text style={{ fg: THEME_COLORS.text.muted }}>Request volume:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: STATUS_COLORS.info }}>
                          {"█".repeat(Math.min(20, Math.round(worker().requests30d / (totalRequests() / 20))))}
                        </span>
                        <span style={{ fg: THEME_COLORS.background.tertiary }}>
                          {"░".repeat(Math.max(0, 20 - Math.min(20, Math.round(worker().requests30d / (totalRequests() / 20)))))}
                        </span>
                      </text>
                    </box>
                  </box>

                  <Show when={worker().requests30d === 0}>
                    <box marginTop={2} padding={1} backgroundColor={THEME_COLORS.background.tertiary} borderColor={FINDING_COLORS.warning} border>
                      <text style={{ fg: FINDING_COLORS.warning }}>⚠ Idle worker (no requests)</text>
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
        <text style={{ fg: THEME_COLORS.text.muted }}>
          <span style={{ fg: STATUS_COLORS.info }}>{sortedWorkers().length}</span> worker{sortedWorkers().length !== 1 ? "s" : ""}
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Total requests: <span style={{ fg: STATUS_COLORS.info }}>{formatNumber(totalRequests())}</span>
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Est. cost: <span style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>{formatCurrency(totalCost())}</span>
        </text>
      </box>
    </box>
  )
}
