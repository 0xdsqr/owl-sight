import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, ServiceCost } from "../../providers/aws/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS } from "../../constants/colors"

// Service categories for grouping
const SERVICE_CATEGORIES: Record<string, string[]> = {
  "Compute": ["Amazon EC2", "AWS Lambda", "Amazon ECS", "AWS Fargate", "Amazon Lightsail"],
  "Storage": ["Amazon S3", "Amazon EBS", "Amazon EFS", "AWS Backup", "Amazon Glacier"],
  "Database": ["Amazon RDS", "Amazon DynamoDB", "Amazon ElastiCache", "Amazon Redshift"],
  "Network": ["Amazon VPC", "Amazon CloudFront", "AWS Direct Connect", "Elastic Load Balancing"],
  "Other": [],
}

export function ServicesTab(props: { data: DashboardData }) {
  const [selectedProfile, setSelectedProfile] = createSignal<string | "all">("all")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [viewMode, setViewMode] = createSignal<"list" | "category">("list")
  
  // Aggregate services across all profiles or filter to one
  const services = createMemo(() => {
    const serviceMap = new Map<string, number>()
    
    const costs = selectedProfile() === "all" 
      ? props.data.costs 
      : props.data.costs.filter(c => c.profile === selectedProfile())
    
    for (const cost of costs) {
      for (const svc of cost.byService) {
        serviceMap.set(svc.service, (serviceMap.get(svc.service) ?? 0) + svc.cost)
      }
    }
    
    const total = Array.from(serviceMap.values()).reduce((a, b) => a + b, 0)
    
    return Array.from(serviceMap.entries())
      .map(([service, cost]) => ({
        service,
        cost,
        percentage: total > 0 ? (cost / total) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 20)
  })
  
  const profiles = createMemo(() => ["all", ...props.data.costs.map(c => c.profile)])
  
  const maxCost = createMemo(() => {
    const max = services()[0]?.cost ?? 0
    return max > 0 ? max : 1
  })
  
  const totalCost = createMemo(() => services().reduce((sum, s) => sum + s.cost, 0))
  
  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "left" || key.raw === "h") {
      const profs = profiles()
      const currentIdx = profs.indexOf(selectedProfile())
      setSelectedProfile(profs[(currentIdx - 1 + profs.length) % profs.length]!)
    } else if (key.name === "right" || key.raw === "l") {
      const profs = profiles()
      const currentIdx = profs.indexOf(selectedProfile())
      setSelectedProfile(profs[(currentIdx + 1) % profs.length]!)
    } else if (key.name === "up" || key.raw === "k") {
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (key.name === "down" || key.raw === "j") {
      setSelectedIndex(i => Math.min(services().length - 1, i + 1))
    } else if (key.raw === "v") {
      setViewMode(m => m === "list" ? "category" : "list")
    }
  })

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}k`
    return `$${amount.toFixed(2)}`
  }
  
  const getBarColor = (percentage: number, isSelected: boolean) => {
    if (isSelected) return PROVIDER_COLORS.aws.primary
    if (percentage > 30) return FINDING_COLORS.error
    if (percentage > 15) return FINDING_COLORS.warning
    return STATUS_COLORS.info
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Profile selector bar */}
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
        <text style={{ fg: THEME_COLORS.text.secondary }}>Profile:</text>
        <For each={profiles()}>
          {(profile) => {
            const isActive = () => selectedProfile() === profile
            return (
              <box 
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isActive() ? THEME_COLORS.background.tertiary : "transparent"}
                borderColor={isActive() ? PROVIDER_COLORS.aws.primary : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? PROVIDER_COLORS.aws.primary : THEME_COLORS.text.secondary }}>
                  {profile === "all" ? "All" : profile}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: THEME_COLORS.text.muted }}>
          <span style={{ fg: THEME_COLORS.text.secondary }}>h/l</span> profile  
          <span style={{ fg: THEME_COLORS.text.secondary }}>j/k</span> select
        </text>
      </box>
      
      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Services list */}
        <box 
          border 
          borderStyle="rounded" 
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          flexGrow={2}
          title=" Cost by Service "
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
            <text width={24} style={{ fg: THEME_COLORS.text.secondary }}><b>Service</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Cost</b></text>
            <text width={7} style={{ fg: THEME_COLORS.text.secondary }}><b>%</b></text>
            <text style={{ fg: THEME_COLORS.text.secondary }}><b>Distribution</b></text>
          </box>
          
          {/* Scrollable content */}
          <scrollbox
            scrollbarOptions={{ visible: true }}
            flexGrow={1}
            contentOptions={{ gap: 0 }}
          >
            <For each={services()}>
              {(svc, index) => {
                const isSelected = () => index() === selectedIndex()
                const barWidth = Math.max(1, Math.round((svc.cost / maxCost()) * 28))
                const color = getBarColor(svc.percentage, isSelected())
                
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
                      {svc.service.length > 22 
                        ? svc.service.slice(0, 20) + ".." 
                        : svc.service}
                    </text>
                    <text 
                      width={10} 
                      style={{ fg: isSelected() ? PROVIDER_COLORS.aws.primary : THEME_COLORS.text.secondary }}
                    >
                      {formatCurrency(svc.cost)}
                    </text>
                    <text 
                      width={7} 
                      style={{ fg: THEME_COLORS.text.muted }}
                    >
                      {svc.percentage.toFixed(1)}%
                    </text>
                    <text>
                      <span style={{ fg: color }}>{"█".repeat(barWidth)}</span>
                      <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(28 - barWidth)}</span>
                    </text>
                  </box>
                )
              }}
            </For>
          </scrollbox>
        </box>
        
        {/* Side panel - selected service details */}
        <box 
          border 
          borderStyle="rounded" 
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          width={30}
          title=" Details "
          titleAlignment="left"
        >
          <Show 
            when={services()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: THEME_COLORS.text.muted }}>Select a service</text>
              </box>
            }
          >
            {(() => {
              const svc = () => services()[selectedIndex()]!
              return (
                <box flexDirection="column" padding={1} gap={1}>
                  <text style={{ fg: PROVIDER_COLORS.aws.primary }}><b>{svc().service}</b></text>
                  
                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Cost</text>
                    <text style={{ fg: THEME_COLORS.text.primary }}>{formatCurrency(svc().cost)}</text>
                  </box>
                  
                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>% of Total</text>
                    <text style={{ fg: THEME_COLORS.text.primary }}>{svc().percentage.toFixed(2)}%</text>
                  </box>
                  
                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Rank</text>
                    <text style={{ fg: STATUS_COLORS.info }}>#{selectedIndex() + 1} of {services().length}</text>
                  </box>
                  
                  {/* Visual percentage bar */}
                  <box marginTop={2}>
                    <text style={{ fg: THEME_COLORS.text.muted }}>Share of spend:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: PROVIDER_COLORS.aws.primary }}>{"█".repeat(Math.round(svc().percentage / 5))}</span>
                        <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(20 - Math.round(svc().percentage / 5))}</span>
                      </text>
                    </box>
                  </box>
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
          Showing <span style={{ fg: STATUS_COLORS.info }}>{services().length}</span> services
          {selectedProfile() !== "all" ? ` for ${selectedProfile()}` : ""}
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Total: <span style={{ fg: PROVIDER_COLORS.aws.primary }}>{formatCurrency(totalCost())}</span>
        </text>
      </box>
    </box>
  )
}
