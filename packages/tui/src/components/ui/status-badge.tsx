import { STATUS_COLORS, THEME_COLORS } from "../../constants/colors"

interface StatusBadgeProps {
  status: string
  icon?: string
  colorMap?: Record<string, string>
}

const DEFAULT_COLORS: Record<string, string> = {
  success: STATUS_COLORS.success,
  warning: STATUS_COLORS.warning,
  error: STATUS_COLORS.error,
  info: STATUS_COLORS.info,
  active: STATUS_COLORS.active,
  inactive: STATUS_COLORS.inactive,
}

export function StatusBadge(props: StatusBadgeProps) {
  const colorMap = props.colorMap ?? DEFAULT_COLORS
  const color = colorMap[props.status.toLowerCase()] ?? THEME_COLORS.text.secondary

  return (
    <text style={{ fg: color }}>
      {props.icon && <span>{props.icon} </span>}
      {props.status}
    </text>
  )
}
