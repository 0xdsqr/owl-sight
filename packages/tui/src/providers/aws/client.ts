import { 
  CostExplorerClient, 
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  Granularity,
  GroupDefinitionType,
  type GetCostAndUsageCommandOutput,
} from "@aws-sdk/client-cost-explorer"
import { 
  BudgetsClient, 
  DescribeBudgetsCommand 
} from "@aws-sdk/client-budgets"
import { 
  EC2Client, 
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeAddressesCommand,
} from "@aws-sdk/client-ec2"
import { 
  STSClient, 
  GetCallerIdentityCommand 
} from "@aws-sdk/client-sts"
import { fromIni } from "@aws-sdk/credential-providers"
import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader"

// ============================================================================
// Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean
  message: string
  progress: number
}

export interface CostSummary {
  profile: string
  accountId: string
  lastPeriod: number
  currentPeriod: number
  change: number // percentage
  byService: ServiceCost[]
}

export interface ServiceCost {
  service: string
  cost: number
  percentage: number
}

export interface BudgetInfo {
  name: string
  limit: number
  actual: number
  forecasted?: number
  percentUsed: number
  status: "ok" | "warning" | "exceeded"
}

export interface EC2Summary {
  profile: string
  region: string
  running: number
  stopped: number
  total: number
}

export interface TrendDataPoint {
  month: string
  cost: number
}

export interface AuditFinding {
  type: 
    | "stopped_instance" 
    | "idle_instance"
    | "unattached_volume" 
    | "unused_eip" 
    | "untagged" 
    | "budget_alert"
    | "idle_eks_cluster"
    | "over_provisioned_eks"
    | "unused_eks_nodegroup"
    | "idle_transfer_server"
    | "unused_transfer_server"
    | "empty_sqs_queue"
    | "unused_sqs_queue"
    | "dead_letter_queue"
    | "unused_sns_topic"
    | "unsubscribed_sns_topic"
  profile: string
  region?: string
  resourceId: string
  description: string
  estimatedWaste?: number
}

export interface DashboardData {
  costs: CostSummary[]
  budgets: BudgetInfo[]
  ec2: EC2Summary[]
  trend: TrendDataPoint[]
  audit: AuditFinding[]
  totals: {
    lastPeriod: number
    currentPeriod: number
    change: number
  }
  lastUpdated: Date
}

// ============================================================================
// Profile Discovery
// ============================================================================

export async function getAvailableProfiles(): Promise<string[]> {
  try {
    const config = await loadSharedConfigFiles()
    const credProfiles = Object.keys(config.credentialsFile ?? {})
    const configProfiles = Object.keys(config.configFile ?? {})
    
    // Merge and dedupe
    const allProfiles = [...new Set([...credProfiles, ...configProfiles])]
    return allProfiles.filter(p => p !== "__default__")
  } catch (err) {
    console.error("Failed to load AWS profiles:", err)
    return []
  }
}

// ============================================================================
// Client Factory
// ============================================================================

function createClients(profile: string, region: string = "us-east-1") {
  const credentials = fromIni({ profile })
  
  return {
    // Cost Explorer is always us-east-1
    ce: new CostExplorerClient({ credentials, region: "us-east-1" }),
    budgets: new BudgetsClient({ credentials, region: "us-east-1" }),
    ec2: new EC2Client({ credentials, region }),
    sts: new STSClient({ credentials, region: "us-east-1" }),
  }
}

async function getAccountId(sts: STSClient): Promise<string> {
  const { Account } = await sts.send(new GetCallerIdentityCommand({}))
  return Account ?? "unknown"
}

// ============================================================================
// Cost Data Fetching
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!
}

