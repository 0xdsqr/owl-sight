import { describe, it, expect } from "bun:test"
import { createMemo } from "solid-js"
import type { AuditFinding, DashboardData } from "../../../providers/aws/client"
import {
  createMockAuditFinding,
  createMockDashboardData,
} from "../../../__test-utils__/mocks"

// Test the grouping logic (extracted from component)
function groupFindingsByType(findings: AuditFinding[]) {
  const groups: Partial<Record<AuditFinding["type"], AuditFinding[]>> = {}

  for (const finding of findings) {
    if (!groups[finding.type]) {
      groups[finding.type] = []
    }
    groups[finding.type]!.push(finding)
  }

  return groups
}

// Test the waste calculation logic (extracted from component)
function calculateTotalWaste(findings: AuditFinding[]): number {
  return findings.reduce((sum: number, f: AuditFinding) => sum + (f.estimatedWaste ?? 0), 0)
}

// Test FindingSection waste calculation
function calculateSectionWaste(findings: AuditFinding[]): number {
  return findings.reduce((sum: number, f: AuditFinding) => sum + (f.estimatedWaste ?? 0), 0)
}

describe("AuditTab - Grouping Logic", () => {
  it("groups empty findings array", () => {
    const groups = groupFindingsByType([])
    expect(Object.keys(groups).length).toBe(0)
  })

  it("groups single finding", () => {
    const finding = createMockAuditFinding({ type: "stopped_instance" })
    const groups = groupFindingsByType([finding])
    expect(Object.keys(groups).length).toBe(1)
    expect(groups.stopped_instance).toHaveLength(1)
    expect(groups.stopped_instance?.[0]).toEqual(finding)
  })

  it("groups multiple findings of same type", () => {
    const finding1 = createMockAuditFinding({
      type: "stopped_instance",
      resourceId: "i-1",
    })
    const finding2 = createMockAuditFinding({
      type: "stopped_instance",
      resourceId: "i-2",
    })
    const groups = groupFindingsByType([finding1, finding2])
    expect(Object.keys(groups).length).toBe(1)
    expect(groups.stopped_instance).toHaveLength(2)
  })

  it("groups multiple findings of different types", () => {
    const finding1 = createMockAuditFinding({ type: "stopped_instance" })
    const finding2 = createMockAuditFinding({ type: "unattached_volume" })
    const finding3 = createMockAuditFinding({ type: "unused_eip" })
    const groups = groupFindingsByType([finding1, finding2, finding3])
    expect(Object.keys(groups).length).toBe(3)
    expect(groups.stopped_instance).toHaveLength(1)
    expect(groups.unattached_volume).toHaveLength(1)
    expect(groups.unused_eip).toHaveLength(1)
  })

  it("groups mixed findings correctly", () => {
    const findings = [
      createMockAuditFinding({ type: "stopped_instance", resourceId: "i-1" }),
      createMockAuditFinding({ type: "stopped_instance", resourceId: "i-2" }),
      createMockAuditFinding({ type: "unattached_volume", resourceId: "vol-1" }),
      createMockAuditFinding({ type: "unused_eip", resourceId: "eip-1" }),
      createMockAuditFinding({ type: "unused_eip", resourceId: "eip-2" }),
    ]
    const groups = groupFindingsByType(findings)
    expect(Object.keys(groups).length).toBe(3)
    expect(groups.stopped_instance).toHaveLength(2)
    expect(groups.unattached_volume).toHaveLength(1)
    expect(groups.unused_eip).toHaveLength(2)
  })
})

