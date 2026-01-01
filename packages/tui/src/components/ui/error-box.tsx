import { STATUS_COLORS, THEME_COLORS, SEMANTIC_COLORS } from "../../constants/colors"

interface ErrorBoxProps {
  error: string
  retryHint?: string
}

export function ErrorBox(props: ErrorBoxProps) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={STATUS_COLORS.error}
      padding={2}
      backgroundColor={THEME_COLORS.background.tertiary}
      flexDirection="column"
    >
      <text style={{ fg: STATUS_COLORS.error }}>
        <b>Error</b>
      </text>
      <text style={{ fg: SEMANTIC_COLORS.warning }} marginTop={1}>
        {props.error}
      </text>
      <text style={{ fg: THEME_COLORS.text.secondary }} marginTop={2}>
        {props.retryHint ?? "Press r to retry or check your credentials."}
      </text>
    </box>
  )
}
