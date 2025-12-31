import { For, Show } from "solid-js"
import type { DashboardData } from "../../providers/cloudflare/client"

export function CloudflareOverview(props: { data: DashboardData }) {
  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      {/* Top Stats Row */}
      <TopStatsBar data={props.data} />

      {/* Main Content */}
      <box flexDirection="row" gap={1} flexGrow={1}>
        {/* Left: Cost Summary + Top Services */}
        <box flexDirection="column" gap={1} flexGrow={2}>
          <CostSummaryTable data={props.data} />
          <TopServicesPanel data={props.data} />
        </box>

        {/* Right: Zones + Quick Stats */}
        <box flexDirection="column" gap={1} flexGrow={1}>
          <ZonesPanel zones={props.data.zones} />
          <QuickStatsPanel data={props.data} />
        </box>
      </box>
    </box>
  )
}

// ============================================================================
// Top Stats Bar
// ============================================================================

function TopStatsBar(props: { data: DashboardData }) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)}TB`
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
    return `${bytes}B`
  }

  const change = () => props.data.totals.change
  const changeColor = () => change() > 5 ? "#f85149" : change() < -5 ? "#7ee787" : "#8b949e"
  const changeArrow = () => change() > 0 ? "+" : ""

  return (
    <box
      flexDirection="row"
      gap={2}
      height={3}
      backgroundColor="#161b22"
      borderColor="#30363d"
      border
      borderStyle="rounded"
      paddingLeft={2}
      paddingRight={2}
      alignItems="center"
    >
      {/* Current Period Cost */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>Current Period</text>
        <text style={{ fg: "#f38020" }}>
          <b>{formatCurrency(props.data.totals.currentPeriod)}</b>
        </text>
      </box>

      <text style={{ fg: "#30363d" }}>|</text>

      {/* Change */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>vs Last Period</text>
        <text style={{ fg: changeColor() }}>
          {changeArrow()}{change().toFixed(1)}%
        </text>
      </box>

      <text style={{ fg: "#30363d" }}>|</text>

      {/* Zones */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>Zones</text>
        <text style={{ fg: "#58a6ff" }}>{props.data.zones.length}</text>
      </box>

      <text style={{ fg: "#30363d" }}>|</text>

      {/* Total Requests */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>Total Requests</text>
        <text style={{ fg: "#7ee787" }}>
          {props.data.totals.totalRequests > 0
            ? (props.data.totals.totalRequests / 1000000).toFixed(1) + "M"
            : "0"}
        </text>
      </box>

      <text style={{ fg: "#30363d" }}>|</text>

      {/* Audit Issues */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>Audit Issues</text>
        <text style={{ fg: props.data.audit.length > 0 ? "#f0883e" : "#7ee787" }}>
          {props.data.audit.length}
        </text>
      </box>
    </box>
  )
}

// ============================================================================
// Cost Summary Table
// ============================================================================

function CostSummaryTable(props: { data: DashboardData }) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }

  const formatChange = (change: number) => {
    const arrow = change > 0 ? "^" : change < 0 ? "v" : "-"
    const color = change > 5 ? "#f85149" : change < -5 ? "#7ee787" : "#8b949e"
    return { text: `${arrow}${Math.abs(change).toFixed(1)}%`, color }
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#30363d"
      flexDirection="column"
      title=" Cost by Account "
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
        <text width={16} style={{ fg: "#8b949e" }}><b>Account</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Plan</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Last</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Current</b></text>
        <text width={10} style={{ fg: "#8b949e" }}><b>Change</b></text>
      </box>

      {/* Data rows */}
      <Show
        when={props.data.costs.length > 0}
        fallback={
          <box padding={1} alignItems="center" justifyContent="center">
            <text style={{ fg: "#484f58" }}>No billing data available</text>
          </box>
        }
      >
        <For each={props.data.costs}>
          {(cost, idx) => {
            const change = formatChange(cost.change)
            const bgColor = idx() % 2 === 0 ? "#0d1117" : "#161b22"
            return (
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                height={1}
                backgroundColor={bgColor}
              >
                <text width={16} style={{ fg: "#c9d1d9" }}>
                  {cost.accountId.slice(0, 14)}
                </text>
                <text width={12} style={{ fg: "#f38020" }}>{cost.plan}</text>
                <text width={12} style={{ fg: "#8b949e" }}>{formatCurrency(cost.lastPeriod)}</text>
                <text width={12} style={{ fg: "#c9d1d9" }}>{formatCurrency(cost.currentPeriod)}</text>
                <text width={10} style={{ fg: change.color }}>{change.text}</text>
              </box>
            )
          }}
        </For>

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
          <text width={16} style={{ fg: "#f38020" }}><b>TOTAL</b></text>
          <text width={12} style={{ fg: "#484f58" }}>--</text>
          <text width={12} style={{ fg: "#f38020" }}>{formatCurrency(props.data.totals.lastPeriod)}</text>
          <text width={12} style={{ fg: "#f38020" }}><b>{formatCurrency(props.data.totals.currentPeriod)}</b></text>
          {(() => {
            const change = formatChange(props.data.totals.change)
            return <text width={10} style={{ fg: change.color }}><b>{change.text}</b></text>
          })()}
        </box>
      </Show>
    </box>
  )
}

// ============================================================================
// Top Services Panel
// ============================================================================

function TopServicesPanel(props: { data: DashboardData }) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }

  const topServices = () => {
    const serviceMap = new Map<string, number>()
    for (const cost of props.data.costs) {
      for (const svc of cost.byService) {
        serviceMap.set(svc.service, (serviceMap.get(svc.service) ?? 0) + svc.cost)
      }
    }
    return Array.from(serviceMap.entries())
      .map(([service, cost]) => ({ service, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
  }

  const maxCost = () => topServices()[0]?.cost ?? 1

  const getBarColor = (idx: number) => {
    const colors = ["#f38020", "#f0883e", "#d29922", "#a371f7", "#58a6ff"]
    return colors[idx] ?? "#8b949e"
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#30363d"
      flexDirection="column"
      flexGrow={1}
      title=" Top Services "
      titleAlignment="left"
    >
      <Show
        when={topServices().length > 0}
        fallback={
          <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
            <text style={{ fg: "#484f58" }}>No service data available</text>
          </box>
        }
      >
        <For each={topServices()}>
          {(svc, idx) => {
            const barWidth = Math.max(1, Math.round((svc.cost / maxCost()) * 25))
            return (
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                height={1}
                alignItems="center"
              >
                <text width={20} style={{ fg: "#c9d1d9" }}>
                  {svc.service.length > 18 ? svc.service.slice(0, 16) + ".." : svc.service}
                </text>
                <text width={10} style={{ fg: "#8b949e" }}>{formatCurrency(svc.cost)}</text>
                <text>
                  <span style={{ fg: getBarColor(idx()) }}>{"█".repeat(barWidth)}</span>
                  <span style={{ fg: "#21262d" }}>{"░".repeat(25 - barWidth)}</span>
                </text>
              </box>
            )
          }}
        </For>
      </Show>
    </box>
  )
}

// ============================================================================
// Zones Panel
// ============================================================================

function ZonesPanel(props: { zones: DashboardData["zones"] }) {
  const activeZones = () => props.zones.filter(z => z.status === "active")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#7ee787"
      case "paused": return "#d29922"
      default: return "#484f58"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return "[✓]"
      case "paused": return "[·]"
      default: return "[?]"
    }
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#30363d"
      flexDirection="column"
      flexGrow={1}
      title=" Zones "
      titleAlignment="left"
    >
      <Show
        when={props.zones.length > 0}
        fallback={
          <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
            <text style={{ fg: "#484f58" }}>No zones configured</text>
          </box>
        }
      >
        <scrollbox
          scrollbarOptions={{ visible: true }}
          flexGrow={1}
          contentOptions={{ gap: 0 }}
        >
          <For each={props.zones.slice(0, 10)}>
            {(zone) => {
              const color = getStatusColor(zone.status)
              return (
                <box
                  flexDirection="row"
                  paddingLeft={1}
                  paddingRight={1}
                  height={1}
                  alignItems="center"
                >
                  <text width={4} style={{ fg: color }}>{getStatusIcon(zone.status)}</text>
                  <text flexGrow={1} style={{ fg: "#c9d1d9" }}>
                    {zone.zoneName.length > 20 ? zone.zoneName.slice(0, 18) + ".." : zone.zoneName}
                  </text>
                  <text style={{ fg: "#484f58" }}>{zone.plan}</text>
                </box>
              )
            }}
          </For>
        </scrollbox>
        <box
          borderColor="#30363d"
          border={["top"]}
          paddingLeft={1}
          paddingTop={1}
        >
          <text style={{ fg: "#484f58" }}>
            Total: <span style={{ fg: "#7ee787" }}>{activeZones().length}</span> active
          </text>
        </box>
      </Show>
    </box>
  )
}

// ============================================================================
// Quick Stats Panel
// ============================================================================

function QuickStatsPanel(props: { data: DashboardData }) {
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)}TB`
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
    return `${bytes}B`
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#30363d"
      flexDirection="column"
      flexGrow={1}
      title=" Quick Stats "
      titleAlignment="left"
    >
      <box flexDirection="column" padding={1} gap={1}>
        <box flexDirection="row">
          <text width={14} style={{ fg: "#8b949e" }}>Workers:</text>
          <text style={{ fg: "#58a6ff" }}>{props.data.workers.length}</text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: "#8b949e" }}>R2 Buckets:</text>
          <text style={{ fg: "#58a6ff" }}>{props.data.r2Buckets.length}</text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: "#8b949e" }}>Bandwidth:</text>
          <text style={{ fg: "#7ee787" }}>
            {formatBytes(props.data.totals.totalBandwidth)}
          </text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: "#8b949e" }}>Last Updated:</text>
          <text style={{ fg: "#484f58" }}>
            {new Date(props.data.lastUpdated).toLocaleTimeString()}
          </text>
        </box>
      </box>
    </box>
  )
}
