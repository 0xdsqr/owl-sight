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
  const color = typeof props.color === "function" ? props.color(props.value) : (props.color ?? "#58a6ff")

  return (
    <box flexDirection="row" gap={1} alignItems="center">
      {props.label && <text style={{ fg: "#8b949e" }}>{props.label}</text>}
      <text>
        <span style={{ fg: color }}>{"█".repeat(filled)}</span>
        <span style={{ fg: "#21262d" }}>{"░".repeat(empty)}</span>
      </text>
      {props.showPercentage && (
        <text style={{ fg: "#8b949e" }}>{props.value.toFixed(0)}%</text>
      )}
    </box>
  )
}
