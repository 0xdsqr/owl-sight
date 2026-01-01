import { Show } from "solid-js"
import { PROVIDER_COLORS, THEME_COLORS, STATUS_COLORS } from "../../constants/colors"

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
      backgroundColor={THEME_COLORS.background.primary}
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
        backgroundColor={props.active === "aws" ? THEME_COLORS.background.tertiary : "transparent"}
        borderColor={props.active === "aws" ? PROVIDER_COLORS.aws.primary : "transparent"}
        border={props.active === "aws" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text style={{ fg: props.active === "aws" ? PROVIDER_COLORS.aws.primary : THEME_COLORS.text.secondary }}>
          <span style={{ fg: THEME_COLORS.text.muted }}>[</span>
          <span style={{ bold: props.active === "aws" }}>AWS</span>
          <span style={{ fg: THEME_COLORS.text.muted }}>]</span>
        </text>
      </box>

      <box
        paddingLeft={2}
        paddingRight={2}
        height={2}
        backgroundColor={
          props.active === "cloudflare" ? THEME_COLORS.background.tertiary : "transparent"
        }
        borderColor={props.active === "cloudflare" ? PROVIDER_COLORS.cloudflare.primary : "transparent"}
        border={props.active === "cloudflare" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text
          style={{
            fg: props.hasCloudflare
              ? props.active === "cloudflare"
                ? PROVIDER_COLORS.cloudflare.primary
                : THEME_COLORS.text.secondary
              : THEME_COLORS.text.muted,
          }}
        >
          <span style={{ fg: THEME_COLORS.text.muted }}>[</span>
          <span style={{ bold: props.active === "cloudflare" }}>
            Cloudflare
          </span>
          <span style={{ fg: THEME_COLORS.text.muted }}>]</span>
          <Show when={!props.hasCloudflare}>
            <span style={{ fg: STATUS_COLORS.error }}> (no token)</span>
          </Show>
        </text>
      </box>

      <box flexGrow={1} />

      <text style={{ fg: THEME_COLORS.text.muted }}>[ / ] switch provider</text>
    </box>
  )
}
