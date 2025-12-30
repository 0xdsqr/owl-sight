interface StatusBadgeProps {
  status: string
  icon?: string
  colorMap?: Record<string, string>
}

const DEFAULT_COLORS: Record<string, string> = {
  success: "#7ee787",
  warning: "#d29922",
  error: "#f85149",
  info: "#58a6ff",
  active: "#7ee787",
  inactive: "#484f58",
}

export function StatusBadge(props: StatusBadgeProps) {
  const colorMap = props.colorMap ?? DEFAULT_COLORS
  const color = colorMap[props.status.toLowerCase()] ?? "#8b949e"

  return (
    <text style={{ fg: color }}>
      {props.icon && <span>{props.icon} </span>}
      {props.status}
    </text>
  )
}
