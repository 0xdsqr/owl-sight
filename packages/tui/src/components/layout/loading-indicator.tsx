import { ProgressBar } from "../ui/progress-bar"
import { PROVIDER_COLORS, THEME_COLORS } from "../../constants/colors"

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
  const accentColor = () => (props.provider === "aws" ? PROVIDER_COLORS.aws.primary : PROVIDER_COLORS.cloudflare.primary)

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
        borderColor={THEME_COLORS.border.default}
        backgroundColor={THEME_COLORS.background.secondary}
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
        <text style={{ fg: THEME_COLORS.text.secondary }} marginTop={1}>
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
