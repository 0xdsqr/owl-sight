import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, R2BucketSummary } from "../providers/cloudflare/client"

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
        backgroundColor="#161b22"
        borderColor="#30363d"
        border={["bottom"]}
        paddingLeft={1}
        paddingRight={1}
        alignItems="center"
        gap={1}
      >
        <text style={{ fg: "#8b949e" }}>Sort by:</text>
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
                backgroundColor={isActive() ? "#21262d" : "transparent"}
                borderColor={isActive() ? "#f38020" : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? "#f38020" : "#8b949e" }}>
                  {option.label}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: "#484f58" }}>
          <span style={{ fg: "#8b949e" }}>s</span> sort
          <span style={{ fg: "#8b949e" }}>j/k</span> select
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Buckets list */}
        <box
          border
          borderStyle="rounded"
          borderColor="#30363d"
          flexDirection="column"
          flexGrow={2}
          title=" R2 Buckets "
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
            <text width={24} style={{ fg: "#8b949e" }}><b>Bucket Name</b></text>
            <text width={12} style={{ fg: "#8b949e" }}><b>Storage</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>Objects</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>Reads</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>Cost/mo</b></text>
          </box>

          {/* Scrollable content */}
          <Show
            when={sortedBuckets().length > 0}
            fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: "#484f58" }}>No R2 buckets found</text>
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
                      backgroundColor={isSelected() ? "#21262d" : "transparent"}
                    >
                      <text
                        width={24}
                        style={{ fg: isSelected() ? "#c9d1d9" : "#8b949e" }}
                      >
                        {bucket.bucketName.length > 22
                          ? bucket.bucketName.slice(0, 20) + ".."
                          : bucket.bucketName}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? "#58a6ff" : "#8b949e" }}
                      >
                        {formatBytes(bucket.storageBytes)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? "#7ee787" : "#8b949e" }}
                      >
                        {formatNumber(bucket.objectCount)}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isStale ? "#d29922" : "#8b949e" }}
                      >
                        {bucket.operationsB30d > 0 ? formatNumber(bucket.operationsB30d) : "--"}
                      </text>
                      <text
                        width={10}
                        style={{ fg: isSelected() ? "#f38020" : "#8b949e" }}
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
              backgroundColor="#21262d"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              borderColor="#30363d"
              border={["top"]}
            >
              <text width={24} style={{ fg: "#f38020" }}><b>TOTAL</b></text>
              <text width={12} style={{ fg: "#58a6ff" }}><b>{formatBytes(totalStorage())}</b></text>
              <text width={10} style={{ fg: "#7ee787" }}><b>{formatNumber(totalObjects())}</b></text>
              <text width={10} style={{ fg: "#484f58" }}>--</text>
              <text width={10} style={{ fg: "#f38020" }}><b>{formatCurrency(totalCost())}</b></text>
            </box>
          </Show>
        </box>

        {/* Side panel - selected bucket details */}
        <box
          border
          borderStyle="rounded"
          borderColor="#30363d"
          flexDirection="column"
          width={32}
          title=" Details "
          titleAlignment="left"
        >
          <Show
            when={sortedBuckets()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: "#484f58" }}>Select a bucket</text>
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
                  <text style={{ fg: "#f38020" }}><b>{bucket().bucketName}</b></text>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Account ID</text>
                    <text style={{ fg: "#484f58" }}>{bucket().accountId.slice(0, 12)}...</text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Storage Size</text>
                    <text style={{ fg: "#58a6ff" }}><b>{formatBytes(bucket().storageBytes)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Object Count</text>
                    <text style={{ fg: "#7ee787" }}>{formatNumber(bucket().objectCount)}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Avg Size/Object</text>
                    <text style={{ fg: "#484f58" }}>
                      {bucket().objectCount > 0
                        ? formatBytes(bucket().storageBytes / bucket().objectCount)
                        : "N/A"}
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Class A Ops (30d)</text>
                    <text style={{ fg: "#58a6ff" }}>
                      {bucket().operationsA30d > 0 ? formatNumber(bucket().operationsA30d) : "0"}
                    </text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Class B Ops (30d)</text>
                    <text style={{ fg: isStale() ? "#d29922" : "#58a6ff" }}>
                      {bucket().operationsB30d > 0 ? formatNumber(bucket().operationsB30d) : "0"}
                    </text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Est. Cost/mo</text>
                    <text style={{ fg: "#f38020" }}><b>{formatCurrency(bucket().estimatedCost)}</b></text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Cost/GB</text>
                    <text style={{ fg: "#484f58" }}>{formatCurrency(costPerGB())}</text>
                  </box>

                  {/* Storage size indicator */}
                  <box marginTop={2}>
                    <text style={{ fg: "#484f58" }}>Storage usage:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: "#58a6ff" }}>
                          {"█".repeat(Math.min(20, Math.round(bucket().storageBytes / (totalStorage() / 20))))}
                        </span>
                        <span style={{ fg: "#21262d" }}>
                          {"░".repeat(Math.max(0, 20 - Math.min(20, Math.round(bucket().storageBytes / (totalStorage() / 20)))))}
                        </span>
                      </text>
                    </box>
                  </box>

                  <Show when={isStale()}>
                    <box marginTop={2} padding={1} backgroundColor="#21262d" borderColor="#d29922" border>
                      <text style={{ fg: "#d29922" }}>⚠ Stale bucket</text>
                      <text style={{ fg: "#8b949e" }}>No reads in 30 days</text>
                    </box>
                  </Show>

                  {/* R2 Pricing note */}
                  <box marginTop={2} padding={1} backgroundColor="#161b22" borderColor="#30363d" border>
                    <text style={{ fg: "#484f58" }}>R2 Pricing:</text>
                    <text style={{ fg: "#8b949e" }}>$0.015/GB/month</text>
                    <text style={{ fg: "#8b949e" }}>Free Class A ops</text>
                    <text style={{ fg: "#8b949e" }}>Free egress</text>
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
        <text style={{ fg: "#484f58" }}>
          <span style={{ fg: "#58a6ff" }}>{sortedBuckets().length}</span> bucket{sortedBuckets().length !== 1 ? "s" : ""}
        </text>
        <text style={{ fg: "#30363d" }}>|</text>
        <text style={{ fg: "#484f58" }}>
          Total storage: <span style={{ fg: "#58a6ff" }}>{formatBytes(totalStorage())}</span>
        </text>
        <text style={{ fg: "#30363d" }}>|</text>
        <text style={{ fg: "#484f58" }}>
          Est. cost: <span style={{ fg: "#f38020" }}>{formatCurrency(totalCost())}</span>
        </text>
      </box>
    </box>
  )
}
