import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, R2BucketSummary } from "../providers/cloudflare/client"
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS } from "../../constants/colors"

export function CloudflareR2(props: { data: DashboardData }) {
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [sortBy, setSortBy] = createSignal<"name" | "size" | "cost">("size")

  const sortedBuckets = createMemo(() => {
    const buckets = [...props.data.r2Buckets]
    const sort = sortBy()

    if (sort === "name") {
      buckets.sort((a, b) => a.bucketName.localeCompare(b.bucketName))
    } else if (sort === "size") {
      buckets.sort((a, b) => b.storageBytes - a.storageBytes)
    } else if (sort === "cost") {
      buckets.sort((a, b) => b.estimatedCost - a.estimatedCost)
    }

    return buckets
  })

  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "up" || key.raw === "k") {
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (key.name === "down" || key.raw === "j") {
      setSelectedIndex(i => Math.min(sortedBuckets().length - 1, i + 1))
    } else if (key.raw === "s") {
      setSortBy(s => {
        if (s === "name") return "size"
        if (s === "size") return "cost"
        return "name"
      })
      setSelectedIndex(0)
    }
  })

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)}TB`
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)}GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)}MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)}KB`
    return `${bytes}B`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
    return `$${amount.toFixed(2)}`
  }

  const totalStorage = () => sortedBuckets().reduce((sum, b) => sum + b.storageBytes, 0)
  const totalObjects = () => sortedBuckets().reduce((sum, b) => sum + b.objectCount, 0)
  const totalCost = () => sortedBuckets().reduce((sum, b) => sum + b.estimatedCost, 0)

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Sort bar */}
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
        <text style={{ fg: THEME_COLORS.text.secondary }}>Sort by:</text>
        <For each={[
          { key: "name", label: "Name" },
          { key: "size", label: "Size" },
          { key: "cost", label: "Cost" }
        ] as const}>
          {(option) => {
            const isActive = () => sortBy() === option.key
            return (
              <box
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isActive() ? THEME_COLORS.background.tertiary : "transparent"}
                borderColor={isActive() ? PROVIDER_COLORS.cloudflare.primary : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? PROVIDER_COLORS.cloudflare.primary : THEME_COLORS.text.secondary }}>
                  {option.label}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: THEME_COLORS.text.muted }}>
          <span style={{ fg: THEME_COLORS.text.secondary }}>s</span> sort
          <span style={{ fg: THEME_COLORS.text.secondary }}>j/k</span> select
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Buckets list */}
        <box
          border
          borderStyle="rounded"
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          flexGrow={2}
          title=" R2 Buckets "
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
            <text width={24} style={{ fg: THEME_COLORS.text.secondary }}><b>Bucket Name</b></text>
            <text width={12} style={{ fg: THEME_COLORS.text.secondary }}><b>Storage</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Objects</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Reads</b></text>
            <text width={10} style={{ fg: THEME_COLORS.text.secondary }}><b>Cost/mo</b></text>
          </box>

          {/* Scrollable content */}
          <Show
            when={sortedBuckets().length > 0}
            fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: THEME_COLORS.text.muted }}>No R2 buckets found</text>
              </box>
            }
          >
            <scrollbox
              scrollbarOptions={{ visible: true }}
              flexGrow={1}
              contentOptions={{ gap: 0 }}
            >
              <For each={sortedBuckets()}>
                {(bucket, index) => {
                  const isSelected = () => index() === selectedIndex()
                  const isStale = bucket.storageBytes > 1024 ** 3 && bucket.operationsB30d === 0

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
                        {bucket.bucketName.length > 22
                          ? bucket.bucketName.slice(0, 20) + ".."
                          : bucket.bucketName}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? STATUS_COLORS.info : THEME_COLORS.text.secondary }}
                      >
                        {formatBytes(bucket.storageBytes)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? STATUS_COLORS.success : THEME_COLORS.text.secondary }}
                      >
                        {formatNumber(bucket.objectCount)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isStale ? FINDING_COLORS.warning : THEME_COLORS.text.secondary }}
                      >
                        {bucket.operationsB30d > 0 ? formatNumber(bucket.operationsB30d) : "--"}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? PROVIDER_COLORS.cloudflare.primary : THEME_COLORS.text.secondary }}
                      >
                        {formatCurrency(bucket.estimatedCost)}
                      </text>
                    </box>
                  )
                }}
              </For>
            </scrollbox>

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
              <text width={24} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>TOTAL</b></text>
              <text width={12} style={{ fg: STATUS_COLORS.info }}><b>{formatBytes(totalStorage())}</b></text>
              <text width={10} style={{ fg: STATUS_COLORS.success }}><b>{formatNumber(totalObjects())}</b></text>
              <text width={10} style={{ fg: THEME_COLORS.text.muted }}>--</text>
              <text width={10} style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{formatCurrency(totalCost())}</b></text>
            </box>
          </Show>
        </box>

        {/* Side panel - selected bucket details */}
        <box
          border
          borderStyle="rounded"
          borderColor={THEME_COLORS.border.default}
          flexDirection="column"
          width={32}
          title=" Details "
          titleAlignment="left"
        >
          <Show
            when={sortedBuckets()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: THEME_COLORS.text.muted }}>Select a bucket</text>
              </box>
            }
          >
            {(() => {
              const bucket = () => sortedBuckets()[selectedIndex()]!
              const costPerGB = () => {
                const gb = bucket().storageBytes / (1024 ** 3)
                return gb > 0 ? bucket().estimatedCost / gb : 0
              }
              const isStale = () => bucket().storageBytes > 1024 ** 3 && bucket().operationsB30d === 0

              return (
                <box flexDirection="column" padding={1} gap={1}>
                  <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{bucket().bucketName}</b></text>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Account ID</text>
                    <text style={{ fg: THEME_COLORS.text.muted }}>{bucket().accountId.slice(0, 12)}...</text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Storage Size</text>
                    <text style={{ fg: STATUS_COLORS.info }}><b>{formatBytes(bucket().storageBytes)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Object Count</text>
                    <text style={{ fg: STATUS_COLORS.success }}>{formatNumber(bucket().objectCount)}</text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Avg Size/Object</text>
                    <text style={{ fg: THEME_COLORS.text.muted }}>
                      {bucket().objectCount > 0
                        ? formatBytes(bucket().storageBytes / bucket().objectCount)
                        : "N/A"}
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Class A Ops (30d)</text>
                    <text style={{ fg: STATUS_COLORS.info }}>
                      {bucket().operationsA30d > 0 ? formatNumber(bucket().operationsA30d) : "0"}
                    </text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Class B Ops (30d)</text>
                    <text style={{ fg: isStale() ? FINDING_COLORS.warning : STATUS_COLORS.info }}>
                      {bucket().operationsB30d > 0 ? formatNumber(bucket().operationsB30d) : "0"}
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Est. Cost/mo</text>
                    <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}><b>{formatCurrency(bucket().estimatedCost)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Cost/GB</text>
                    <text style={{ fg: THEME_COLORS.text.muted }}>{formatCurrency(costPerGB())}</text>
                  </box>

                  {/* Storage size indicator */}
                  <box marginTop={2}>
                    <text style={{ fg: THEME_COLORS.text.muted }}>Storage usage:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: STATUS_COLORS.info }}>
                          {"█".repeat(Math.min(20, Math.round(bucket().storageBytes / (totalStorage() / 20))))}
                        </span>
                        <span style={{ fg: THEME_COLORS.background.tertiary }}>
                          {"░".repeat(Math.max(0, 20 - Math.min(20, Math.round(bucket().storageBytes / (totalStorage() / 20)))))}
                        </span>
                      </text>
                    </box>
                  </box>

                  <Show when={isStale()}>
                    <box marginTop={2} padding={1} backgroundColor={THEME_COLORS.background.tertiary} borderColor={FINDING_COLORS.warning} border>
                      <text style={{ fg: FINDING_COLORS.warning }}>⚠ Stale bucket</text>
                      <text style={{ fg: THEME_COLORS.text.secondary }}>No reads in 30 days</text>
                    </box>
                  </Show>

                  {/* R2 Pricing note */}
                  <box marginTop={2} padding={1} backgroundColor={THEME_COLORS.background.secondary} borderColor={THEME_COLORS.border.default} border>
                    <text style={{ fg: THEME_COLORS.text.muted }}>R2 Pricing:</text>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>$0.015/GB/month</text>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Free Class A ops</text>
                    <text style={{ fg: THEME_COLORS.text.secondary }}>Free egress</text>
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
          <span style={{ fg: STATUS_COLORS.info }}>{sortedBuckets().length}</span> bucket{sortedBuckets().length !== 1 ? "s" : ""}
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Total storage: <span style={{ fg: STATUS_COLORS.info }}>{formatBytes(totalStorage())}</span>
        </text>
        <text style={{ fg: THEME_COLORS.border.default }}>|</text>
        <text style={{ fg: THEME_COLORS.text.muted }}>
          Est. cost: <span style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>{formatCurrency(totalCost())}</span>
        </text>
      </box>
    </box>
  )
}
