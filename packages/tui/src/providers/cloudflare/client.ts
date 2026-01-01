// src/providers/cloudflare/client.ts

import Cloudflare from 'cloudflare'

// ============================================================================
// Types (matching AWS structure for UI compatibility)
// ============================================================================

export interface CloudflareCostSummary {
  accountId: string
  accountName: string
  plan: string
  lastPeriod: number
  currentPeriod: number
  change: number
  byService: ServiceCost[]
}

export interface ServiceCost {
  service: string
  cost: number
  percentage: number
}

export interface ZoneSummary {
  accountId: string
  zoneId: string
  zoneName: string
  status: 'active' | 'paused' | 'pending'
  plan: string
  requests30d: number
  bandwidth30d: number
  cacheHitRate: number
  threats30d: number
}

export interface WorkerSummary {
  accountId: string
  scriptName: string
  requests30d: number
  cpuTime30d: number
  errors30d: number
  lastDeployed: Date
  estimatedCost: number
}

export interface R2BucketSummary {
  accountId: string
  bucketName: string
  storageBytes: number
  objectCount: number
  operationsA30d: number  // Class A (writes)
  operationsB30d: number  // Class B (reads)
  estimatedCost: number
  lastAccessed?: Date
}

export interface AuditFinding {
  type: 
    | 'idle_worker' 
    | 'unused_zone' 
    | 'unused_feature' 
    | 'low_cache_hit' 
    | 'stale_r2_bucket'
    | 'unused_kv_namespace'
  accountId: string
  resourceId: string
  resourceName: string
  description: string
  estimatedWaste?: number
  suggestion: string
}

export interface DashboardData {
  costs: CloudflareCostSummary[]
  zones: ZoneSummary[]
  workers: WorkerSummary[]
  r2Buckets: R2BucketSummary[]
  audit: AuditFinding[]
  totals: {
    lastPeriod: number
    currentPeriod: number
    change: number
    totalRequests: number
    totalBandwidth: number
  }
  lastUpdated: Date
}

// ============================================================================
// Client Factory
// ============================================================================

export function createCloudflareClient(apiToken: string) {
  return new Cloudflare({ apiToken })
}

// ============================================================================
// Account Discovery
// ============================================================================

export async function getAccounts(client: Cloudflare): Promise<{ id: string; name: string }[]> {
  try {
    const accounts = await client.accounts.list()
    // Handle different response shapes
    const result = (accounts as any).result ?? accounts
    if (!Array.isArray(result)) return []
    return result.map((acc: any) => ({
      id: acc.id ?? '',
      name: acc.name ?? '',
    }))
  } catch {
    return []
  }
}

// ============================================================================
// Billing Data
// ============================================================================

export async function getBillingSummary(
  client: Cloudflare,
  accountId: string
): Promise<CloudflareCostSummary> {
  // Note: Cloudflare billing API may require special permissions
  // This is a best-effort implementation
  
  let currentPeriod = 0
  let lastPeriod = 0
  const byService: ServiceCost[] = []
  let planName = 'Free'
  
  try {
    // Try to get subscriptions for cost info
    const subscriptions = await (client.accounts as any).subscriptions?.get?.({ 
      account_id: accountId 
    })
    
    const subs = (subscriptions as any)?.result ?? []
    
    const subArray = Array.isArray(subs) ? subs : []
    subArray.forEach(sub => {
      const cost = sub.price ?? 0
      currentPeriod += cost
      if (sub.component_name || sub.name) {
        byService.push({
          service: sub.component_name ?? sub.name ?? 'Unknown',
          cost,
          percentage: 0,
        })
      }
    })
    
    if (subs[0]?.name) {
      planName = subs[0].name
    }
  } catch {
    // Billing API not available or no permission
  }
  
  // Calculate percentages
  const total = byService.reduce((sum, svc) => sum + svc.cost, 0)
  byService.forEach(svc => {
    svc.percentage = total > 0 ? (svc.cost / total) * 100 : 0
  })
  byService.sort((a, b) => b.cost - a.cost)
  
  const change = lastPeriod > 0 ? ((currentPeriod - lastPeriod) / lastPeriod) * 100 : 0

  return {
    accountId,
    accountName: '',
    plan: planName,
    lastPeriod,
    currentPeriod,
    change,
    byService,
  }
}

// ============================================================================
// Zone Analytics
// ============================================================================

export async function getZoneAnalytics(
  client: Cloudflare,
  accountId: string,
  days: number = 30
): Promise<ZoneSummary[]> {
  try {
    const zones = await client.zones.list({ account: { id: accountId } })
    const zoneList = (zones as any).result ?? zones
    
    if (!Array.isArray(zoneList)) return []
    
    return zoneList.map(zone => ({
      accountId,
      zoneId: zone.id ?? '',
      zoneName: zone.name ?? '',
      status: (zone.status as 'active' | 'paused' | 'pending') ?? 'pending',
      plan: zone.plan?.name ?? 'Free',
      requests30d: 0, // Would need analytics API
      bandwidth30d: 0,
      cacheHitRate: 0,
      threats30d: 0,
    }))
  } catch {
    return []
  }
}

