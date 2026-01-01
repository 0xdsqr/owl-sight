// Shared overview section component with focus state
import { type JSX, Show } from "solid-js"

export interface OverviewSectionProps {
  title: string
  focused: boolean
  badge?: string | number
  badgeColor?: string
  accentColor?: string
  children: JSX.Element
  onSelect?: () => void
}

const colors = {
  bg: "#0d1117",
  bgAlt: "#161b22",
  bgHover: "#21262d",
  border: "#30363d",
  borderFocused: "#58a6ff",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  textDim: "#484f58",
}

export function OverviewSection(props: OverviewSectionProps) {
  const accent = () => props.accentColor ?? "#58a6ff"
  const borderColor = () => props.focused ? accent() : colors.border
  
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={borderColor()}
      flexDirection="column"
      flexGrow={1}
      backgroundColor={props.focused ? colors.bgAlt : colors.bg}
    >
      {/* Header */}
      <box
        flexDirection="row"
        backgroundColor={colors.bgHover}
        paddingLeft={1}
        paddingRight={1}
        height={1}
        alignItems="center"
      >
        <Show when={props.focused}>
          <text style={{ fg: accent() }}>{">"} </text>
        </Show>
        <text style={{ fg: props.focused ? accent() : colors.textMuted }}>
          <b>{props.title}</b>
        </text>
        <Show when={props.badge !== undefined}>
          <text style={{ fg: props.badgeColor ?? colors.textDim }}> ({props.badge})</text>
        </Show>
        <box flexGrow={1} />
      </box>
      
      {/* Content */}
      <box flexDirection="column" flexGrow={1}>
        {props.children}
      </box>
    </box>
  )
}

// Stats bar component for top metrics
export interface StatItem {
  label: string
  value: string | number
  color?: string
  alert?: boolean
}

export interface StatsBarProps {
  items: StatItem[]
  accentColor?: string
}

export function StatsBar(props: StatsBarProps) {
  return (
    <box
      flexDirection="row"
      gap={1}
      height={3}
      backgroundColor={colors.bgAlt}
      borderColor={colors.border}
      border
      borderStyle="rounded"
      paddingLeft={2}
      paddingRight={2}
      alignItems="center"
    >
      {props.items.map((item, idx) => (
        <>
          <box flexDirection="column" flexGrow={1}>
            <text style={{ fg: colors.textMuted }}>{item.label}</text>
            <text style={{ fg: item.alert ? "#f85149" : (item.color ?? colors.text) }}>
              <b>{item.value}</b>
            </text>
          </box>
          {idx < props.items.length - 1 && (
            <text style={{ fg: colors.border }}>|</text>
          )}
        </>
      ))}
    </box>
  )
}

// List item for selectable rows within sections
export interface ListItemProps {
  selected: boolean
  icon?: string
  iconColor?: string
  label: string
  value?: string
  valueColor?: string
  secondary?: string
  secondaryColor?: string
}

export function ListItem(props: ListItemProps) {
  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      backgroundColor={props.selected ? colors.bgHover : "transparent"}
      alignItems="center"
    >
      <Show when={props.icon}>
        <text width={4} style={{ fg: props.iconColor ?? colors.textDim }}>{props.icon}</text>
      </Show>
      <text style={{ fg: props.selected ? colors.text : colors.textMuted }} flexGrow={1}>
        {props.selected ? "> " : "  "}{props.label}
      </text>
      <Show when={props.value}>
        <text width={10} style={{ fg: props.valueColor ?? colors.text }}>{props.value}</text>
      </Show>
      <Show when={props.secondary}>
        <text width={8} style={{ fg: props.secondaryColor ?? colors.textDim }}>{props.secondary}</text>
      </Show>
    </box>
  )
}

// Progress bar for budgets etc
export interface ProgressBarProps {
  percent: number
  width?: number
  color?: string
  bgColor?: string
}

export function ProgressBar(props: ProgressBarProps) {
  const width = props.width ?? 20
  const filled = Math.min(Math.round((props.percent / 100) * width), width)
  const empty = width - filled
  const color = props.color ?? (props.percent > 90 ? "#f85149" : props.percent > 75 ? "#d29922" : "#7ee787")
  
  return (
    <text>
      <span style={{ fg: color }}>{"█".repeat(filled)}</span>
      <span style={{ fg: props.bgColor ?? "#21262d" }}>{"░".repeat(empty)}</span>
    </text>
  )
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${amount.toFixed(2)}`
}

// Helper to format change percentage
export function formatChange(change: number): { text: string; color: string } {
  const arrow = change > 0 ? "^" : change < 0 ? "v" : "-"
  const color = change > 5 ? "#f85149" : change < -5 ? "#7ee787" : "#8b949e"
  return { text: `${arrow}${Math.abs(change).toFixed(1)}%`, color }
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)}TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${bytes}B`
}
