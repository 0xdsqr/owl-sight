import { For, Show } from "solid-js"
import type { DashboardData } from "../providers/aws/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS, SEMANTIC_COLORS, BRAND_COLORS } from "../../constants/colors"

// Service icons (ASCII art style)
const SERVICE_ICONS: Record<string, string> = {
  "Amazon EC2": "[EC2]",
  "Amazon S3": "[S3]",
  "Amazon RDS": "[RDS]",
  "AWS Lambda": "[LAM]",
  "Amazon DynamoDB": "[DDB]",
  "Amazon CloudFront": "[CF]",
  "Amazon EBS": "[EBS]",
  "Amazon VPC": "[VPC]",
  "AWS Support": "[SUP]",
  "Tax": "[TAX]",
  "default": "[...]",
}

export function OverviewTab(props: { data: DashboardData }) {
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
        
        {/* Right: Budgets + EC2 */}
        <box flexDirection="column" gap={1} flexGrow={1}>
          <BudgetsPanel budgets={props.data.budgets} />
          <EC2Panel ec2={props.data.ec2} />
        </box>
      </box>
    </box>
  )
}

// ============================================================================
// Top Stats Bar - Quick overview numbers
// ============================================================================

function TopStatsBar(props: { data: DashboardData }) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
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
        <text style={{ fg: PROVIDER_COLORS.aws.primary }}>
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
      
      {/* Profiles */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>Profiles</text>
        <text style={{ fg: STATUS_COLORS.info }}>{props.data.costs.length}</text>
      </box>
      
      <text style={{ fg: THEME_COLORS.border.default }}>|</text>
      
      {/* EC2 Running */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: THEME_COLORS.text.secondary }}>EC2 Running</text>
        <text style={{ fg: STATUS_COLORS.success }}>
          {props.data.ec2.reduce((sum, e) => sum + e.running, 0)}
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
      title=" Cost by Profile "
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
        <text width={16} style={{ fg: THEME_COLORS.text.secondary }}><b>Profile</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Account</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Last</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Current</b></text>
        <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Change</b></text>
      </box>
      
      {/* Data rows */}
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
              <text width={16} style={{ fg: THEME_COLORS.text.primary }}>{cost.profile}</text>
              <text width={12} style={{ fg: THEME_COLORS.text.muted }}>{cost.accountId.slice(-8)}</text>
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
        <text width={16} style={{ fg: PROVIDER_COLORS.aws.primary }}><b>TOTAL</b></text>
        <text width={12} style={{ fg: THEME_COLORS.text.muted }}>--</text>
        <text width={12} style={{ fg: PROVIDER_COLORS.aws.primary }}>{formatCurrency(props.data.totals.lastPeriod)}</text>
        <text width={12} style={{ fg: PROVIDER_COLORS.aws.primary }}><b>{formatCurrency(props.data.totals.currentPeriod)}</b></text>
        {(() => {
          const change = formatChange(props.data.totals.change)
          return <text width={10} style={{ fg: change.color }}><b>{change.text}</b></text>
        })()}
      </box>
    </box>
  )
}

// ============================================================================
// Top Services Panel - Shows top spending services with icons
// ============================================================================

function TopServicesPanel(props: { data: DashboardData }) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }
  
  // Aggregate services across all profiles
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
  
  const getIcon = (service: string) => SERVICE_ICONS[service] ?? SERVICE_ICONS["default"]
  
  const getBarColor = (idx: number) => {
    const colors = [PROVIDER_COLORS.aws.primary, SEMANTIC_COLORS.warning, FINDING_COLORS.warning, BRAND_COLORS.owlPurple, STATUS_COLORS.info]
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
              <text width={6} style={{ fg: getBarColor(idx()) }}>{getIcon(svc.service)}</text>
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
    </box>
  )
}

// ============================================================================
// Budgets Panel
// ============================================================================

