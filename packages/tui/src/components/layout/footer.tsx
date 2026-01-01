import { Show } from "solid-js"
import { THEME_COLORS } from "../../constants/colors"

type Provider = "aws" | "cloudflare"

interface FooterProps {
  provider: Provider
  hasCloudflare: boolean
}

export function Footer(props: FooterProps) {
  return (
    <box
      height={1}
      backgroundColor={THEME_COLORS.background.secondary}
      paddingLeft={1}
      paddingRight={1}
      borderColor={THEME_COLORS.border.default}
      border={["top"]}
      flexDirection="row"
      alignItems="center"
    >
      <text style={{ fg: THEME_COLORS.text.muted }}>
        <span style={{ fg: THEME_COLORS.text.secondary }}>1-5</span> tabs
        <span style={{ fg: THEME_COLORS.text.muted }}>|</span>
        <span style={{ fg: THEME_COLORS.text.secondary }}>Tab</span> next
        <span style={{ fg: THEME_COLORS.text.muted }}>|</span>
        <span style={{ fg: THEME_COLORS.text.secondary }}>r</span> refresh
        <span style={{ fg: THEME_COLORS.text.muted }}>|</span>
        <span style={{ fg: THEME_COLORS.text.secondary }}>`</span> console
        <span style={{ fg: THEME_COLORS.text.muted }}>|</span>
        <span style={{ fg: THEME_COLORS.text.secondary }}>q</span> quit
        <Show when={props.hasCloudflare}>
          <span style={{ fg: THEME_COLORS.text.muted }}> | </span>
          <span style={{ fg: THEME_COLORS.text.secondary }}>[ ]</span> switch provider
        </Show>
      </text>
    </box>
  )
}
