import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData } from "../../providers/aws/client"
import {
  OverviewSection,
  StatsBar,
  ProgressBar,
  formatCurrency,
  formatChange,
} from "../common/overview-section"

// Section types for navigation
type Section = "alerts" | "services" | "resources" | "budgets" | "costs"
const SECTIONS: Section[] = ["alerts", "services", "resources", "budgets", "costs"]

const colors = {
  bg: "#0d1117",
  bgAlt: "#161b22",
  bgHover: "#21262d",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  textDim: "#484f58",
  accent: "#ff9900",
  blue: "#58a6ff",
  green: "#7ee787",
  yellow: "#d29922",
  red: "#f85149",
  orange: "#f0883e",
}

export function OverviewTab(props: { data: DashboardData; onNavigate?: (tab: number) => void }) {
  // Navigation state
  const [focusedSection, setFocusedSection] = createSignal<Section>("alerts")
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  // Computed data
  const alerts = createMemo(() => {
    const items: Array<{ type: string; icon: string; color: string; text: string }> = []
    
    // Budget alerts
    props.data.budgets
      .filter(b => b.status !== "ok")
      .forEach(b => {
        items.push({
          type: "budget",
          icon: b.status === "exceeded" ? "!" : "~",
          color: b.status === "exceeded" ? colors.red : colors.yellow,
          text: `Budget "${b.name}" at ${b.percentUsed.toFixed(0)}% - ${b.status}`,
        })
      })
    
    // Audit findings grouped
    const stoppedCount = props.data.audit.filter(a => a.type === "stopped_instance").length
    const volumeCount = props.data.audit.filter(a => a.type === "unattached_volume").length
    const eipCount = props.data.audit.filter(a => a.type === "unused_eip").length
    
    if (stoppedCount > 0) {
      const waste = props.data.audit
        .filter(a => a.type === "stopped_instance")
        .reduce((sum, a) => sum + (a.estimatedWaste ?? 0), 0)
      items.push({
        type: "stopped",
        icon: "~",
        color: colors.yellow,
        text: `${stoppedCount} stopped EC2 instance${stoppedCount > 1 ? "s" : ""} (~$${waste}/mo waste)`,
      })
    }
    
    if (volumeCount > 0) {
      const waste = props.data.audit
        .filter(a => a.type === "unattached_volume")
        .reduce((sum, a) => sum + (a.estimatedWaste ?? 0), 0)
      items.push({
        type: "volume",
        icon: "~",
        color: colors.yellow,
        text: `${volumeCount} unattached EBS volume${volumeCount > 1 ? "s" : ""} (~$${waste.toFixed(0)}/mo waste)`,
      })
    }
    
    if (eipCount > 0) {
      items.push({
        type: "eip",
        icon: "~",
        color: colors.orange,
        text: `${eipCount} unused Elastic IP${eipCount > 1 ? "s" : ""} (~$${(eipCount * 3.65).toFixed(0)}/mo waste)`,
      })
    }
    
    return items
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
    const ec2Running = props.data.ec2.reduce((sum, e) => sum + e.running, 0)
    const ec2Stopped = props.data.ec2.reduce((sum, e) => sum + e.stopped, 0)
    
    return [
      { name: "EC2 Instances", value: `${ec2Running} run`, secondary: `${ec2Stopped} stop`, color: colors.green, secondaryColor: ec2Stopped > 0 ? colors.yellow : colors.textDim },
      { name: "Budgets", value: `${props.data.budgets.length}`, color: colors.blue },
      { name: "Profiles", value: `${props.data.costs.length}`, color: colors.blue },
      { name: "Regions", value: `${new Set(props.data.ec2.map(e => e.region)).size}`, color: colors.textMuted },
    ]
  })

  const maxServiceCost = () => topServices()[0]?.cost ?? 1

  // Get items for current section
  const currentSectionItems = createMemo(() => {
    switch (focusedSection()) {
      case "alerts": return alerts()
      case "services": return topServices()
      case "resources": return resources()
      case "budgets": return props.data.budgets
      case "costs": return props.data.costs
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
        // Move to next section
        const nextIdx = (currentIdx + 1) % sections.length
        setFocusedSection(sections[nextIdx]!)
        setSelectedIdx(0)
      } else {
        // Move within section
        setSelectedIdx(i => Math.min(maxItems, i + 1))
      }
      return
    }
    if (key.raw === "k" || key.name === "up") {
      if (key.shift || key.ctrl) {
        // Move to previous section
        const prevIdx = (currentIdx - 1 + sections.length) % sections.length
        setFocusedSection(sections[prevIdx]!)
        setSelectedIdx(0)
      } else {
        // Move within section
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
      if (focusedSection() === "services" && props.onNavigate) {
        props.onNavigate(1) // Services tab
      } else if (focusedSection() === "alerts" && props.onNavigate) {
        props.onNavigate(3) // Audit tab
      } else if (focusedSection() === "budgets" && props.onNavigate) {
        props.onNavigate(3) // Audit tab (shows budget alerts)
      }
      return
    }
  })

  // Stats bar items
  const statsItems = createMemo(() => [
    { label: "Current Period", value: formatCurrency(props.data.totals.currentPeriod), color: colors.accent },
    { label: "vs Last Period", value: formatChange(props.data.totals.change).text, color: formatChange(props.data.totals.change).color },
    { label: "EC2 Running", value: props.data.ec2.reduce((sum, e) => sum + e.running, 0).toString(), color: colors.green },
    { label: "Issues", value: alerts().length.toString(), color: alerts().length > 0 ? colors.orange : colors.green, alert: alerts().length > 0 },
  ])

  const hasAlerts = () => alerts().length > 0

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      {/* Stats Bar */}
      <StatsBar items={statsItems()} accentColor={colors.accent} />

      {/* Alerts Section - only show if there are alerts */}
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
            badge={5}
            focused={focusedSection() === "services"}
            accentColor={colors.accent}
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
          </OverviewSection>

          {/* Budgets */}
          <OverviewSection
            title="Budgets"
            badge={props.data.budgets.length}
            focused={focusedSection() === "budgets"}
            accentColor={colors.accent}
          >
            <Show
              when={props.data.budgets.length > 0}
              fallback={
                <box padding={1} alignItems="center" justifyContent="center" flexGrow={1}>
                  <text style={{ fg: colors.textDim }}>No budgets configured</text>
                </box>
              }
            >
              <box flexDirection="column" paddingLeft={1} paddingRight={1}>
                <For each={props.data.budgets}>
                  {(budget, idx) => {
                    const isSelected = focusedSection() === "budgets" && selectedIdx() === idx()
                    const statusColor = budget.status === "exceeded" ? colors.red : budget.status === "warning" ? colors.yellow : colors.green
                    const statusIcon = budget.status === "exceeded" ? "!" : budget.status === "warning" ? "~" : "v"
                    return (
                      <box
                        flexDirection="column"
                        backgroundColor={isSelected ? colors.bgHover : "transparent"}
                        paddingTop={idx() > 0 ? 1 : 0}
                      >
                        <box flexDirection="row" height={1}>
                          <text width={3} style={{ fg: statusColor }}>{statusIcon} </text>
                          <text style={{ fg: isSelected ? colors.text : colors.textMuted }} flexGrow={1}>
                            {budget.name}
                          </text>
                          <text style={{ fg: statusColor }}>{budget.percentUsed.toFixed(0)}%</text>
                        </box>
                        <box flexDirection="row" paddingLeft={3} height={1}>
                          <ProgressBar percent={budget.percentUsed} width={15} color={statusColor} />
                          <text style={{ fg: colors.textDim }}> {formatCurrency(budget.actual)}/{formatCurrency(budget.limit)}</text>
                        </box>
                      </box>
                    )
                  }}
                </For>
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
                      <text width={16} style={{ fg: isSelected ? colors.text : colors.textMuted }}>
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

          {/* Cost by Profile */}
          <OverviewSection
            title="Cost by Profile"
            badge={props.data.costs.length}
            focused={focusedSection() === "costs"}
            accentColor={colors.accent}
          >
            <box flexDirection="column">
              {/* Header */}
              <box flexDirection="row" backgroundColor={colors.bgHover} paddingLeft={1} paddingRight={1} height={1}>
                <text width={12} style={{ fg: colors.textMuted }}>Profile</text>
                <text width={10} style={{ fg: colors.textMuted }}>Current</text>
                <text width={8} style={{ fg: colors.textMuted }}>Change</text>
              </box>
              
              <For each={props.data.costs}>
                {(cost, idx) => {
                  const isSelected = focusedSection() === "costs" && selectedIdx() === idx()
                  const change = formatChange(cost.change)
                  return (
                    <box
                      flexDirection="row"
                      paddingLeft={1}
                      paddingRight={1}
                      height={1}
                      backgroundColor={isSelected ? colors.bgHover : (idx() % 2 === 0 ? colors.bg : colors.bgAlt)}
                    >
                      <text width={12} style={{ fg: isSelected ? colors.text : colors.textMuted }}>
                        {isSelected ? ">" : " "}{cost.profile.slice(0, 10)}
                      </text>
                      <text width={10} style={{ fg: colors.text }}>{formatCurrency(cost.currentPeriod)}</text>
                      <text width={8} style={{ fg: change.color }}>{change.text}</text>
                    </box>
                  )
                }}
              </For>
              
              {/* Total */}
              <box flexDirection="row" backgroundColor={colors.bgHover} paddingLeft={1} paddingRight={1} height={1} border={["top"]} borderColor={colors.border}>
                <text width={12} style={{ fg: colors.accent }}><b>TOTAL</b></text>
                <text width={10} style={{ fg: colors.accent }}><b>{formatCurrency(props.data.totals.currentPeriod)}</b></text>
                <text width={8} style={{ fg: formatChange(props.data.totals.change).color }}>
                  <b>{formatChange(props.data.totals.change).text}</b>
                </text>
              </box>
            </box>
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
