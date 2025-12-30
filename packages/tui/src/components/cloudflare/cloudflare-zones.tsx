import { createSignal, createMemo, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { DashboardData, ZoneSummary } from "../providers/cloudflare/client"

export function CloudflareZones(props: { data: DashboardData }) {
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [filterStatus, setFilterStatus] = createSignal<"all" | "active" | "paused">("all")

  const filteredZones = createMemo(() => {
    const zones = props.data.zones
    if (filterStatus() === "all") return zones
    return zones.filter(z => z.status === filterStatus())
  })

  // Keyboard navigation
  useKeyboard((key) => {
    if (key.name === "up" || key.raw === "k") {
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (key.name === "down" || key.raw === "j") {
      setSelectedIndex(i => Math.min(filteredZones().length - 1, i + 1))
    } else if (key.raw === "f") {
      setFilterStatus(s => {
        if (s === "all") return "active"
        if (s === "active") return "paused"
        return "all"
      })
      setSelectedIndex(0)
    }
  })

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)}TB`
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
    return `${bytes}B`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#7ee787"
      case "paused": return "#d29922"
      default: return "#484f58"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return "✓"
      case "paused": return "·"
      default: return "?"
    }
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Filter bar */}
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
        <text style={{ fg: "#8b949e" }}>Filter:</text>
        <For each={["all", "active", "paused"] as const}>
          {(status) => {
            const isActive = () => filterStatus() === status
            return (
              <box
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={isActive() ? "#21262d" : "transparent"}
                borderColor={isActive() ? "#f38020" : "transparent"}
                border={isActive() ? ["bottom"] : undefined}
              >
                <text style={{ fg: isActive() ? "#f38020" : "#8b949e" }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </text>
              </box>
            )
          }}
        </For>
        <box flexGrow={1} />
        <text style={{ fg: "#484f58" }}>
          <span style={{ fg: "#8b949e" }}>f</span> filter
          <span style={{ fg: "#8b949e" }}>j/k</span> select
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} gap={1} marginTop={1}>
        {/* Zones list */}
        <box
          border
          borderStyle="rounded"
          borderColor="#30363d"
          flexDirection="column"
          flexGrow={2}
          title=" Zones "
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
            <text width={3} style={{ fg: "#8b949e" }}><b>St</b></text>
            <text width={24} style={{ fg: "#8b949e" }}><b>Zone Name</b></text>
            <text width={10} style={{ fg: "#8b949e" }}><b>Plan</b></text>
            <text width={12} style={{ fg: "#8b949e" }}><b>Requests</b></text>
            <text width={12} style={{ fg: "#8b949e" }}><b>Bandwidth</b></text>
            <text width={8} style={{ fg: "#8b949e" }}><b>Cache%</b></text>
          </box>

          {/* Scrollable content */}
          <Show
            when={filteredZones().length > 0}
            fallback={
              <box padding={1} flexGrow={1} alignItems="center" justifyContent="center">
                <text style={{ fg: "#484f58" }}>No zones found</text>
              </box>
            }
          >
            <scrollbox
              scrollbarOptions={{ visible: true }}
              flexGrow={1}
              contentOptions={{ gap: 0 }}
            >
              <For each={filteredZones()}>
                {(zone, index) => {
                  const isSelected = () => index() === selectedIndex()
                  const statusColor = getStatusColor(zone.status)

                  return (
                    <box
                      flexDirection="row"
                      paddingLeft={1}
                      paddingRight={1}
                      height={1}
                      backgroundColor={isSelected() ? "#21262d" : "transparent"}
                    >
                      <text
                        width={3}
                        style={{ fg: statusColor }}
                      >
                        {getStatusIcon(zone.status)}
                      </text>
                      <text
                        width={24}
                        style={{ fg: isSelected() ? "#c9d1d9" : "#8b949e" }}
                      >
                        {zone.zoneName.length > 22
                          ? zone.zoneName.slice(0, 20) + ".."
                          : zone.zoneName}
                      </text>
                      <text
                        width={10}
                        style={{ fg: "#f38020" }}
                      >
                        {zone.plan}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? "#58a6ff" : "#8b949e" }}
                      >
                        {formatNumber(zone.requests30d)}
                      </text>
                      <text
                        width={12}
                        style={{ fg: isSelected() ? "#7ee787" : "#8b949e" }}
                      >
                        {formatBytes(zone.bandwidth30d)}
                      </text>
                      <text
                        width={8}
                        style={{ fg: zone.cacheHitRate > 80 ? "#7ee787" : zone.cacheHitRate > 50 ? "#d29922" : "#f85149" }}
                      >
                        {zone.cacheHitRate > 0 ? zone.cacheHitRate.toFixed(1) + "%" : "--"}
                      </text>
                    </box>
                  )
                }}
              </For>
            </scrollbox>
          </Show>
        </box>

        {/* Side panel - selected zone details */}
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
            when={filteredZones()[selectedIndex()]}
            fallback={
              <box padding={1}>
                <text style={{ fg: "#484f58" }}>Select a zone</text>
              </box>
            }
          >
            {(() => {
              const zone = () => filteredZones()[selectedIndex()]!
              const statusColor = () => getStatusColor(zone().status)

              return (
                <box flexDirection="column" padding={1} gap={1}>
                  <text style={{ fg: "#f38020" }}><b>{zone().zoneName}</b></text>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Status</text>
                    <text style={{ fg: statusColor() }}>
                      {getStatusIcon(zone().status)} {zone().status.toUpperCase()}
                    </text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Plan</text>
                    <text style={{ fg: "#f38020" }}>{zone().plan}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Zone ID</text>
                    <text style={{ fg: "#484f58" }}>{zone().zoneId.slice(0, 12)}...</text>
                  </box>

                  <box marginTop={1}>
                    <text style={{ fg: "#8b949e" }}>Requests (30d)</text>
                    <text style={{ fg: "#58a6ff" }}>{formatNumber(zone().requests30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Bandwidth (30d)</text>
                    <text style={{ fg: "#7ee787" }}>{formatBytes(zone().bandwidth30d)}</text>
                  </box>

                  <box>
                    <text style={{ fg: "#8b949e" }}>Cache Hit Rate</text>
                    <text style={{ fg: zone().cacheHitRate > 80 ? "#7ee787" : zone().cacheHitRate > 50 ? "#d29922" : "#f85149" }}>
                      {zone().cacheHitRate > 0 ? zone().cacheHitRate.toFixed(1) + "%" : "No data"}
                    </text>
                  </box>

                  <Show when={zone().threats30d > 0}>
                    <box>
                      <text style={{ fg: "#8b949e" }}>Threats Blocked</text>
                      <text style={{ fg: "#f85149" }}>{formatNumber(zone().threats30d)}</text>
                    </box>
                  </Show>

                  {/* Cache hit rate bar */}
                  <box marginTop={2}>
                    <text style={{ fg: "#484f58" }}>Cache efficiency:</text>
                    <box marginTop={1}>
                      <text>
                        <span style={{ fg: "#7ee787" }}>{"█".repeat(Math.round(zone().cacheHitRate / 5))}</span>
                        <span style={{ fg: "#21262d" }}>{"░".repeat(20 - Math.round(zone().cacheHitRate / 5))}</span>
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
        <text style={{ fg: "#484f58" }}>
          Showing <span style={{ fg: "#58a6ff" }}>{filteredZones().length}</span> of {props.data.zones.length} zones
        </text>
      </box>
    </box>
  )
}
