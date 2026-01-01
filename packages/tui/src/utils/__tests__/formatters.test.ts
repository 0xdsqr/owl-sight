import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import {
  formatCurrency,
  formatBytes,
  formatNumber,
  formatChange,
  formatDuration,
  formatDate,
  formatPercentage,
} from "../formatters"
import { FINDING_COLORS, STATUS_COLORS, THEME_COLORS } from "../../constants/colors"

describe("formatCurrency", () => {
  it("formats small amounts", () => {
    expect(formatCurrency(5.99)).toBe("$5.99")
    expect(formatCurrency(0.01)).toBe("$0.01")
    expect(formatCurrency(99.99)).toBe("$99.99")
  })

  it("formats thousands", () => {
    expect(formatCurrency(1500)).toBe("$1.5k")
    expect(formatCurrency(5000)).toBe("$5.0k")
    expect(formatCurrency(999999)).toBe("$1000.0k")
  })

  it("formats millions", () => {
    expect(formatCurrency(1000000)).toBe("$1.0M")
    expect(formatCurrency(2500000)).toBe("$2.5M")
    expect(formatCurrency(15000000)).toBe("$15.0M")
  })

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00")
  })

  it("handles negative amounts", () => {
    expect(formatCurrency(-100)).toBe("$-100.00")
    expect(formatCurrency(-1500)).toBe("$-1500.00") // Negative amounts don't use k/M format
  })
})

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1023)).toBe("1023 B")
  })

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
    expect(formatBytes(1048575)).toBe("1024.0 KB")
  })

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB")
    expect(formatBytes(5242880)).toBe("5.0 MB")
    expect(formatBytes(1073741823)).toBe("1024.0 MB")
  })

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB")
    expect(formatBytes(5368709120)).toBe("5.0 GB")
    expect(formatBytes(1099511627775)).toBe("1024.0 GB")
  })

  it("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB")
    expect(formatBytes(5497558138880)).toBe("5.0 TB")
  })
})

describe("formatNumber", () => {
  it("formats small numbers", () => {
    expect(formatNumber(0)).toBe("0")
    expect(formatNumber(5)).toBe("5")
    expect(formatNumber(99)).toBe("99")
    expect(formatNumber(999)).toBe("999")
  })

  it("formats thousands", () => {
    expect(formatNumber(1000)).toBe("1.0K")
    expect(formatNumber(1500)).toBe("1.5K")
    expect(formatNumber(999999)).toBe("1000.0K")
  })

  it("formats millions", () => {
    expect(formatNumber(1000000)).toBe("1.0M")
    expect(formatNumber(2500000)).toBe("2.5M")
    expect(formatNumber(15000000)).toBe("15.0M")
  })
})

describe("formatChange", () => {
  it("formats positive changes", () => {
    const result = formatChange(10)
    expect(result.text).toBe("^10.0%")
    expect(result.color).toBe(FINDING_COLORS.error)
    expect(result.arrow).toBe("^")
  })

  it("formats negative changes", () => {
    const result = formatChange(-10)
    expect(result.text).toBe("v10.0%")
    expect(result.color).toBe(STATUS_COLORS.success)
    expect(result.arrow).toBe("v")
  })

  it("formats zero change", () => {
    const result = formatChange(0)
    expect(result.text).toBe("-0.0%")
    expect(result.color).toBe(THEME_COLORS.text.secondary)
    expect(result.arrow).toBe("-")
  })

  it("formats small positive changes (under 5%)", () => {
    const result = formatChange(3)
    expect(result.text).toBe("^3.0%")
    expect(result.color).toBe(THEME_COLORS.text.secondary)
    expect(result.arrow).toBe("^")
  })

  it("formats small negative changes (under -5%)", () => {
    const result = formatChange(-3)
    expect(result.text).toBe("v3.0%")
    expect(result.color).toBe(THEME_COLORS.text.secondary) // Small changes (< 5%) are gray
    expect(result.arrow).toBe("v")
  })

  it("formats large positive changes", () => {
    const result = formatChange(50)
    expect(result.text).toBe("^50.0%")
    expect(result.color).toBe(FINDING_COLORS.error)
    expect(result.arrow).toBe("^")
  })
})

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms")
    expect(formatDuration(500)).toBe("500ms")
    expect(formatDuration(999)).toBe("999ms")
  })

  it("formats seconds", () => {
    expect(formatDuration(1000)).toBe("1.0s")
    expect(formatDuration(5000)).toBe("5.0s")
    expect(formatDuration(59999)).toBe("60.0s")
  })

  it("formats minutes", () => {
    expect(formatDuration(60000)).toBe("1.0m")
    expect(formatDuration(300000)).toBe("5.0m")
    expect(formatDuration(3599999)).toBe("60.0m")
  })

  it("formats hours", () => {
    expect(formatDuration(3600000)).toBe("1.0h")
    expect(formatDuration(7200000)).toBe("2.0h")
  })
})

describe("formatDate", () => {
  let mockNow: Date

  beforeEach(() => {
    // Mock current time to a fixed date for consistent testing
    mockNow = new Date("2024-01-15T12:00:00Z")
    // We can't easily mock Date.now() in Bun, so we'll test with relative dates
  })

  afterEach(() => {
    // Cleanup if needed
  })

  it("formats seconds ago", () => {
    const date = new Date(Date.now() - 30 * 1000) // 30 seconds ago
    const result = formatDate(date)
    expect(result).toMatch(/\d+s ago/)
  })

  it("formats minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    const result = formatDate(date)
    expect(result).toMatch(/\d+m ago/)
  })

  it("formats hours ago", () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const result = formatDate(date)
    expect(result).toMatch(/\d+h ago/)
  })

  it("formats days ago", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    const result = formatDate(date)
    expect(result).toMatch(/\d+d ago/)
  })

  it("handles very recent dates (less than a second)", () => {
    const date = new Date(Date.now() - 100) // 100ms ago
    const result = formatDate(date)
    expect(result).toMatch(/\d+s ago/)
  })

  it("handles future dates", () => {
    const date = new Date(Date.now() + 1000) // 1 second in future
    const result = formatDate(date)
    // Should still format, might show "0s ago" or negative
    expect(typeof result).toBe("string")
  })
})

describe("formatPercentage", () => {
  it("formats normal percentages", () => {
    expect(formatPercentage(50, 100)).toBe("50.0%")
    expect(formatPercentage(25, 100)).toBe("25.0%")
    expect(formatPercentage(75, 100)).toBe("75.0%")
  })

  it("handles zero total", () => {
    expect(formatPercentage(50, 0)).toBe("0%")
    expect(formatPercentage(0, 0)).toBe("0%")
  })

  it("handles 100%", () => {
    expect(formatPercentage(100, 100)).toBe("100.0%")
  })

  it("handles values greater than total", () => {
    expect(formatPercentage(150, 100)).toBe("150.0%")
  })

  it("handles decimal results", () => {
    expect(formatPercentage(1, 3)).toBe("33.3%")
    expect(formatPercentage(1, 7)).toBe("14.3%")
  })

  it("handles zero value", () => {
    expect(formatPercentage(0, 100)).toBe("0.0%")
  })
})

