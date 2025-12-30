import { Show } from "solid-js"

type Provider = "aws" | "cloudflare"

interface HeaderProps {
  provider: Provider
  hasCloudflare: boolean
  profiles: string[]
  timeRange: number
  isLoading: boolean
  onProviderSwitch: (p: Provider) => void
}

export function Header(props: HeaderProps) {
  const providerColors = {
    aws: { bg: "#ff9900", fg: "#000000", accent: "#ff9900" },
    cloudflare: { bg: "#f38020", fg: "#000000", accent: "#f38020" },
  }

  const colors = () => providerColors[props.provider]

  return (
    <box
      height={3}
      backgroundColor="#161b22"
      paddingLeft={1}
      paddingRight={1}
      flexDirection="row"
      alignItems="center"
      borderColor="#30363d"
      border={["bottom"]}
    >
      <box flexDirection="row" alignItems="center" gap={1}>
        <text style={{ fg: "#a78bfa" }}>{"{o,o}"}</text>
        <text>
          <span style={{ fg: "#a78bfa", bold: true }}>owl</span>
          <span style={{ fg: "#8b949e" }}>-</span>
          <span style={{ fg: "#7c3aed", bold: true }}>sight</span>
        </text>
        <text style={{ fg: "#484f58" }}>|</text>
        <text style={{ fg: colors().accent }}>
          <b>{props.provider === "aws" ? "AWS" : "Cloudflare"}</b>
        </text>
      </box>

      <box flexGrow={1} />

      <box flexDirection="row" gap={2} alignItems="center">
        <Show when={props.provider === "aws"}>
          <text style={{ fg: "#8b949e" }}>
            <span style={{ fg: "#7ee787" }}>{props.profiles.length}</span>{" "}
            profile{props.profiles.length !== 1 ? "s" : ""}
          </text>
          <text style={{ fg: "#484f58" }}>|</text>
          <text style={{ fg: "#8b949e" }}>
            <span style={{ fg: "#58a6ff" }}>{props.timeRange}</span>d range
          </text>
        </Show>

        <Show when={props.isLoading}>
          <text style={{ fg: "#484f58" }}>|</text>
          <text style={{ fg: "#f0883e" }}>
            <span style={{ bold: true }}>...</span> Loading
          </text>
        </Show>
      </box>
    </box>
  )
}
