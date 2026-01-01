import { STATUS_COLORS, THEME_COLORS } from "../../constants/colors"

interface ProgressBarProps {
  value: number
  maxWidth?: number
  color?: string | ((value: number) => string)
  showPercentage?: boolean
  label?: string
}

export function ProgressBar(props: ProgressBarProps) {
  const width = props.maxWidth ?? 20
  const filled = Math.min(Math.round((props.value / 100) * width), width)
  const empty = width - filled
  const color = typeof props.color === "function" ? props.color(props.value) : (props.color ?? STATUS_COLORS.info)

  return (
    <box flexDirection="row" gap={1} alignItems="center">
      {props.label && <text style={{ fg: THEME_COLORS.text.secondary }}>{props.label}</text>}
      <text>
        <span style={{ fg: color }}>{"█".repeat(filled)}</span>
        <span style={{ fg: THEME_COLORS.background.tertiary }}>{"░".repeat(empty)}</span>
      </text>
      {props.showPercentage && (
        <text style={{ fg: THEME_COLORS.text.secondary }}>{props.value.toFixed(0)}%</text>
      )}
    </box>
  )
}