function BudgetsPanel(props: { budgets: DashboardData["budgets"] }) {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded": return FINDING_COLORS.error
      case "warning": return FINDING_COLORS.warning
      default: return STATUS_COLORS.success
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "exceeded": return "[!]"
      case "warning": return "[~]"
      default: return "[v]"
    }
  }

  return (
    <box 
      border 
      borderStyle="rounded" 
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      flexGrow={1}
      title=" Budgets "
      titleAlignment="left"
    >
      <Show 
        when={props.budgets.length > 0}
        fallback={
          <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
            <text style={{ fg: THEME_COLORS.text.muted }}>No budgets configured</text>
            <text style={{ fg: THEME_COLORS.border.default }} marginTop={1}>Set up budgets in AWS Console</text>
          </box>
        }
      >
        <For each={props.budgets}>
          {(budget) => {
            const barWidth = 15
            const filled = Math.min(Math.round((budget.percentUsed / 100) * barWidth), barWidth)
            const empty = barWidth - filled
            const color = getStatusColor(budget.status)
            
            return (
              <box 
                flexDirection="column" 
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
              >
                <box flexDirection="row">
                  <text style={{ fg: color }}>{getStatusIcon(budget.status)} </text>
                  <text style={{ fg: THEME_COLORS.text.primary }} flexGrow={1}>{budget.name}</text>
                  <text style={{ fg: color }}>
                    {budget.percentUsed.toFixed(0)}%
                  </text>
                </box>
                <box flexDirection="row" gap={1} paddingLeft={4}>
                  <text>
                    <span style={{ fg: color }}>{"█".repeat(filled)}</span>
                    <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(empty)}</span>
                  </text>
                  <text style={{ fg: THEME_COLORS.text.muted }}>
                    {formatCurrency(budget.actual)}/{formatCurrency(budget.limit)}
                  </text>
                </box>
              </box>
            )
          }}
        </For>
      </Show>
    </box>
  )
}

// ============================================================================
// EC2 Panel
// ============================================================================

function EC2Panel(props: { ec2: DashboardData["ec2"] }) {
  // Aggregate by profile
  const aggregated = () => {
    const byProfile = new Map<string, { running: number, stopped: number, total: number }>()
    
    for (const ec2 of props.ec2) {
      const existing = byProfile.get(ec2.profile) ?? { running: 0, stopped: 0, total: 0 }
      existing.running += ec2.running
      existing.stopped += ec2.stopped
      existing.total += ec2.total
      byProfile.set(ec2.profile, existing)
    }
    
    return Array.from(byProfile.entries()).map(([profile, stats]) => ({
      profile,
      ...stats,
    }))
  }
  
  const totals = () => {
    return props.ec2.reduce(
      (acc, ec2) => ({
        running: acc.running + ec2.running,
        stopped: acc.stopped + ec2.stopped,
        total: acc.total + ec2.total,
      }),
      { running: 0, stopped: 0, total: 0 }
    )
  }

  return (
    <box 
      border 
      borderStyle="rounded" 
      borderColor={THEME_COLORS.border.default}
      flexDirection="column"
      flexGrow={1}
      title=" EC2 Instances "
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
        <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Profile</b></text>
        <text width={8} style={{ fg: THEME_COLORS.text.secondary }}><b>Run</b></text>
        <text width={8} style={{ fg: THEME_COLORS.text.secondary }}><b>Stop</b></text>
        <text width={6} style={{ fg: THEME_COLORS.text.secondary }}><b>Tot</b></text>
      </box>
      
      <For each={aggregated()}>
        {(row, idx) => (
          <box 
            flexDirection="row" 
            paddingLeft={1}
            paddingRight={1}
            height={1}
            backgroundColor={idx() % 2 === 0 ? THEME_COLORS.background.primary : THEME_COLORS.background.secondary}
          >
            <text width={12} style={{ fg: THEME_COLORS.text.primary }}>{row.profile}</text>
            <text width={8} style={{ fg: STATUS_COLORS.success }}>{row.running}</text>
            <text width={8} style={{ fg: row.stopped > 0 ? FINDING_COLORS.warning : THEME_COLORS.text.muted }}>
              {row.stopped}
            </text>
            <text width={6} style={{ fg: THEME_COLORS.text.secondary }}>{row.total}</text>
          </box>
        )}
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
        <text width={12} style={{ fg: PROVIDER_COLORS.aws.primary }}><b>TOTAL</b></text>
        <text width={8} style={{ fg: STATUS_COLORS.success }}><b>{totals().running}</b></text>
        <text width={8} style={{ fg: totals().stopped > 0 ? FINDING_COLORS.warning : THEME_COLORS.text.muted }}>
          <b>{totals().stopped}</b>
        </text>
        <text width={6} style={{ fg: PROVIDER_COLORS.aws.primary }}><b>{totals().total}</b></text>
      </box>
    </box>
  )
}