export async function getCostSummary(
  ce: CostExplorerClient,
  profile: string,
  accountId: string,
  days: number
): Promise<CostSummary> {
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - days)
  
  const prevStart = new Date(currentStart)
  prevStart.setDate(prevStart.getDate() - days)

  // Fetch current period grouped by service
  const currentResp = await ce.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: formatDate(currentStart),
      End: formatDate(now),
    },
    Granularity: Granularity.MONTHLY,
    Metrics: ["UnblendedCost"],
    GroupBy: [{ Type: GroupDefinitionType.DIMENSION, Key: "SERVICE" }],
  }))

  // Fetch previous period total
  const prevResp = await ce.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: formatDate(prevStart),
      End: formatDate(currentStart),
    },
    Granularity: Granularity.MONTHLY,
    Metrics: ["UnblendedCost"],
  }))

  // Parse service costs
  const services: ServiceCost[] = []
  let currentTotal = 0
  
  for (const result of currentResp.ResultsByTime ?? []) {
    for (const group of result.Groups ?? []) {
      const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? "0")
      if (cost > 0.01) { // Filter out tiny costs
        services.push({
          service: group.Keys?.[0] ?? "Unknown",
          cost,
          percentage: 0, // Will calculate after
        })
        currentTotal += cost
      }
    }
  }
  
  // Calculate percentages and sort
  for (const svc of services) {
    svc.percentage = currentTotal > 0 ? (svc.cost / currentTotal) * 100 : 0
  }
  services.sort((a, b) => b.cost - a.cost)
  
  // Previous period total
  let prevTotal = 0
  for (const result of prevResp.ResultsByTime ?? []) {
    prevTotal += parseFloat(result.Total?.UnblendedCost?.Amount ?? "0")
  }
  
  const change = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0

  return {
    profile,
    accountId,
    lastPeriod: prevTotal,
    currentPeriod: currentTotal,
    change,
    byService: services,
  }
}

export async function getTrendData(
  ce: CostExplorerClient,
  months: number = 6
): Promise<TrendDataPoint[]> {
  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - months)
  start.setDate(1) // Start of month
  
  const resp = await ce.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: formatDate(start),
      End: formatDate(now),
    },
    Granularity: Granularity.MONTHLY,
    Metrics: ["UnblendedCost"],
  }))
  
  const trend: TrendDataPoint[] = []
  for (const result of resp.ResultsByTime ?? []) {
    const startDate = new Date(result.TimePeriod?.Start ?? "")
    const monthName = startDate.toLocaleDateString("en-US", { month: "short" })
    const cost = parseFloat(result.Total?.UnblendedCost?.Amount ?? "0")
    trend.push({ month: monthName, cost })
  }
  
  return trend
}

// ============================================================================
// Budgets
// ============================================================================

export async function getBudgets(
  client: BudgetsClient,
  accountId: string
): Promise<BudgetInfo[]> {
  try {
    const resp = await client.send(new DescribeBudgetsCommand({
      AccountId: accountId,
    }))

    return (resp.Budgets ?? []).map(b => {
      const limit = parseFloat(b.BudgetLimit?.Amount ?? "0")
      const actual = parseFloat(b.CalculatedSpend?.ActualSpend?.Amount ?? "0")
      const forecasted = b.CalculatedSpend?.ForecastedSpend?.Amount 
        ? parseFloat(b.CalculatedSpend.ForecastedSpend.Amount)
        : undefined
      const percentUsed = limit > 0 ? (actual / limit) * 100 : 0
      
      let status: "ok" | "warning" | "exceeded" = "ok"
      if (percentUsed >= 100) status = "exceeded"
      else if (percentUsed >= 80) status = "warning"
      
      return {
        name: b.BudgetName ?? "Unknown",
        limit,
        actual,
        forecasted,
        percentUsed,
        status,
      }
    })
  } catch (err) {
    // Budgets API might not be enabled
    console.log("Budgets API error (may not be enabled):", err)
    return []
  }
}

// ============================================================================
// EC2 Summary
// ============================================================================

export async function getEC2Summary(
  ec2: EC2Client,
  profile: string,
  region: string
): Promise<EC2Summary> {
  try {
    const resp = await ec2.send(new DescribeInstancesCommand({}))
    
    let running = 0
    let stopped = 0
    
    for (const reservation of resp.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        const state = instance.State?.Name
        if (state === "running") running++
        else if (state === "stopped") stopped++
      }
    }
    
    return { profile, region, running, stopped, total: running + stopped }
  } catch (err) {
    console.log(`EC2 API error for ${profile}/${region}:`, err)
    return { profile, region, running: 0, stopped: 0, total: 0 }
  }
}

// ============================================================================
// Audit Findings
// ============================================================================

