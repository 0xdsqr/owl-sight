import { Show } from "solid-js"

type Provider = "aws" | "cloudflare"

interface ProviderBarProps {
  active: Provider
  hasCloudflare: boolean
  onSwitch: (p: Provider) => void
}

export function ProviderBar(props: ProviderBarProps) {
  return (
    <box
      height={2}
      backgroundColor="#0d1117"
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      alignItems="center"
      gap={1}
    >
      <box
        paddingLeft={2}
        paddingRight={2}
        height={2}
        backgroundColor={props.active === "aws" ? "#21262d" : "transparent"}
        borderColor={props.active === "aws" ? "#ff9900" : "transparent"}
        border={props.active === "aws" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text style={{ fg: props.active === "aws" ? "#ff9900" : "#8b949e" }}>
          <span style={{ fg: "#484f58" }}>[</span>
          <span style={{ bold: props.active === "aws" }}>AWS</span>
          <span style={{ fg: "#484f58" }}>]</span>
        </text>
      </box>

      <box
        paddingLeft={2}
        paddingRight={2}
        height={2}
        backgroundColor={
          props.active === "cloudflare" ? "#21262d" : "transparent"
        }
        borderColor={props.active === "cloudflare" ? "#f38020" : "transparent"}
        border={props.active === "cloudflare" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text
          style={{
            fg: props.hasCloudflare
              ? props.active === "cloudflare"
                ? "#f38020"
                : "#8b949e"
              : "#484f58",
          }}
        >
          <span style={{ fg: "#484f58" }}>[</span>
          <span style={{ bold: props.active === "cloudflare" }}>
            Cloudflare
          </span>
          <span style={{ fg: "#484f58" }}>]</span>
          <Show when={!props.hasCloudflare}>
            <span style={{ fg: "#f85149" }}> (no token)</span>
          </Show>
        </text>
      </box>

      <box flexGrow={1} />

      <text style={{ fg: "#484f58" }}>[ / ] switch provider</text>
    </box>
  )
}
