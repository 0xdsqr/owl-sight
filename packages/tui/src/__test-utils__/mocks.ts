import type {
  AuditFinding,
  BudgetInfo,
  CostSummary,
  DashboardData,
  EC2Summary,
  ServiceCost,
  TrendDataPoint,
} from "../providers/aws/client"

/**
 * Mock data factories for testing
 */

export function createMockAuditFinding(
  overrides?: Partial<AuditFinding>
): AuditFinding {
  return {
    type: "stopped_instance",
    profile: "default",
    region: "us-east-1",
    resourceId: "i-1234567890abcdef0",
    description: "Stopped instance: t3.micro",
    estimatedWaste: 5.0,
    ...overrides,
  }
}

export function createMockBudgetInfo(
  overrides?: Partial<BudgetInfo>
): BudgetInfo {
  return {
    name: "Monthly Budget",
    limit: 1000,
    actual: 500,
    forecasted: 600,
    percentUsed: 50,
    status: "ok",
    ...overrides,
  }
}

export function createMockServiceCost(
  overrides?: Partial<ServiceCost>
): ServiceCost {
  return {
    service: "Amazon EC2",
    cost: 100.0,
    percentage: 50.0,
    ...overrides,
  }
}

export function createMockCostSummary(
  overrides?: Partial<CostSummary>
): CostSummary {
  return {
    profile: "default",
    accountId: "123456789012",
    lastPeriod: 1000,
    currentPeriod: 1200,
    change: 20,
    byService: [createMockServiceCost()],
    ...overrides,
  }
}

export function createMockEC2Summary(
  overrides?: Partial<EC2Summary>
): EC2Summary {
  return {
    profile: "default",
    region: "us-east-1",
    running: 5,
    stopped: 2,
    total: 7,
    ...overrides,
  }
}

export function createMockTrendDataPoint(
  overrides?: Partial<TrendDataPoint>
): TrendDataPoint {
  return {
    month: "Jan",
    cost: 1000,
    ...overrides,
  }
}

export function createMockDashboardData(
  overrides?: Partial<DashboardData>
): DashboardData {
  return {
    costs: [createMockCostSummary()],
    budgets: [createMockBudgetInfo()],
    ec2: [createMockEC2Summary()],
    trend: [createMockTrendDataPoint()],
    audit: [createMockAuditFinding()],
    totals: {
      lastPeriod: 1000,
      currentPeriod: 1200,
      change: 20,
    },
    lastUpdated: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  }
}

/**
 * AWS API Response Mocks
 */

export function createMockGetCostAndUsageResponse() {
  return {
    ResultsByTime: [
      {
        TimePeriod: {
          Start: "2024-01-01",
          End: "2024-02-01",
        },
        Total: {
          UnblendedCost: {
            Amount: "1200.00",
            Unit: "USD",
          },
        },
        Groups: [
          {
            Keys: ["Amazon EC2"],
            Metrics: {
              UnblendedCost: {
                Amount: "800.00",
                Unit: "USD",
              },
            },
          },
          {
            Keys: ["Amazon S3"],
            Metrics: {
              UnblendedCost: {
                Amount: "400.00",
                Unit: "USD",
              },
            },
          },
        ],
      },
    ],
  }
}

export function createMockDescribeBudgetsResponse() {
  return {
    Budgets: [
      {
        BudgetName: "Monthly Budget",
        BudgetLimit: {
          Amount: "1000.00",
          Unit: "USD",
        },
        CalculatedSpend: {
          ActualSpend: {
            Amount: "500.00",
            Unit: "USD",
          },
          ForecastedSpend: {
            Amount: "600.00",
            Unit: "USD",
          },
        },
      },
    ],
  }
}

export function createMockDescribeInstancesResponse() {
  return {
    Reservations: [
      {
        Instances: [
          {
            InstanceId: "i-1234567890abcdef0",
            InstanceType: "t3.micro",
            State: {
              Name: "running",
            },
          },
          {
            InstanceId: "i-0987654321fedcba0",
            InstanceType: "t3.small",
            State: {
              Name: "stopped",
            },
          },
        ],
      },
    ],
  }
}

export function createMockDescribeVolumesResponse() {
  return {
    Volumes: [
      {
        VolumeId: "vol-1234567890abcdef0",
        Size: 100,
        VolumeType: "gp2",
        State: "available",
      },
    ],
  }
}

export function createMockDescribeAddressesResponse() {
  return {
    Addresses: [
      {
        PublicIp: "203.0.113.1",
        AssociationId: "eipassoc-12345678",
      },
      {
        PublicIp: "203.0.113.2",
        // No AssociationId = unused
      },
    ],
  }
}

export function createMockGetCallerIdentityResponse() {
  return {
    Account: "123456789012",
    Arn: "arn:aws:iam::123456789012:user/test",
    UserId: "AIDAIOSFODNN7EXAMPLE",
  }
}

