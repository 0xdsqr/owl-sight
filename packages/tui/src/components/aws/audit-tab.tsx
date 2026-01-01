import { createMemo, For, Show } from "solid-js"
import type { DashboardData, AuditFinding } from "../providers/aws/client"
import { FINDING_COLORS, THEME_COLORS, STATUS_COLORS } from "../../constants/colors"

// Define finding type metadata with type safety
const FINDING_TYPE_METADATA = {
  // Existing types
  stopped_instance: { icon: "[EC2]", label: "Stopped EC2 Instances", color: FINDING_COLORS.warning },
  idle_instance: { icon: "[EC2]", label: "Idle EC2 Instances", color: FINDING_COLORS.warning },
  unattached_volume: { icon: "[EBS]", label: "Unattached EBS Volumes", color: FINDING_COLORS.warningAlt },
  unused_eip: { icon: "[EIP]", label: "Unused Elastic IPs", color: FINDING_COLORS.info },
  budget_alert: { icon: "[BUD]", label: "Budget Alerts", color: FINDING_COLORS.error },
  untagged: { icon: "[TAG]", label: "Untagged Resources", color: FINDING_COLORS.neutral },
  // EKS
  idle_eks_cluster: { icon: "[EKS]", label: "Idle EKS Clusters", color: FINDING_COLORS.warning },
  over_provisioned_eks: { icon: "[EKS]", label: "Over-Provisioned EKS Nodes", color: FINDING_COLORS.warningAlt },
  unused_eks_nodegroup: { icon: "[EKS]", label: "Unused EKS Node Groups", color: FINDING_COLORS.warningAlt },
  // Transfer Family
  idle_transfer_server: { icon: "[XFR]", label: "Idle Transfer Family Servers", color: FINDING_COLORS.warning },
  unused_transfer_server: { icon: "[XFR]", label: "Unused Transfer Family Servers", color: FINDING_COLORS.warningAlt },
  // SQS
  empty_sqs_queue: { icon: "[SQS]", label: "Empty SQS Queues", color: FINDING_COLORS.info },
  unused_sqs_queue: { icon: "[SQS]", label: "Unused SQS Queues", color: FINDING_COLORS.warningAlt },
  dead_letter_queue: { icon: "[SQS]", label: "Dead Letter Queues with Old Messages", color: FINDING_COLORS.warning },
  // SNS
  unused_sns_topic: { icon: "[SNS]", label: "Unused SNS Topics", color: FINDING_COLORS.info },
  unsubscribed_sns_topic: { icon: "[SNS]", label: "SNS Topics with No Subscriptions", color: FINDING_COLORS.warningAlt },
} as const satisfies Record<
  AuditFinding["type"],
  { icon: string; label: string; color: string }
>

// Helper function to get metadata with fallback
const getTypeMetadata = (type: AuditFinding["type"]) => {
  return FINDING_TYPE_METADATA[type] ?? {
    icon: "[???]",
    label: type,
    color: FINDING_COLORS.neutral,
  }
}

export function AuditTab(props: { data: DashboardData }) {
  // Group findings by type - type-safe and dynamic
  const groupedFindings = createMemo(() => {
    const groups: Partial<Record<AuditFinding["type"], AuditFinding[]>> = {}
    
    for (const finding of props.data.audit) {
      if (!groups[finding.type]) {
        groups[finding.type] = []
      }
      groups[finding.type]!.push(finding)
    }
    
    return groups
  })
  
  const totalWaste = createMemo(() => {
    return props.data.audit.reduce((sum: number, f: AuditFinding) => sum + (f.estimatedWaste ?? 0), 0)
  })
  
  const findingCount = createMemo(() => props.data.audit.length)
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Summary cards */}
      <box flexDirection="row" gap={1} marginBottom={1}>
        {/* Total findings */}
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
          <text style={{ fg: THEME_COLORS.text.secondary }}>Total Findings</text>
          <text style={{ fg: findingCount() > 0 ? FINDING_COLORS.warning : STATUS_COLORS.success }} marginTop={1}>
            <b>{findingCount()}</b>
          </text>
        </box>
        
        {/* Estimated waste */}
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
          <text style={{ fg: THEME_COLORS.text.secondary }}>Est. Monthly Waste</text>
          <text style={{ fg: totalWaste() > 0 ? FINDING_COLORS.error : STATUS_COLORS.success }} marginTop={1}>
            <b>{formatCurrency(totalWaste())}/mo</b>
          </text>
        </box>
        
        {/* Categories with issues */}
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
          <text style={{ fg: THEME_COLORS.text.secondary }}>Categories Affected</text>
          <text style={{ fg: THEME_COLORS.text.secondary }} marginTop={1}>
            <b>{Object.keys(groupedFindings()).length}</b>
          </text>
        </box>
      </box>
      
      {/* Findings list */}
      <box 
        border 
        borderStyle="rounded" 
        borderColor={THEME_COLORS.border.default}
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
                <text style={{ fg: STATUS_COLORS.success }}>[v] No issues found!</text>
                <text style={{ fg: THEME_COLORS.text.muted }} marginTop={1}>
                  Your AWS resources are well-optimized.
                </text>
              </box>
            }
          >
            {/* Dynamically render all finding types */}
            <For each={Object.entries(groupedFindings())}>
              {([type, findings]) => {
                const metadata = getTypeMetadata(type as AuditFinding["type"])
                return (
                  <FindingSection
                    icon={metadata.icon}
                    label={metadata.label}
                    color={metadata.color}
                    findings={findings ?? []}
                  />
                )
              }}
            </For>
          </Show>
        </scrollbox>
      </box>
      
      {/* Actions hint */}
      <box paddingTop={1} paddingLeft={1}>
        <text style={{ fg: THEME_COLORS.text.muted }}>
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
            <text style={{ fg: FINDING_COLORS.error }} marginLeft={2}>
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
              <text style={{ fg: THEME_COLORS.text.muted }}>|- </text>
              <text style={{ fg: THEME_COLORS.text.secondary }} width={20}>
                {finding.resourceId.length > 18 
                  ? finding.resourceId.slice(0, 16) + ".." 
                  : finding.resourceId}
              </text>
              <text style={{ fg: THEME_COLORS.text.muted }} marginLeft={1}>
                ({finding.profile}
                {finding.region ? `/${finding.region}` : ""})
              </text>
              <Show when={finding.estimatedWaste}>
                <text style={{ fg: FINDING_COLORS.error }} marginLeft={1}>
                  ~${finding.estimatedWaste?.toFixed(2)}/mo
                </text>
              </Show>
            </box>
          )}
        </For>
        
        <Show when={props.findings.length > 10}>
          <text style={{ fg: THEME_COLORS.text.muted }} paddingLeft={2}>
            |- ... and {props.findings.length - 10} more
          </text>
        </Show>
      </box>
    </Show>
  )
}
