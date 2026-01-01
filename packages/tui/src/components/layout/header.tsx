import { Show } from "solid-js"
import { PROVIDER_COLORS, THEME_COLORS, BRAND_COLORS, STATUS_COLORS, SEMANTIC_COLORS } from "../../constants/colors"

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
    aws: { bg: PROVIDER_COLORS.aws.primary, fg: PROVIDER_COLORS.aws.foreground, accent: PROVIDER_COLORS.aws.accent },
    cloudflare: { bg: PROVIDER_COLORS.cloudflare.primary, fg: PROVIDER_COLORS.cloudflare.foreground, accent: PROVIDER_COLORS.cloudflare.accent },
  }

  const colors = () => providerColors[props.provider]

  return (
    <box
      height={3}
      backgroundColor={THEME_COLORS.background.secondary}
      paddingLeft={1}
      paddingRight={1}
      flexDirection="row"
      alignItems="center"
      borderColor={THEME_COLORS.border.default}
      border={["bottom"]}
    >
      <box flexDirection="row" alignItems="center" gap={1}>
        <text style={{ fg: BRAND_COLORS.owlPurple }}>{"{o,o}"}</text>
        <text>
          <span style={{ fg: BRAND_COLORS.owlPurple, bold: true }}>owl</span>
          <span style={{ fg: THEME_COLORS.text.secondary }}>-</span>
          <span style={{ fg: BRAND_COLORS.sightPurple, bold: true }}>sight</span>
        </text>
        <text style={{ fg: THEME_COLORS.text.muted }}>|</text>
        <text style={{ fg: colors().accent }}>
          <b>{props.provider === "aws" ? "AWS" : "Cloudflare"}</b>
        </text>
      </box>

      <box flexGrow={1} />

      <box flexDirection="row" gap={2} alignItems="center">
        <Show when={props.provider === "aws"}>
          <text style={{ fg: THEME_COLORS.text.secondary }}>
            <span style={{ fg: STATUS_COLORS.success }}>{props.profiles.length}</span>{" "}
            profile{props.profiles.length !== 1 ? "s" : ""}
          </text>
          <text style={{ fg: THEME_COLORS.text.muted }}>|</text>
          <text style={{ fg: THEME_COLORS.text.secondary }}>
            <span style={{ fg: STATUS_COLORS.info }}>{props.timeRange}</span>d range
          </text>
        </Show>

        <Show when={props.isLoading}>
          <text style={{ fg: THEME_COLORS.text.muted }}>|</text>
          <text style={{ fg: SEMANTIC_COLORS.warning }}>
            <span style={{ bold: true }}>...</span> Loading
          </text>
        </Show>
      </box>
    </box>
  )
}
