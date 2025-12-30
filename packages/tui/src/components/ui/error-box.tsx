interface ErrorBoxProps {
  error: string
  retryHint?: string
}

export function ErrorBox(props: ErrorBoxProps) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#f85149"
      padding={2}
      backgroundColor="#21262d"
      flexDirection="column"
    >
      <text style={{ fg: "#f85149" }}>
        <b>Error</b>
      </text>
      <text style={{ fg: "#f0883e" }} marginTop={1}>
        {props.error}
      </text>
      <text style={{ fg: "#8b949e" }} marginTop={2}>
        {props.retryHint ?? "Press r to retry or check your credentials."}
      </text>
    </box>
  )
}