export async function getAuditFindings(
  ec2: EC2Client,
  budgets: BudgetInfo[],
  profile: string,
  region: string
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  
  try {
    // Stopped instances
    const instances = await ec2.send(new DescribeInstancesCommand({
      Filters: [{ Name: "instance-state-name", Values: ["stopped"] }]
    }))
    
    for (const reservation of instances.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        findings.push({
          type: "stopped_instance",
          profile,
          region,
          resourceId: instance.InstanceId ?? "unknown",
          description: `Stopped instance: ${instance.InstanceType}`,
          estimatedWaste: 5, // Rough estimate for EBS costs
        })
      }
    }
    
    // Unattached volumes
    const volumes = await ec2.send(new DescribeVolumesCommand({
      Filters: [{ Name: "status", Values: ["available"] }]
    }))
    
    for (const volume of volumes.Volumes ?? []) {
      const sizeGb = volume.Size ?? 0
      const monthlyEstimate = sizeGb * 0.10 // ~$0.10/GB for gp2
      findings.push({
        type: "unattached_volume",
        profile,
        region,
        resourceId: volume.VolumeId ?? "unknown",
        description: `Unattached ${sizeGb}GB ${volume.VolumeType} volume`,
        estimatedWaste: monthlyEstimate,
      })
    }
    
    // Unused Elastic IPs
    const eips = await ec2.send(new DescribeAddressesCommand({}))
    
    for (const addr of eips.Addresses ?? []) {
      if (!addr.AssociationId) {
        findings.push({
          type: "unused_eip",
          profile,
          region,
          resourceId: addr.PublicIp ?? "unknown",
          description: `Unused Elastic IP`,
          estimatedWaste: 3.65, // ~$0.005/hr = ~$3.65/mo
        })
      }
    }
  } catch (err) {
    console.log(`Audit error for ${profile}/${region}:`, err)
  }
  
  // Budget alerts
  for (const budget of budgets) {
    if (budget.status !== "ok") {
      findings.push({
        type: "budget_alert",
        profile,
        resourceId: budget.name,
        description: `Budget "${budget.name}" at ${budget.percentUsed.toFixed(0)}% (${budget.status})`,
      })
    }
  }
  
  return findings
}

// ============================================================================
// Main Data Loader
// ============================================================================

export async function loadAllData(
  profiles: string[],
  regions: string[],
  timeRange: number,
  onProgress: (state: LoadingState) => void
): Promise<DashboardData> {
  const costs: CostSummary[] = []
  const allBudgets: BudgetInfo[] = []
  const ec2Summaries: EC2Summary[] = []
  const allTrend: TrendDataPoint[] = []
  const allAudit: AuditFinding[] = []
  
  const totalSteps = profiles.length * (1 + regions.length) + 1 // costs + ec2 per region + trend
  let currentStep = 0
  
  const updateProgress = (message: string) => {
    currentStep++
    onProgress({
      isLoading: true,
      message,
      progress: Math.round((currentStep / totalSteps) * 100),
    })
  }
  
  // Process each profile
  for (const profile of profiles) {
    try {
      const clients = createClients(profile, regions[0] ?? "us-east-1")
      const accountId = await getAccountId(clients.sts)
      
      // Get costs
      updateProgress(`Loading costs for ${profile}...`)
      const costData = await getCostSummary(clients.ce, profile, accountId, timeRange)
      costs.push(costData)
      
      // Get budgets (only once per account)
      const budgets = await getBudgets(clients.budgets, accountId)
      allBudgets.push(...budgets)
      
      // Get trend data (only need once, same for all profiles in same account)
      if (allTrend.length === 0) {
        const trend = await getTrendData(clients.ce)
        allTrend.push(...trend)
      }
      
      // Get EC2 and audit for each region
      for (const region of regions) {
        updateProgress(`Scanning ${profile}/${region}...`)
        const ec2Client = new EC2Client({ 
          credentials: fromIni({ profile }), 
          region 
        })
        
        const ec2Summary = await getEC2Summary(ec2Client, profile, region)
        ec2Summaries.push(ec2Summary)
        
        const audit = await getAuditFindings(ec2Client, budgets, profile, region)
        allAudit.push(...audit)
      }
    } catch (err) {
      console.error(`Error processing profile ${profile}:`, err)
    }
  }
  
  // Calculate totals
  const totals = {
    lastPeriod: costs.reduce((sum, c) => sum + c.lastPeriod, 0),
    currentPeriod: costs.reduce((sum, c) => sum + c.currentPeriod, 0),
    change: 0,
  }
  totals.change = totals.lastPeriod > 0 
    ? ((totals.currentPeriod - totals.lastPeriod) / totals.lastPeriod) * 100 
    : 0
  
  onProgress({ isLoading: false, message: "", progress: 100 })
  
  return {
    costs,
    budgets: allBudgets,
    ec2: ec2Summaries,
    trend: allTrend,
    audit: allAudit,
    totals,
    lastUpdated: new Date(),
  }
}
