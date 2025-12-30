import { For } from "solid-js"

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
  const accentColor = () => (props.provider === "aws" ? "#ff9900" : "#f38020")

  return (
    <box
      height={1}
      flexDirection="row"
      backgroundColor="#161b22"
      borderColor="#30363d"
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
              backgroundColor={isActive() ? "#21262d" : "transparent"}
            >
              <text style={{ fg: isActive() ? accentColor() : "#8b949e" }}>
                <span style={{ fg: "#484f58" }}>{tab.key}</span>
                <span style={{ fg: isActive() ? "#c9d1d9" : "#8b949e" }}>
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
