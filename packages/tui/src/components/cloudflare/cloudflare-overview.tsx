import { For, Show } from "solid-js"
import type { DashboardData } from "../providers/cloudflare/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS, SEMANTIC_COLORS, BRAND_COLORS } from "../../constants/colors"

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
  const changeColor = () => change() > 5 ? FINDING_COLORS.error : change() < -5 ? STATUS_COLORS.success : THEME_COLORS.text.secondary
  const changeArrow = () => change() > 0 ? "+" : ""

  return (
    <box
      flexDirection="row"
      gap={2}
      height={3}
      backgroundColor={THEME_COLORS.background.secondary}
      borderColor={THEME_COLORS.border.default}
      border
      borderStyle="rounded"
      paddingLeft={2}
      paddingRight={2}
      alignItems="center"
    >
      {/* Current Period Cost */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>Current Period</text>
        <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>
          <b>{formatCurrency(props.data.totals.currentPeriod)}</b>
        </text>
      </box>

      <text style={{ fg: THEME_COLORS.border.default }}>|</text>

      {/* Change */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>vs Last Period</text>
        <text style={{ fg: changeColor() }}>
          {changeArrow()}{change().toFixed(1)}%
        </text>
      </box>

      <text style={{ fg: THEME_COLORS.border.default }}>|</text>

      {/* Zones */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>Zones</text>
        <text style={{ fg: STATUS_COLORS.info }}>{props.data.zones.length}</text>
      </box>

      <text style={{ fg: THEME_COLORS.border.default }}>|</text>

      {/* Total Requests */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>Total Requests</text>
        <text style={{ fg: STATUS_COLORS.success }}>
          {props.data.totals.totalRequests > 0
            ? (props.data.totals.totalRequests / 1000000).toFixed(1) + "M"
            : "0"}
        </text>
      </box>

      <text style={{ fg: THEME_COLORS.border.default }}>|</text>

      {/* Audit Issues */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>Audit Issues</text>
        <text style={{ fg: props.data.audit.length > 0 ? SEMANTIC_COLORS.warning : STATUS_COLORS.success }}>
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
    const color = change > 5 ? FINDING_COLORS.error : change < -5 ? STATUS_COLORS.success : THEME_COLORS.text.secondary
    return { text: `${arrow}${Math.abs(change).toFixed(1)}%`, color }
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      title=" Cost by Account "
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
        <text width={16} style={{ fg: THEME_COLORS.text.secondary }}><b>Account</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Plan</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Last</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Current</b></text>
        <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Change</b></text>
      </box>

      {/* Data rows */}
      <Show
        when={props.data.costs.length > 0}
        fallback={
          <box padding={1} alignItems="center" justifyContent="center">
            <text style={{ fg: THEME_COLORS.text.muted }}>No billing data available</text>
          </box>
        }
      >
        <For each={props.data.costs}>
          {(cost, idx) => {
            const change = formatChange(cost.change)
            const bgColor = idx() % 2 === 0 ? THEME_COLORS.background.primary : THEME_COLORS.background.secondary
            return (
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                height={1}
                backgroundColor={bgColor}
              >
                <text width={16} style={{ fg: THEME_COLORS.text.primary }}>
                  {cost.accountId.slice(0, 14)}
                </text>
                <text width={12} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>{cost.plan}</text>
                <text width={12} style={{ fg: THEME_COLORS.text.secondary }}>{formatCurrency(cost.lastPeriod)}</text>
                <text width={12} style={{ fg: THEME_COLORS.text.primary }}>{formatCurrency(cost.currentPeriod)}</text>
                <text width={10} style={{ fg: change.color }}>{change.text}</text>
              </box>
            )
          }}
        </For>

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
          <text width={16} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>TOTAL</b></text>
          <text width={12} style={{ fg: THEME_COLORS.text.muted }}>--</text>
          <text width={12} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>{formatCurrency(props.data.totals.lastPeriod)}</text>
          <text width={12} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{formatCurrency(props.data.totals.currentPeriod)}</b></text>
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
    const colors = [PROVIDER_COLORS.cloudflare.primary, SEMANTIC_COLORS.warning, FINDING_COLORS.warning, BRAND_COLORS.owlPurple, STATUS_COLORS.info]
    return colors[idx] ?? THEME_COLORS.text.secondary
  }

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      flexGrow={1}
      title=" Top Services "
      titleAlignment="left"
    >
      <Show
        when={topServices().length > 0}
        fallback={
          <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
            <text style={{ fg: THEME_COLORS.text.muted }}>No service data available</text>
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
                <text width={20} style={{ fg: THEME_COLORS.text.primary }}>
                  {svc.service.length > 18 ? svc.service.slice(0, 16) + ".." : svc.service}
                </text>
                <text width={10} style={{ fg: THEME_COLORS.text.secondary }}>{formatCurrency(svc.cost)}</text>
                <text>
                  <span style={{ fg: getBarColor(idx()) }}>{"█".repeat(barWidth)}</span>
                  <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(25 - barWidth)}</span>
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
      case "active": return STATUS_COLORS.success
      case "paused": return FINDING_COLORS.warning
      default: return THEME_COLORS.text.muted
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
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      flexGrow={1}
      title=" Zones "
      titleAlignment="left"
    >
      <Show
        when={props.zones.length > 0}
        fallback={
          <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
            <text style={{ fg: THEME_COLORS.text.muted }}>No zones configured</text>
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
                  <text flexGrow={1} style={{ fg: THEME_COLORS.text.primary }}>
                    {zone.zoneName.length > 20 ? zone.zoneName.slice(0, 18) + ".." : zone.zoneName}
                  </text>
                  <text style={{ fg: THEME_COLORS.text.muted }}>{zone.plan}</text>
                </box>
              )
            }}
          </For>
        </scrollbox>
        <box
          borderColor={THEME_COLORS.border.default}
          border={["top"]}
          paddingLeft={1}
          paddingTop={1}
        >
          <text style={{ fg: THEME_COLORS.text.muted }}>
            Total: <span style={{ fg: STATUS_COLORS.success }}>{activeZones().length}</span> active
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
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      flexGrow={1}
      title=" Quick Stats "
      titleAlignment="left"
    >
      <box flexDirection="column" padding={1} gap={1}>
        <box flexDirection="row">
          <text width={14} style={{ fg: THEME_COLORS.text.secondary }}>Workers:</text>
          <text style={{ fg: STATUS_COLORS.info }}>{props.data.workers.length}</text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: THEME_COLORS.text.secondary }}>R2 Buckets:</text>
          <text style={{ fg: STATUS_COLORS.info }}>{props.data.r2Buckets.length}</text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: THEME_COLORS.text.secondary }}>Bandwidth:</text>
          <text style={{ fg: STATUS_COLORS.success }}>
            {formatBytes(props.data.totals.totalBandwidth)}
          </text>
        </box>

        <box flexDirection="row">
          <text width={14} style={{ fg: THEME_COLORS.text.secondary }}>Last Updated:</text>
          <text style={{ fg: THEME_COLORS.text.muted }}>
            {new Date(props.data.lastUpdated).toLocaleTimeString()}
          </text>
        </box>
      </box>
    </box>
  )
}
