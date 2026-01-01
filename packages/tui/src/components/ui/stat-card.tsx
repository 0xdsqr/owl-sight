import { THEME_COLORS } from "../../constants/colors"

interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
  flexGrow?: number
}

export function StatCard(props: StatCardProps) {
  return (
    <box flexDirection="column" flexGrow={props.flexGrow ?? 1}>
      <text style={{ fg: THEME_COLORS.text.secondary }}>{props.label}</text>
      <text style={{ fg: props.color ?? THEME_COLORS.text.primary }}>
        {props.icon && <span>{props.icon} </span>}
        <b>{props.value}</b>
      </text>
    </box>
  )
}
