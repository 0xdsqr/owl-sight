import { For, Show, createSignal, createMemo } from "solid-js"
import { useKeyboard } from "@opentui/solid"

type Provider = "aws" | "cloudflare"

interface SettingsProps {
  provider?: Provider
  settings: {
    profiles: string[]
    regions: string[]
    timeRange: number
    cloudflareToken?: string
    cloudflareAccountIds?: string[]
  }
  availableProfiles: string[]
  onSettingsChange: (settings: any) => void
  onRefresh: () => void
}

// Common AWS regions
const COMMON_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-southeast-2",
]

const TIME_RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
]

export function SettingsTab(props: SettingsProps) {
  const provider = () => props.provider ?? "aws"

  // Local state for pending changes
  const [pendingProfiles, setPendingProfiles] = createSignal<Set<string>>(
    new Set(props.settings.profiles)
  )
  const [pendingRegions, setPendingRegions] = createSignal<Set<string>>(
    new Set(props.settings.regions)
  )
  const [pendingTimeRange, setPendingTimeRange] = createSignal(props.settings.timeRange)
  const [pendingCloudflareToken, setPendingCloudflareToken] = createSignal(props.settings.cloudflareToken ?? "")
  const [focusSection, setFocusSection] = createSignal<"profiles" | "regions" | "time" | "cloudflare">("profiles")
  const [focusIndex, setFocusIndex] = createSignal(0)
  
  const hasChanges = createMemo(() => {
    if (provider() === "aws") {
      const profilesChanged =
        pendingProfiles().size !== props.settings.profiles.length ||
        !props.settings.profiles.every(p => pendingProfiles().has(p))

      const regionsChanged =
        pendingRegions().size !== props.settings.regions.length ||
        !props.settings.regions.every(r => pendingRegions().has(r))

      const timeRangeChanged = pendingTimeRange() !== props.settings.timeRange

      return profilesChanged || regionsChanged || timeRangeChanged
    } else {
      const tokenChanged = pendingCloudflareToken() !== (props.settings.cloudflareToken ?? "")
      return tokenChanged
    }
  })

  const toggleProfile = (profile: string) => {
    setPendingProfiles(prev => {
      const next = new Set(prev)
      if (next.has(profile)) {
        if (next.size > 1) {
          next.delete(profile)
        }
      } else {
        next.add(profile)
      }
      return next
    })
  }

  const toggleRegion = (region: string) => {
    setPendingRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) {
        if (next.size > 1) {
          next.delete(region)
        }
      } else {
        next.add(region)
      }
      return next
    })
  }

  const applyChanges = () => {
    if (provider() === "aws") {
      props.onSettingsChange({
        profiles: Array.from(pendingProfiles()),
        regions: Array.from(pendingRegions()),
        timeRange: pendingTimeRange(),
      })
    } else {
      props.onSettingsChange({
        cloudflareToken: pendingCloudflareToken(),
        cloudflareAccountIds: props.settings.cloudflareAccountIds ?? [],
      })
    }
    props.onRefresh()
  }

  const resetChanges = () => {
    setPendingProfiles(new Set(props.settings.profiles))
    setPendingRegions(new Set(props.settings.regions))
    setPendingTimeRange(props.settings.timeRange)
    setPendingCloudflareToken(props.settings.cloudflareToken ?? "")
  }
  
  // Keyboard navigation
  useKeyboard((key) => {
    const sections = ["profiles", "regions", "time"] as const
    const currentSectionIndex = sections.indexOf(focusSection())
    
    switch (key.name) {
      case "tab":
        if (key.shift) {
          setFocusSection(sections[(currentSectionIndex - 1 + 3) % 3]!)
        } else {
          setFocusSection(sections[(currentSectionIndex + 1) % 3]!)
        }
        setFocusIndex(0)
        break
        
      case "up":
      case "k":
        setFocusIndex(i => Math.max(0, i - 1))
        break
        
      case "down":
      case "j":
        if (focusSection() === "profiles") {
          setFocusIndex(i => Math.min(props.availableProfiles.length - 1, i + 1))
        } else if (focusSection() === "regions") {
          setFocusIndex(i => Math.min(COMMON_REGIONS.length - 1, i + 1))
        } else {
          setFocusIndex(i => Math.min(TIME_RANGE_OPTIONS.length - 1, i + 1))
        }
        break
        
      case "space":
      case "return":
        if (focusSection() === "profiles" && props.availableProfiles[focusIndex()]) {
          toggleProfile(props.availableProfiles[focusIndex()]!)
        } else if (focusSection() === "regions" && COMMON_REGIONS[focusIndex()]) {
          toggleRegion(COMMON_REGIONS[focusIndex()]!)
        } else if (focusSection() === "time" && TIME_RANGE_OPTIONS[focusIndex()]) {
          setPendingTimeRange(TIME_RANGE_OPTIONS[focusIndex()]!.value)
        }
        break
        
      case "escape":
        resetChanges()
        break
    }
    
    // Apply with 'a' key
    if (key.raw === "a" && hasChanges()) {
      applyChanges()
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <Show when={provider() === "aws"}>
        <box flexDirection="row" gap={1} flexGrow={1}>
          {/* Left column - Profiles & Regions */}
          <box flexDirection="column" gap={1} flexGrow={1}>
            {/* AWS Profiles */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor={focusSection() === "profiles" ? "#ff9900" : "#30363d"}
              title=" AWS Profiles "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
              flexGrow={1}
            >
              <Show
                when={props.availableProfiles.length > 0}
                fallback={
                  <text style={{ fg: "#484f58" }}>
                    No AWS profiles found. Configure with 'aws configure --profile name'
                  </text>
                }
              >
                <For each={props.availableProfiles}>
                  {(profile, index) => {
                    const isSelected = () => pendingProfiles().has(profile)
                    const isFocused = () => focusSection() === "profiles" && focusIndex() === index()
                    return (
                      <box
                        flexDirection="row"
                        backgroundColor={isFocused() ? "#21262d" : "transparent"}
                        paddingLeft={1}
                        height={1}
                      >
                        <text style={{ fg: isSelected() ? "#7ee787" : "#484f58" }}>
                          {isSelected() ? "[x]" : "[ ]"} {profile}
                        </text>
                      </box>
                    )
                  }}
                </For>
              </Show>
            </box>

            {/* AWS Regions */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor={focusSection() === "regions" ? "#ff9900" : "#30363d"}
              title=" AWS Regions "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
              flexGrow={1}
            >
              <scrollbox scrollbarOptions={{ visible: true }} flexGrow={1}>
                <For each={COMMON_REGIONS}>
                  {(region, index) => {
                    const isSelected = () => pendingRegions().has(region)
                    const isFocused = () => focusSection() === "regions" && focusIndex() === index()
                    return (
                      <box
                        flexDirection="row"
                        backgroundColor={isFocused() ? "#21262d" : "transparent"}
                        paddingLeft={1}
                        height={1}
                      >
                        <text style={{ fg: isSelected() ? "#7ee787" : "#484f58" }}>
                          {isSelected() ? "[x]" : "[ ]"} {region}
                        </text>
                      </box>
                    )
                  }}
                </For>
              </scrollbox>
            </box>
          </box>

          {/* Right column - Time Range & Info */}
          <box flexDirection="column" gap={1} width={35}>
            {/* Time Range */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor={focusSection() === "time" ? "#ff9900" : "#30363d"}
              title=" Time Range "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
            >
              <For each={TIME_RANGE_OPTIONS}>
                {(option, index) => {
                  const isSelected = () => pendingTimeRange() === option.value
                  const isFocused = () => focusSection() === "time" && focusIndex() === index()
                  return (
                    <box
                      flexDirection="row"
                      backgroundColor={isFocused() ? "#21262d" : "transparent"}
                      paddingLeft={1}
                      height={1}
                    >
                      <text style={{ fg: isSelected() ? "#7ee787" : "#484f58" }}>
                        {isSelected() ? "(o)" : "( )"} {option.label}
                      </text>
                    </box>
                  )
                }}
              </For>
            </box>

            {/* API Cost Info */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor="#30363d"
              title=" API Usage "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
            >
              <text style={{ fg: "#8b949e" }}>
                Cost Explorer: <span style={{ fg: "#d29922" }}>$0.01/call</span>
              </text>
              <text style={{ fg: "#484f58" }} marginTop={1}>
                ~2-3 API calls per profile
              </text>
              <text style={{ fg: "#484f58" }}>
                EC2, Budgets, STS: Free tier
              </text>
            </box>

            {/* About */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor="#30363d"
              title=" About "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
              flexGrow={1}
            >
              <text style={{ fg: "#ff9900" }}><b>owl-sight v0.1.0</b></text>
              <text style={{ fg: "#8b949e" }}>Cloud cost monitoring TUI</text>
              <text style={{ fg: "#484f58" }} marginTop={1}>Built with:</text>
              <text style={{ fg: "#484f58" }}>- OpenTUI + SolidJS</text>
              <text style={{ fg: "#484f58" }}>- AWS SDK v3</text>
              <text style={{ fg: "#484f58" }}>- Cloudflare SDK</text>
            </box>
          </box>
        </box>
      </Show>

      {/* Cloudflare Settings */}
      <Show when={provider() === "cloudflare"}>
        <box flexDirection="row" gap={1} flexGrow={1}>
          <box flexDirection="column" gap={1} flexGrow={1}>
            {/* Cloudflare Configuration */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor="#30363d"
              title=" Cloudflare Configuration "
              titleAlignment="left"
              paddingLeft={2}
              paddingRight={2}
              paddingTop={2}
              paddingBottom={2}
              flexGrow={1}
            >
              <text style={{ fg: "#f38020" }}><b>API Token</b></text>
              <text style={{ fg: "#8b949e" }} marginTop={1}>
                Status: {props.settings.cloudflareToken ?
                  <span style={{ fg: "#7ee787" }}>Configured</span> :
                  <span style={{ fg: "#f85149" }}>Not configured</span>
                }
              </text>

              <box marginTop={2} padding={1} backgroundColor="#161b22" borderColor="#30363d" border>
                <text style={{ fg: "#484f58" }}>Set via environment:</text>
                <text style={{ fg: "#8b949e" }} marginTop={1}>
                  export CLOUDFLARE_API_TOKEN="your-token"
                </text>
              </box>

              <text style={{ fg: "#f38020" }} marginTop={3}><b>Account IDs</b></text>
              <text style={{ fg: "#8b949e" }} marginTop={1}>
                Accounts: {(props.settings.cloudflareAccountIds?.length ?? 0) === 0 ?
                  <span style={{ fg: "#d29922" }}>Auto-discover</span> :
                  <span style={{ fg: "#7ee787" }}>{props.settings.cloudflareAccountIds?.length}</span>
                }
              </text>

              <text style={{ fg: "#484f58" }} marginTop={2}>
                Cloudflare settings are configured via environment variables and cannot be edited here.
              </text>
            </box>

            {/* About */}
            <box
              flexDirection="column"
              border
              borderStyle="rounded"
              borderColor="#30363d"
              title=" About "
              titleAlignment="left"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={1}
              paddingBottom={1}
            >
              <text style={{ fg: "#f38020" }}><b>owl-sight v0.1.0</b></text>
              <text style={{ fg: "#8b949e" }}>Cloud cost monitoring TUI</text>
              <text style={{ fg: "#484f58" }} marginTop={1}>Built with:</text>
              <text style={{ fg: "#484f58" }}>- OpenTUI + SolidJS</text>
              <text style={{ fg: "#484f58" }}>- AWS SDK v3</text>
              <text style={{ fg: "#484f58" }}>- Cloudflare SDK</text>
            </box>
          </box>
        </box>
      </Show>

      {/* Action bar */}
      <box 
        flexDirection="row" 
        gap={2} 
        paddingLeft={1}
        height={1}
        borderColor="#30363d"
        border={["top"]}
        alignItems="center"
      >
        <Show when={hasChanges()}>
          <text style={{ fg: "#d29922" }}>[!] Unsaved changes</text>
          <text style={{ fg: "#7ee787" }}>[a] Apply & Refresh</text>
          <text style={{ fg: "#f85149" }}>[Esc] Reset</text>
        </Show>
        <Show when={!hasChanges()}>
          <text style={{ fg: "#484f58" }}>
            <span style={{ fg: "#8b949e" }}>Tab</span> section  
            <span style={{ fg: "#8b949e" }}>j/k</span> navigate  
            <span style={{ fg: "#8b949e" }}>Space</span> toggle  
            <span style={{ fg: "#8b949e" }}>a</span> apply
          </text>
        </Show>
      </box>
    </box>
  )
}
