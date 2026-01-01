import { For } from "solid-js"
import { PROVIDER_COLORS, THEME_COLORS } from "../../constants/colors"

type Provider = "aws" | "cloudflare"

interface Tab {
  key: string
  name: string
  icon: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: number
  onSelect: (idx: number) => void
  provider: Provider
}

export function TabBar(props: TabBarProps) {
  const accentColor = () => (props.provider === "aws" ? PROVIDER_COLORS.aws.primary : PROVIDER_COLORS.cloudflare.primary)

  return (
    <box
      height={1}
      flexDirection="row"
      backgroundColor={THEME_COLORS.background.secondary}
      borderColor={THEME_COLORS.border.default}
      border={["bottom"]}
      paddingLeft={1}
    >
      <For each={props.tabs}>
        {(tab, idx) => {
          const isActive = () => props.activeTab === idx()
          return (
            <box
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={isActive() ? THEME_COLORS.background.tertiary : "transparent"}
            >
              <text style={{ fg: isActive() ? accentColor() : THEME_COLORS.text.secondary }}>
                <span style={{ fg: THEME_COLORS.text.muted }}>{tab.key}</span>
                <span style={{ fg: isActive() ? THEME_COLORS.text.primary : THEME_COLORS.text.secondary }}>
                  {" "}
                  {tab.name}
                </span>
              </text>
            </box>
          )
        }}
      </For>
      <box flexGrow={1} />
    </box>
  )
}