// ============================================================================
// Workers Analytics
// ============================================================================

export async function getWorkersAnalytics(
  client: Cloudflare,
  accountId: string
): Promise<WorkerSummary[]> {
  try {
    const workers = await client.workers.scripts.list({ account_id: accountId })
    const workerList = (workers as any).result ?? workers
    
    if (!Array.isArray(workerList)) return []
    
    return workerList.map(worker => ({
      accountId,
      scriptName: worker.id ?? worker.name ?? 'unknown',
      requests30d: 0, // Would need analytics API
      cpuTime30d: 0,
      errors30d: 0,
      lastDeployed: new Date(worker.modified_on ?? Date.now()),
      estimatedCost: 0,
    }))
  } catch {
    return []
  }
}

// ============================================================================
// R2 Storage
// ============================================================================

export async function getR2Buckets(
  client: Cloudflare,
  accountId: string
): Promise<R2BucketSummary[]> {
  try {
    const response = await client.r2.buckets.list({ account_id: accountId })
    // R2 API returns buckets directly or in a result wrapper
    const buckets = (response as any).buckets ?? (response as any).result?.buckets ?? []
    
    if (!Array.isArray(buckets)) return []
    
    return buckets.map(bucket => {
      const storageBytes = bucket.size ?? 0
      const storageGB = storageBytes / (1024 ** 3)
      return {
        accountId,
        bucketName: bucket.name ?? 'unknown',
        storageBytes,
        objectCount: bucket.object_count ?? 0,
        operationsA30d: 0,
        operationsB30d: 0,
        estimatedCost: storageGB * 0.015, // R2 pricing: $0.015/GB/month
        lastAccessed: undefined,
      }
    })
  } catch {
    return []
  }
}

// ============================================================================
// Audit Findings
// ============================================================================

export async function runAudit(
  zones: ZoneSummary[],
  workers: WorkerSummary[],
  r2Buckets: R2BucketSummary[]
): Promise<AuditFinding[]> {
  // Check for idle workers (no requests in 30 days)
  const idleWorkerFindings = workers
    .filter(worker => worker.requests30d === 0)
    .map(worker => ({
      type: 'idle_worker' as const,
      accountId: worker.accountId,
      resourceId: worker.scriptName,
      resourceName: worker.scriptName,
      description: `Worker "${worker.scriptName}" has 0 requests in 30 days`,
      estimatedWaste: 5,
      suggestion: 'Consider deleting this worker if no longer needed',
    }))
  
  // Check for paused zones with paid features
  const unusedZoneFindings = zones
    .filter(zone => zone.status === 'paused' && zone.plan !== 'Free')
    .map(zone => ({
      type: 'unused_zone' as const,
      accountId: zone.accountId,
      resourceId: zone.zoneId,
      resourceName: zone.zoneName,
      description: `Zone "${zone.zoneName}" is paused but on ${zone.plan} plan`,
      estimatedWaste: 20,
      suggestion: 'Downgrade to Free or delete if no longer needed',
    }))
  
  // Check for low cache hit rates
  const lowCacheFindings = zones
    .filter(zone => zone.status === 'active' && zone.requests30d > 10000 && zone.cacheHitRate < 50)
    .map(zone => ({
      type: 'low_cache_hit' as const,
      accountId: zone.accountId,
      resourceId: zone.zoneId,
      resourceName: zone.zoneName,
      description: `Zone "${zone.zoneName}" has low cache hit rate (${zone.cacheHitRate.toFixed(1)}%)`,
      suggestion: 'Add Page Rules or Cache Rules to improve caching',
    }))
  
  // Check for potentially stale R2 buckets
  const staleR2Findings = r2Buckets
    .filter(bucket => bucket.storageBytes > 1024 ** 3 && bucket.operationsB30d === 0)
    .map(bucket => ({
      type: 'stale_r2_bucket' as const,
      accountId: bucket.accountId,
      resourceId: bucket.bucketName,
      resourceName: bucket.bucketName,
      description: `R2 bucket "${bucket.bucketName}" has ${(bucket.storageBytes / 1024 ** 3).toFixed(1)}GB but no reads in 30 days`,
      estimatedWaste: bucket.estimatedCost,
      suggestion: 'Review if this data is still needed or can be archived',
    }))
  
  return [...idleWorkerFindings, ...unusedZoneFindings, ...lowCacheFindings, ...staleR2Findings]
}