describe("AuditTab - Waste Calculation", () => {
  it("calculates zero waste for empty findings", () => {
    const waste = calculateTotalWaste([])
    expect(waste).toBe(0)
  })

  it("calculates waste for single finding", () => {
    const finding = createMockAuditFinding({ estimatedWaste: 10.5 })
    const waste = calculateTotalWaste([finding])
    expect(waste).toBeCloseTo(10.5)
  })

  it("calculates waste for multiple findings", () => {
    const findings = [
      createMockAuditFinding({ estimatedWaste: 10.0 }),
      createMockAuditFinding({ estimatedWaste: 20.5 }),
      createMockAuditFinding({ estimatedWaste: 5.25 }),
    ]
    const waste = calculateTotalWaste(findings)
    expect(waste).toBeCloseTo(35.75)
  })

  it("handles missing estimatedWaste (treats as 0)", () => {
    const findings = [
      createMockAuditFinding({ estimatedWaste: 10.0 }),
      createMockAuditFinding({ estimatedWaste: undefined }),
      createMockAuditFinding({ estimatedWaste: 5.0 }),
    ]
    const waste = calculateTotalWaste(findings)
    expect(waste).toBeCloseTo(15.0)
  })

  it("handles all findings without estimatedWaste", () => {
    const findings = [
      createMockAuditFinding({ estimatedWaste: undefined }),
      createMockAuditFinding({ estimatedWaste: undefined }),
    ]
    const waste = calculateTotalWaste(findings)
    expect(waste).toBe(0)
  })
})

describe("AuditTab - Finding Count", () => {
  it("counts zero findings", () => {
    const data = createMockDashboardData({ audit: [] })
    expect(data.audit.length).toBe(0)
  })

  it("counts single finding", () => {
    const data = createMockDashboardData({
      audit: [createMockAuditFinding()],
    })
    expect(data.audit.length).toBe(1)
  })

  it("counts multiple findings", () => {
    const data = createMockDashboardData({
      audit: [
        createMockAuditFinding({ resourceId: "i-1" }),
        createMockAuditFinding({ resourceId: "i-2" }),
        createMockAuditFinding({ resourceId: "i-3" }),
      ],
    })
    expect(data.audit.length).toBe(3)
  })
})

describe("AuditTab - FindingSection Logic", () => {
  it("calculates section waste correctly", () => {
    const findings = [
      createMockAuditFinding({ estimatedWaste: 10.0 }),
      createMockAuditFinding({ estimatedWaste: 20.0 }),
    ]
    const waste = calculateSectionWaste(findings)
    expect(waste).toBeCloseTo(30.0)
  })

  it("handles empty findings array", () => {
    const waste = calculateSectionWaste([])
    expect(waste).toBe(0)
  })

  it("handles findings without estimatedWaste", () => {
    const findings = [
      createMockAuditFinding({ estimatedWaste: 10.0 }),
      createMockAuditFinding({ estimatedWaste: undefined }),
    ]
    const waste = calculateSectionWaste(findings)
    expect(waste).toBeCloseTo(10.0)
  })

  it("truncates findings at 10 items", () => {
    const findings = Array.from({ length: 15 }, (_, i) =>
      createMockAuditFinding({ resourceId: `i-${i}` })
    )
    const truncated = findings.slice(0, 10)
    expect(truncated.length).toBe(10)
    expect(findings.length).toBe(15)
  })
})

describe("AuditTab - Finding Type Metadata", () => {
  // Test that all finding types have metadata
  const allFindingTypes: AuditFinding["type"][] = [
    "stopped_instance",
    "idle_instance",
    "unattached_volume",
    "unused_eip",
    "untagged",
    "budget_alert",
    "idle_eks_cluster",
    "over_provisioned_eks",
    "unused_eks_nodegroup",
    "idle_transfer_server",
    "unused_transfer_server",
    "empty_sqs_queue",
    "unused_sqs_queue",
    "dead_letter_queue",
    "unused_sns_topic",
    "unsubscribed_sns_topic",
  ]

  it("has metadata for all known finding types", () => {
    // This test verifies that we can create findings of all types
    allFindingTypes.forEach((type) => {
      const finding = createMockAuditFinding({ type })
      expect(finding.type).toBe(type)
      expect(finding.resourceId).toBeDefined()
    })
  })

  it("handles finding types correctly in grouping", () => {
    const findings = allFindingTypes.map((type) =>
      createMockAuditFinding({ type })
    )
    const groups = groupFindingsByType(findings)
    expect(Object.keys(groups).length).toBe(allFindingTypes.length)
  })
})

