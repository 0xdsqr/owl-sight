import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData } from "../../providers/cloudflare/client"
import {
  OverviewSection,
  StatsBar,
  ProgressBar,
  formatCurrency,
  formatChange,
  formatBytes,
} from "../common/overview-section"

// Section types for navigation
type Section = "alerts" | "services" | "resources" | "zones" | "r2"
const SECTIONS: Section[] = ["alerts", "services", "resources", "zones", "r2"]

const colors = {
  bg: "#0d1117",
  bgAlt: "#161b22",
  bgHover: "#21262d",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  textDim: "#484f58",
  accent: "#f38020", // Cloudflare orange
  blue: "#58a6ff",
  green: "#7ee787",
  yellow: "#d29922",
  red: "#f85149",
  orange: "#f0883e",
}

export function CloudflareOverview(props: { data: DashboardData; onNavigate?: (tab: number) => void }) {
  // Navigation state
  const [focusedSection, setFocusedSection] = createSignal<Section>("alerts")
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  // Computed data
  const alerts = createMemo(() => {
    return props.data.audit.map(finding => ({
      type: finding.type,
      icon: "~",
      color: colors.yellow,
      text: finding.description,
      suggestion: finding.suggestion,
    }))
  })

  const topServices = createMemo(() => {
    const serviceMap = new Map<string, number>()
    props.data.costs.forEach(cost => {
      cost.byService.forEach(svc => {
        serviceMap.set(svc.service, (serviceMap.get(svc.service) ?? 0) + svc.cost)
      })
    })
    return Array.from(serviceMap.entries())
      .map(([service, cost]) => ({ service, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
  })

  const resources = createMemo(() => {
    const activeZones = props.data.zones.filter(z => z.status === "active").length
    const pausedZones = props.data.zones.filter(z => z.status === "paused").length
    
    return [
      { name: "Zones", value: `${activeZones} active`, secondary: pausedZones > 0 ? `${pausedZones} paused` : undefined, color: colors.green, secondaryColor: colors.yellow },
      { name: "Workers", value: `${props.data.workers.length} scripts`, color: colors.blue },
      { name: "R2 Buckets", value: `${props.data.r2Buckets.length}`, color: colors.blue },
      { name: "Bandwidth", value: formatBytes(props.data.totals.totalBandwidth), color: colors.textMuted },
    ]
  })

  const maxServiceCost = () => topServices()[0]?.cost ?? 1

  // Get items for current section
  const currentSectionItems = createMemo(() => {
    switch (focusedSection()) {
      case "alerts": return alerts()
      case "services": return topServices()
      case "resources": return resources()
      case "zones": return props.data.zones
      case "r2": return props.data.r2Buckets
      default: return []
    }
  })

  // Keyboard navigation
  useKeyboard((key) => {
    const sections = alerts().length > 0 ? SECTIONS : SECTIONS.filter(s => s !== "alerts")
    const currentIdx = sections.indexOf(focusedSection())
    const maxItems = currentSectionItems().length - 1

    // Section navigation
    if (key.raw === "j" || key.name === "down") {
      if (key.shift || key.ctrl) {
        const nextIdx = (currentIdx + 1) % sections.length
        setFocusedSection(sections[nextIdx]!)
        setSelectedIdx(0)
      } else {
        setSelectedIdx(i => Math.min(maxItems, i + 1))
      }
      return
    }
    if (key.raw === "k" || key.name === "up") {
      if (key.shift || key.ctrl) {
        const prevIdx = (currentIdx - 1 + sections.length) % sections.length
        setFocusedSection(sections[prevIdx]!)
        setSelectedIdx(0)
      } else {
        setSelectedIdx(i => Math.max(0, i - 1))
      }
      return
    }
    if (key.name === "tab") {
      if (key.shift) {
        const prevIdx = (currentIdx - 1 + sections.length) % sections.length
        setFocusedSection(sections[prevIdx]!)
      } else {
        const nextIdx = (currentIdx + 1) % sections.length
        setFocusedSection(sections[nextIdx]!)
      }
      setSelectedIdx(0)
      return
    }
    if (key.raw === "g") {
      setFocusedSection(sections[0]!)
      setSelectedIdx(0)
      return
    }
    if (key.raw === "G") {
      setFocusedSection(sections[sections.length - 1]!)
      setSelectedIdx(0)
      return
    }
    
    // Drill-down
    if (key.name === "return" || key.raw === "l") {
      if (focusedSection() === "zones" && props.onNavigate) {
        props.onNavigate(1) // Zones tab
      } else if (focusedSection() === "r2" && props.onNavigate) {
        props.onNavigate(3) // R2 tab
      } else if (focusedSection() === "resources" && props.onNavigate) {
        // Navigate based on selected resource
        const res = resources()[selectedIdx()]
        if (res?.name === "Workers") props.onNavigate(2)
        else if (res?.name === "R2 Buckets") props.onNavigate(3)
        else if (res?.name === "Zones") props.onNavigate(1)
      }
      return
    }
  })

  // Stats bar items
  const statsItems = createMemo(() => [
    { label: "Current Period", value: formatCurrency(props.data.totals.currentPeriod), color: colors.accent },
    { label: "vs Last Period", value: formatChange(props.data.totals.change).text, color: formatChange(props.data.totals.change).color },
    { label: "Zones", value: props.data.zones.length.toString(), color: colors.blue },
    { label: "Issues", value: alerts().length.toString(), color: alerts().length > 0 ? colors.orange : colors.green, alert: alerts().length > 0 },
  ])

  const hasAlerts = () => alerts().length > 0

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      {/* Stats Bar */}
      <StatsBar items={statsItems()} accentColor={colors.accent} />

      {/* Alerts Section */}
      <Show when={hasAlerts()}>
        <OverviewSection
          title="Alerts"
          badge={alerts().length}
          badgeColor={colors.red}
          focused={focusedSection() === "alerts"}
          accentColor={colors.accent}
        >
          <box flexDirection="column" paddingLeft={1} paddingRight={1}>
            <For each={alerts()}>
              {(alert, idx) => (
                <box
                  flexDirection="row"
                  height={1}
                  backgroundColor={focusedSection() === "alerts" && selectedIdx() === idx() ? colors.bgHover : "transparent"}
                >
                  <text width={3} style={{ fg: alert.color }}>{alert.icon} </text>
                  <text style={{ fg: focusedSection() === "alerts" && selectedIdx() === idx() ? colors.text : colors.textMuted }}>
                    {alert.text}
                  </text>
                </box>
              )}
            </For>
          </box>
        </OverviewSection>
      </Show>

      {/* Main content row */}
      <box flexDirection="row" gap={1} flexGrow={1}>
        {/* Left column */}
        <box flexDirection="column" gap={1} flexGrow={1}>
          {/* Top Services */}
          <OverviewSection
            title="Top Services"
            badge={topServices().length}
            focused={focusedSection() === "services"}
            accentColor={colors.accent}
          >
            <Show
              when={topServices().length > 0}
              fallback={
                <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
                  <text style={{ fg: colors.textDim }}>No billing data</text>
                </box>
              }
            >
              <box flexDirection="column" paddingLeft={1} paddingRight={1}>
                <For each={topServices()}>
                  {(svc, idx) => {
                    const barWidth = Math.max(1, Math.round((svc.cost / maxServiceCost()) * 20))
                    const isSelected = focusedSection() === "services" && selectedIdx() === idx()
                    const barColor = [colors.accent, colors.orange, colors.yellow, "#a371f7", colors.blue][idx()] ?? colors.textMuted
                    return (
                      <box
                        flexDirection="row"
                        height={1}
                        backgroundColor={isSelected ? colors.bgHover : "transparent"}
                        alignItems="center"
                      >
                        <text width={18} style={{ fg: isSelected ? colors.text : colors.textMuted }}>
                          {isSelected ? "> " : "  "}{svc.service.length > 14 ? svc.service.slice(0, 12) + ".." : svc.service}
                        </text>
                        <text width={9} style={{ fg: colors.text }}>{formatCurrency(svc.cost)}</text>
                        <text>
                          <span style={{ fg: barColor }}>{"█".repeat(barWidth)}</span>
                          <span style={{ fg: colors.bgHover }}>{"░".repeat(20 - barWidth)}</span>
                        </text>
                      </box>
                    )
                  }}
                </For>
              </box>
            </Show>
          </OverviewSection>

          {/* Zones */}
          <OverviewSection
            title="Zones"
            badge={props.data.zones.length}
            focused={focusedSection() === "zones"}
            accentColor={colors.accent}
          >
            <Show
              when={props.data.zones.length > 0}
              fallback={
                <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
                  <text style={{ fg: colors.textDim }}>No zones configured</text>
                </box>
              }
            >
              <box flexDirection="column" paddingLeft={1} paddingRight={1}>
                <For each={props.data.zones.slice(0, 5)}>
                  {(zone, idx) => {
                    const isSelected = focusedSection() === "zones" && selectedIdx() === idx()
                    const statusColor = zone.status === "active" ? colors.green : zone.status === "paused" ? colors.yellow : colors.textDim
                    const statusIcon = zone.status === "active" ? "v" : zone.status === "paused" ? "·" : "?"
                    return (
                      <box
                        flexDirection="row"
                        height={1}
                        backgroundColor={isSelected ? colors.bgHover : "transparent"}
                      >
                        <text width={3} style={{ fg: statusColor }}>{statusIcon} </text>
                        <text style={{ fg: isSelected ? colors.text : colors.textMuted }} flexGrow={1}>
                          {zone.zoneName.length > 20 ? zone.zoneName.slice(0, 18) + ".." : zone.zoneName}
                        </text>
                        <text style={{ fg: colors.textDim }}>{zone.plan}</text>
                      </box>
                    )
                  }}
                </For>
                <Show when={props.data.zones.length > 5}>
                  <text style={{ fg: colors.textDim }} paddingLeft={3}>+{props.data.zones.length - 5} more</text>
                </Show>
              </box>
            </Show>
          </OverviewSection>
        </box>

        {/* Right column */}
        <box flexDirection="column" gap={1} flexGrow={1}>
          {/* Resources */}
          <OverviewSection
            title="Resources"
            focused={focusedSection() === "resources"}
            accentColor={colors.accent}
          >
            <box flexDirection="column" paddingLeft={1} paddingRight={1}>
              <For each={resources()}>
                {(res, idx) => {
                  const isSelected = focusedSection() === "resources" && selectedIdx() === idx()
                  return (
                    <box
                      flexDirection="row"
                      height={1}
                      backgroundColor={isSelected ? colors.bgHover : "transparent"}
                    >
                      <text width={14} style={{ fg: isSelected ? colors.text : colors.textMuted }}>
                        {isSelected ? "> " : "  "}{res.name}
                      </text>
                      <text style={{ fg: res.color }}>{res.value}</text>
                      <Show when={res.secondary}>
                        <text style={{ fg: res.secondaryColor }}> {res.secondary}</text>
                      </Show>
                    </box>
                  )
                }}
              </For>
            </box>
          </OverviewSection>

          {/* R2 Buckets */}
          <OverviewSection
            title="R2 Buckets"
            badge={props.data.r2Buckets.length}
            focused={focusedSection() === "r2"}
            accentColor={colors.accent}
          >
            <Show
              when={props.data.r2Buckets.length > 0}
              fallback={
                <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
                  <text style={{ fg: colors.textDim }}>No R2 buckets</text>
                </box>
              }
            >
              <box flexDirection="column">
                {/* Header */}
                <box flexDirection="row" backgroundColor={colors.bgHover} paddingLeft={1} paddingRight={1} height={1}>
                  <text width={14} style={{ fg: colors.textMuted }}>Bucket</text>
                  <text width={10} style={{ fg: colors.textMuted }}>Size</text>
                  <text width={8} style={{ fg: colors.textMuted }}>Cost</text>
                </box>
                
                <For each={props.data.r2Buckets.slice(0, 4)}>
                  {(bucket, idx) => {
                    const isSelected = focusedSection() === "r2" && selectedIdx() === idx()
                    return (
                      <box
                        flexDirection="row"
                        paddingLeft={1}
                        paddingRight={1}
                        height={1}
                        backgroundColor={isSelected ? colors.bgHover : (idx() % 2 === 0 ? colors.bg : colors.bgAlt)}
                      >
                        <text width={14} style={{ fg: isSelected ? colors.text : colors.textMuted }}>
                          {isSelected ? ">" : " "}{bucket.bucketName.slice(0, 12)}
                        </text>
                        <text width={10} style={{ fg: colors.blue }}>{formatBytes(bucket.storageBytes)}</text>
                        <text width={8} style={{ fg: colors.text }}>{formatCurrency(bucket.estimatedCost)}</text>
                      </box>
                    )
                  }}
                </For>
                
                <Show when={props.data.r2Buckets.length > 4}>
                  <text style={{ fg: colors.textDim }} paddingLeft={1}>+{props.data.r2Buckets.length - 4} more</text>
                </Show>
              </box>
            </Show>
          </OverviewSection>
        </box>
      </box>

      {/* Footer hints */}
      <box height={1} paddingLeft={1} flexDirection="row" gap={2}>
        <text style={{ fg: colors.textDim }}>
          <span style={{ fg: colors.textMuted }}>j/k</span> select
          {" "}
          <span style={{ fg: colors.textMuted }}>Tab</span> section
          {" "}
          <span style={{ fg: colors.textMuted }}>Enter</span> details
          {" "}
          <span style={{ fg: colors.textMuted }}>r</span> refresh
        </text>
      </box>
    </box>
  )
}
