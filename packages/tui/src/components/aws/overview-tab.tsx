import { For, Show } from "solid-js"
import type { DashboardData } from "../../providers/aws/client"

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
        <text style={{ fg: "#ff9900" }}>
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
      
      {/* Profiles */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>Profiles</text>
        <text style={{ fg: "#58a6ff" }}>{props.data.costs.length}</text>
      </box>
      
      <text style={{ fg: "#30363d" }}>|</text>
      
      {/* EC2 Running */}
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: "#8b949e" }}>EC2 Running</text>
        <text style={{ fg: "#7ee787" }}>
          {props.data.ec2.reduce((sum, e) => sum + e.running, 0)}
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
      title=" Cost by Profile "
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
        <text width={16} style={{ fg: "#8b949e" }}><b>Profile</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Account</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Last</b></text>
        <text width={12} style={{ fg: "#8b949e" }}><b>Current</b></text>
        <text width={10} style={{ fg: "#8b949e" }}><b>Change</b></text>
      </box>
      
      {/* Data rows */}
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
              <text width={16} style={{ fg: "#c9d1d9" }}>{cost.profile}</text>
              <text width={12} style={{ fg: "#484f58" }}>{cost.accountId.slice(-8)}</text>
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
        <text width={16} style={{ fg: "#ff9900" }}><b>TOTAL</b></text>
        <text width={12} style={{ fg: "#484f58" }}>--</text>
        <text width={12} style={{ fg: "#ff9900" }}>{formatCurrency(props.data.totals.lastPeriod)}</text>
        <text width={12} style={{ fg: "#ff9900" }}><b>{formatCurrency(props.data.totals.currentPeriod)}</b></text>
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
    const colors = ["#ff9900", "#f0883e", "#d29922", "#a371f7", "#58a6ff"]
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
      case "exceeded": return "#f85149"
      case "warning": return "#d29922"
      default: return "#7ee787"
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
      borderColor="#30363d"
      flexDirection="column"
      flexGrow={1}
      title=" Budgets "
      titleAlignment="left"
    >
      <Show 
        when={props.budgets.length > 0}
        fallback={
          <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
            <text style={{ fg: "#484f58" }}>No budgets configured</text>
            <text style={{ fg: "#30363d" }} marginTop={1}>Set up budgets in AWS Console</text>
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
                  <text style={{ fg: "#c9d1d9" }} flexGrow={1}>{budget.name}</text>
                  <text style={{ fg: color }}>
                    {budget.percentUsed.toFixed(0)}%
                  </text>
                </box>
                <box flexDirection="row" gap={1} paddingLeft={4}>
                  <text>
                    <span style={{ fg: color }}>{"█".repeat(filled)}</span>
                    <span style={{ fg: "#21262d" }}>{"░".repeat(empty)}</span>
                  </text>
                  <text style={{ fg: "#484f58" }}>
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
      borderColor="#30363d"
      flexDirection="column"
      flexGrow={1}
      title=" EC2 Instances "
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
        <text width={12} style={{ fg: "#8b949e" }}><b>Profile</b></text>
        <text width={8} style={{ fg: "#8b949e" }}><b>Run</b></text>
        <text width={8} style={{ fg: "#8b949e" }}><b>Stop</b></text>
        <text width={6} style={{ fg: "#8b949e" }}><b>Tot</b></text>
      </box>
      
      <For each={aggregated()}>
        {(row, idx) => (
          <box 
            flexDirection="row" 
            paddingLeft={1}
            paddingRight={1}
            height={1}
            backgroundColor={idx() % 2 === 0 ? "#0d1117" : "#161b22"}
          >
            <text width={12} style={{ fg: "#c9d1d9" }}>{row.profile}</text>
            <text width={8} style={{ fg: "#7ee787" }}>{row.running}</text>
            <text width={8} style={{ fg: row.stopped > 0 ? "#d29922" : "#484f58" }}>
              {row.stopped}
            </text>
            <text width={6} style={{ fg: "#8b949e" }}>{row.total}</text>
          </box>
        )}
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
        <text width={12} style={{ fg: "#ff9900" }}><b>TOTAL</b></text>
        <text width={8} style={{ fg: "#7ee787" }}><b>{totals().running}</b></text>
        <text width={8} style={{ fg: totals().stopped > 0 ? "#d29922" : "#484f58" }}>
          <b>{totals().stopped}</b>
        </text>
        <text width={6} style={{ fg: "#ff9900" }}><b>{totals().total}</b></text>
      </box>
    </box>
  )
}
