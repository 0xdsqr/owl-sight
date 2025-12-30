import { createMemo, For, Show } from "solid-js"
import type { DashboardData, AuditFinding } from "../providers/aws/client"

export function AuditTab(props: { data: DashboardData }) {
  // Group findings by type
  const groupedFindings = createMemo(() => {
    const groups: Record<string, AuditFinding[]> = {
      stopped_instance: [],
      unattached_volume: [],
      unused_eip: [],
      budget_alert: [],
      untagged: [],
    }
    
    for (const finding of props.data.audit) {
      if (groups[finding.type]) {
        groups[finding.type]!.push(finding)
      }
    }
    
    return groups
  })
  
  const totalWaste = createMemo(() => {
    return props.data.audit.reduce((sum: number, f: AuditFinding) => sum + (f.estimatedWaste ?? 0), 0)
  })
  
  const findingCount = createMemo(() => props.data.audit.length)
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "stopped_instance": return "[EC2]"
      case "unattached_volume": return "[EBS]"
      case "unused_eip": return "[EIP]"
      case "budget_alert": return "[BUD]"
      case "untagged": return "[TAG]"
      default: return "[???]"
    }
  }
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "stopped_instance": return "Stopped EC2 Instances"
      case "unattached_volume": return "Unattached EBS Volumes"
      case "unused_eip": return "Unused Elastic IPs"
      case "budget_alert": return "Budget Alerts"
      case "untagged": return "Untagged Resources"
      default: return type
    }
  }
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case "budget_alert": return "#f85149"
      case "stopped_instance": return "#d29922"
      case "unattached_volume": return "#f0883e"
      case "unused_eip": return "#58a6ff"
      default: return "#8b949e"
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Summary cards */}
      <box flexDirection="row" gap={1} marginBottom={1}>
        {/* Total findings */}
        <box 
          border 
          borderStyle="rounded" 
          borderColor="#30363d"
          backgroundColor="#161b22"
          padding={1}
          flexGrow={1}
          flexDirection="column"
          alignItems="center"
        >
          <text style={{ fg: "#8b949e" }}>Total Findings</text>
          <text style={{ fg: findingCount() > 0 ? "#d29922" : "#7ee787" }} marginTop={1}>
            <b>{findingCount()}</b>
          </text>
        </box>
        
        {/* Estimated waste */}
        <box 
          border 
          borderStyle="rounded" 
          borderColor="#30363d"
          backgroundColor="#161b22"
          padding={1}
          flexGrow={1}
          flexDirection="column"
          alignItems="center"
        >
          <text style={{ fg: "#8b949e" }}>Est. Monthly Waste</text>
          <text style={{ fg: totalWaste() > 0 ? "#f85149" : "#7ee787" }} marginTop={1}>
            <b>{formatCurrency(totalWaste())}/mo</b>
          </text>
        </box>
        
        {/* Categories with issues */}
        <box 
          border 
          borderStyle="rounded" 
          borderColor="#30363d"
          backgroundColor="#161b22"
          padding={1}
          flexGrow={1}
          flexDirection="column"
          alignItems="center"
        >
          <text style={{ fg: "#8b949e" }}>Categories Affected</text>
          <text style={{ fg: "#8b949e" }} marginTop={1}>
            <b>{Object.values(groupedFindings()).filter(g => g.length > 0).length}</b> / 5
          </text>
        </box>
      </box>
      
      {/* Findings list */}
      <box 
        border 
        borderStyle="rounded" 
        borderColor="#30363d"
        flexDirection="column"
        flexGrow={1}
        title=" FinOps Audit Findings "
        titleAlignment="left"
      >
        <scrollbox
          scrollbarOptions={{ visible: true }}
          flexGrow={1}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          contentOptions={{ gap: 1 }}
        >
          <Show 
            when={findingCount() > 0}
            fallback={
              <box 
                padding={2} 
                alignItems="center" 
                justifyContent="center"
                flexGrow={1}
                flexDirection="column"
              >
                <text style={{ fg: "#7ee787" }}>[v] No issues found!</text>
                <text style={{ fg: "#484f58" }} marginTop={1}>
                  Your AWS resources are well-optimized.
                </text>
              </box>
            }
          >
            {/* Stopped instances */}
            <FindingSection
              icon={getTypeIcon("stopped_instance")}
              label={getTypeLabel("stopped_instance")}
              color={getTypeColor("stopped_instance")}
              findings={groupedFindings().stopped_instance ?? []}
            />
            
            {/* Unattached volumes */}
            <FindingSection
              icon={getTypeIcon("unattached_volume")}
              label={getTypeLabel("unattached_volume")}
              color={getTypeColor("unattached_volume")}
              findings={groupedFindings().unattached_volume ?? []}
            />
            
            {/* Unused EIPs */}
            <FindingSection
              icon={getTypeIcon("unused_eip")}
              label={getTypeLabel("unused_eip")}
              color={getTypeColor("unused_eip")}
              findings={groupedFindings().unused_eip ?? []}
            />
            
            {/* Budget alerts */}
            <FindingSection
              icon={getTypeIcon("budget_alert")}
              label={getTypeLabel("budget_alert")}
              color={getTypeColor("budget_alert")}
              findings={groupedFindings().budget_alert ?? []}
            />
          </Show>
        </scrollbox>
      </box>
      
      {/* Actions hint */}
      <box paddingTop={1} paddingLeft={1}>
        <text style={{ fg: "#484f58" }}>
          Tip: Terminate stopped instances or delete unused resources to reduce costs
        </text>
      </box>
    </box>
  )
}

function FindingSection(props: {
  icon: string
  label: string
  color: string
  findings: AuditFinding[]
}) {
  const totalWaste = () => props.findings.reduce((sum: number, f: AuditFinding) => sum + (f.estimatedWaste ?? 0), 0)
  
  return (
    <Show when={props.findings.length > 0}>
      <box flexDirection="column" marginBottom={1}>
        {/* Section header */}
        <box flexDirection="row" marginBottom={1}>
          <text style={{ fg: props.color }}>
            <b>{props.icon} {props.label} ({props.findings.length})</b>
          </text>
          <Show when={totalWaste() > 0}>
            <text style={{ fg: "#f85149" }} marginLeft={2}>
              Est. ${totalWaste().toFixed(2)}/mo
            </text>
          </Show>
        </box>
        
        {/* Findings */}
        <For each={props.findings.slice(0, 10)}>
          {(finding) => (
            <box 
              flexDirection="row" 
              paddingLeft={2}
              height={1}
            >
              <text style={{ fg: "#484f58" }}>|- </text>
              <text style={{ fg: "#8b949e" }} width={20}>
                {finding.resourceId.length > 18 
                  ? finding.resourceId.slice(0, 16) + ".." 
                  : finding.resourceId}
              </text>
              <text style={{ fg: "#484f58" }} marginLeft={1}>
                ({finding.profile}
                {finding.region ? `/${finding.region}` : ""})
              </text>
              <Show when={finding.estimatedWaste}>
                <text style={{ fg: "#f85149" }} marginLeft={1}>
                  ~${finding.estimatedWaste?.toFixed(2)}/mo
                </text>
              </Show>
            </box>
          )}
        </For>
        
        <Show when={props.findings.length > 10}>
          <text style={{ fg: "#484f58" }} paddingLeft={2}>
            |- ... and {props.findings.length - 10} more
          </text>
        </Show>
      </box>
    </Show>
  )
}
