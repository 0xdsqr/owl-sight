import { Show } from "solid-js"

type Provider = "aws" | "cloudflare"

interface FooterProps {
  provider: Provider
  hasCloudflare: boolean
}

export function Footer(props: FooterProps) {
  return (
    <box
      height={1}
      backgroundColor="#161b22"
      paddingLeft={1}
      paddingRight={1}
      borderColor="#30363d"
      border={["top"]}
      flexDirection="row"
      alignItems="center"
    >
      <text style={{ fg: "#484f58" }}>
        <span style={{ fg: "#8b949e" }}>1-5</span> tabs
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>Tab</span> next
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>r</span> refresh
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>`</span> console
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>q</span> quit
        <Show when={props.hasCloudflare}>
          <span style={{ fg: "#484f58" }}> | </span>
          <span style={{ fg: "#8b949e" }}>[ ]</span> switch provider
        </Show>
      </text>
    </box>
  )
}
