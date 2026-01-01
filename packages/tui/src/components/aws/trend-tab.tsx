import { createMemo, For } from "solid-js"
import type { DashboardData, TrendDataPoint } from "../providers/aws/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS, SEMANTIC_COLORS } from "../../constants/colors"

export function TrendTab(props: { data: DashboardData }) {
  const maxCost = createMemo(() => {
    const max = Math.max(...props.data.trend.map(t => t.cost))
    return max > 0 ? max : 1
  })
  
  const avgCost = createMemo(() => {
    const sum = props.data.trend.reduce((a, t) => a + t.cost, 0)
    return props.data.trend.length > 0 ? sum / props.data.trend.length : 0
  })
  
  const trendDirection = createMemo(() => {
    if (props.data.trend.length < 2) return { direction: "stable", percentage: 0 }
    
    const first = props.data.trend[0]?.cost ?? 0
    const last = props.data.trend[props.data.trend.length - 1]?.cost ?? 0
    
    if (first === 0) return { direction: "stable", percentage: 0 }
    
    const change = ((last - first) / first) * 100
    
    return {
      direction: change > 5 ? "up" : change < -5 ? "down" : "stable",
      percentage: Math.abs(change),
    }
  })
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(0)}`
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Stats row */}
      <box flexDirection="row" gap={1} marginBottom={1}>
        <StatCard 
          label="Average Monthly" 
          value={formatCurrency(avgCost())} 
          color={STATUS_COLORS.info} 
        />
        <StatCard 
          label="6-Month Trend" 
          value={`${trendDirection().direction === "up" ? "^" : trendDirection().direction === "down" ? "v" : "-"} ${trendDirection().percentage.toFixed(1)}%`}
          color={trendDirection().direction === "up" ? FINDING_COLORS.error : trendDirection().direction === "down" ? STATUS_COLORS.success : THEME_COLORS.text.secondary} 
        />
        <StatCard 
          label="Current vs Last" 
          value={(() => {
            const trend = props.data.trend
            if (trend.length < 2) return "N/A"
            const current = trend[trend.length - 1]?.cost ?? 0
            const previous = trend[trend.length - 2]?.cost ?? 0
            const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
            const arrow = change > 0 ? "^" : change < 0 ? "v" : "-"
            return `${arrow}${Math.abs(change).toFixed(1)}%`
          })()} 
          color={(() => {
            const trend = props.data.trend
            if (trend.length < 2) return THEME_COLORS.text.secondary
            const current = trend[trend.length - 1]?.cost ?? 0
            const previous = trend[trend.length - 2]?.cost ?? 0
            const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
            return change > 5 ? FINDING_COLORS.error : change < -5 ? STATUS_COLORS.success : THEME_COLORS.text.secondary
          })()}
        />
        <StatCard 
          label="Peak Month" 
          value={(() => {
            const peak = props.data.trend.reduce(
              (max, t) => t.cost > max.cost ? t : max,
              props.data.trend[0] ?? { month: "N/A", cost: 0 }
            )
            return `${peak.month} (${formatCurrency(peak.cost)})`
          })()} 
          color={FINDING_COLORS.warning} 
        />
      </box>
      
      {/* Chart */}
      <box 
        border 
        borderStyle="rounded" 
        borderColor={THEME_COLORS.border.default}
        flexDirection="column"
        flexGrow={1}
        title=" 6-Month Cost Trend "
        titleAlignment="left"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
      >
        <For each={props.data.trend}>
          {(point, idx) => {
            const barWidth = Math.max(1, Math.round((point.cost / maxCost()) * 50))
            
            // Color gradient based on relative cost
            const ratio = point.cost / maxCost()
            let color = STATUS_COLORS.success
            if (ratio > 0.8) color = FINDING_COLORS.error
            else if (ratio > 0.6) color = FINDING_COLORS.warning
            else if (ratio > 0.4) color = SEMANTIC_COLORS.warning
            else if (ratio > 0.2) color = STATUS_COLORS.info
            
            const isLatest = idx() === props.data.trend.length - 1
            
            return (
              <box flexDirection="row" height={2} paddingTop={1}>
                <text width={6} style={{ fg: isLatest ? PROVIDER_COLORS.aws.primary : THEME_COLORS.text.secondary }}>
                  {point.month}
                </text>
                <text width={10} style={{ fg: isLatest ? PROVIDER_COLORS.aws.primary : THEME_COLORS.text.secondary }}>
                  {formatCurrency(point.cost)}
                </text>
                <text>
                  <span style={{ fg: color }}>{"█".repeat(barWidth)}</span>
                  <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(50 - barWidth)}</span>
                  {isLatest && <span style={{ fg: PROVIDER_COLORS.aws.primary }}> *current</span>}
                </text>
              </box>
            )
          }}
        </For>
        
        {/* Scale indicator */}
        <box paddingTop={1} borderColor={THEME_COLORS.border.default} border={["top"]} marginTop={1}>
          <text style={{ fg: THEME_COLORS.text.muted }}>
            Scale: $0 
            <span style={{ fg: THEME_COLORS.border.default }}>{"─".repeat(20)}</span>
            {" "}{formatCurrency(maxCost())}
          </text>
        </box>
      </box>
      
      {/* Footer info */}
      <box paddingTop={1} paddingLeft={1} flexDirection="row" gap={2}>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Cost Explorer API: <span style={{ fg: FINDING_COLORS.warning }}>~$0.01/call</span>
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Updated: <span style={{ fg: THEME_COLORS.text.secondary }}>{props.data.lastUpdated.toLocaleTimeString()}</span>
        </text>
      </box>
    </box>
  )
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard(props: { label: string; value: string; color: string }) {
  return (
    <box 
      border 
      borderStyle="rounded" 
      borderColor={THEME_COLORS.border.default}
      backgroundColor={THEME_COLORS.background.secondary}
      padding={1}
      flexGrow={1}
      flexDirection="column"
      alignItems="center"
    >
      <text style={{ fg: THEME_COLORS.text.secondary }}>{props.label}</text>
      <text style={{ fg: props.color }} marginTop={1}>
        <b>{props.value}</b>
      </text>
    </box>
  )
}
