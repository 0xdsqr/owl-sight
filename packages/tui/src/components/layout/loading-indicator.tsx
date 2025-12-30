import { ProgressBar } from "../ui/progress-bar"

type Provider = "aws" | "cloudflare"

interface LoadingState {
  isLoading: boolean
  message: string
  progress: number
}

interface LoadingIndicatorProps {
  state: LoadingState
  provider: Provider
}

export function LoadingIndicator(props: LoadingIndicatorProps) {
  const accentColor = () => (props.provider === "aws" ? "#ff9900" : "#f38020")

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <box
        border
        borderStyle="rounded"
        borderColor="#30363d"
        backgroundColor="#161b22"
        padding={3}
        flexDirection="column"
        alignItems="center"
        gap={1}
      >
        <text style={{ fg: accentColor() }}>
          <b>
            {props.provider === "aws"
              ? "Loading AWS Data"
              : "Loading Cloudflare Data"}
          </b>
        </text>
        <text style={{ fg: "#8b949e" }} marginTop={1}>
          {props.state.message}
        </text>
        <box marginTop={1}>
          <ProgressBar
            value={props.state.progress}
            maxWidth={40}
            color={accentColor()}
            showPercentage
          />
        </box>
      </box>
    </box>
  )
}
