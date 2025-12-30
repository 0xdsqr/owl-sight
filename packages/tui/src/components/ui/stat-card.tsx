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
      <text style={{ fg: "#8b949e" }}>{props.label}</text>
      <text style={{ fg: props.color ?? "#c9d1d9" }}>
        {props.icon && <span>{props.icon} </span>}
        <b>{props.value}</b>
      </text>
    </box>
  )
}