// ============================================================================
// Main Data Loader
// ============================================================================

export async function loadAllData(
  apiToken: string,
  accountIds: string[],
  onProgress: (state: { isLoading: boolean; message: string; progress: number }) => void
): Promise<DashboardData> {
  const client = createCloudflareClient(apiToken)
  
  // If no account IDs provided, try to discover them
  let accounts = accountIds
  if (accounts.length === 0) {
    onProgress({ isLoading: true, message: 'Discovering accounts...', progress: 5 })
    const discovered = await getAccounts(client)
    accounts = discovered.map(a => a.id)
  }
  
  if (accounts.length === 0) {
    // Return empty data if no accounts found
    return {
      costs: [],
      zones: [],
      workers: [],
      r2Buckets: [],
      audit: [],
      totals: {
        lastPeriod: 0,
        currentPeriod: 0,
        change: 0,
        totalRequests: 0,
        totalBandwidth: 0,
      },
      lastUpdated: new Date(),
    }
  }
  
  const costs: CloudflareCostSummary[] = []
  const allZones: ZoneSummary[] = []
  const allWorkers: WorkerSummary[] = []
  const allR2: R2BucketSummary[] = []
  
  let step = 0
  const totalSteps = accounts.length * 4
  
  for (const accountId of accounts) {
    onProgress({ isLoading: true, message: `Loading billing for ${accountId.slice(0, 8)}...`, progress: (++step / totalSteps) * 100 })
    const billing = await getBillingSummary(client, accountId)
    costs.push(billing)
    
    onProgress({ isLoading: true, message: `Loading zones for ${accountId.slice(0, 8)}...`, progress: (++step / totalSteps) * 100 })
    const zones = await getZoneAnalytics(client, accountId)
    allZones.push(...zones)
    
    onProgress({ isLoading: true, message: `Loading workers for ${accountId.slice(0, 8)}...`, progress: (++step / totalSteps) * 100 })
    const workers = await getWorkersAnalytics(client, accountId)
    allWorkers.push(...workers)
    
    onProgress({ isLoading: true, message: `Loading R2 for ${accountId.slice(0, 8)}...`, progress: (++step / totalSteps) * 100 })
    const r2 = await getR2Buckets(client, accountId)
    allR2.push(...r2)
  }
  
  onProgress({ isLoading: true, message: 'Aggregating service costs...', progress: 90 })

  // Aggregate R2 and Workers costs into byService for each account
  for (const cost of costs) {
    // Aggregate R2 costs for this account
    const accountR2 = allR2.filter(r2 => r2.accountId === cost.accountId)
    const r2TotalCost = accountR2.reduce((sum, bucket) => sum + bucket.estimatedCost, 0)

    if (r2TotalCost > 0) {
      cost.byService.push({
        service: 'R2 Storage',
        cost: r2TotalCost,
        percentage: 0, // Will recalculate below
      })
      cost.currentPeriod += r2TotalCost
    }

    // Aggregate Workers costs for this account
    const accountWorkers = allWorkers.filter(w => w.accountId === cost.accountId)
    const workersTotalCost = accountWorkers.reduce((sum, worker) => sum + worker.estimatedCost, 0)

    if (workersTotalCost > 0) {
      cost.byService.push({
        service: 'Workers',
        cost: workersTotalCost,
        percentage: 0, // Will recalculate below
      })
      cost.currentPeriod += workersTotalCost
    }

    // Recalculate percentages now that we have all services
    const total = cost.byService.reduce((sum, svc) => sum + svc.cost, 0)
    cost.byService.forEach(svc => {
      svc.percentage = total > 0 ? (svc.cost / total) * 100 : 0
    })

    // Re-sort by cost descending
    cost.byService.sort((a, b) => b.cost - a.cost)
  }

  onProgress({ isLoading: true, message: 'Running audit...', progress: 95 })
  const audit = await runAudit(allZones, allWorkers, allR2)

  const totals = {
    lastPeriod: costs.reduce((sum, c) => sum + c.lastPeriod, 0),
    currentPeriod: costs.reduce((sum, c) => sum + c.currentPeriod, 0),
    change: 0,
    totalRequests: allZones.reduce((sum, z) => sum + z.requests30d, 0),
    totalBandwidth: allZones.reduce((sum, z) => sum + z.bandwidth30d, 0),
  }
  totals.change = totals.lastPeriod > 0
    ? ((totals.currentPeriod - totals.lastPeriod) / totals.lastPeriod) * 100
    : 0
  
  onProgress({ isLoading: false, message: '', progress: 100 })
  
  return {
    costs,
    zones: allZones,
    workers: allWorkers,
    r2Buckets: allR2,
    audit,
    totals,
    lastUpdated: new Date(),
  }
}
