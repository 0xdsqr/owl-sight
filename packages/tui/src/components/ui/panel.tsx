import { THEME_COLORS } from "../../constants/colors"

interface PanelProps {
  title?: string
  titleAlignment?: "left" | "center" | "right"
  borderColor?: string
  children: any
  flexGrow?: number
  width?: number | string
  height?: number | string
  padding?: number
  gap?: number
}

export function Panel(props: PanelProps) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={props.borderColor ?? THEME_COLORS.border.default}
      flexDirection="column"
      title={props.title ? ` ${props.title} ` : undefined}
      titleAlignment={props.titleAlignment ?? "left"}
      flexGrow={props.flexGrow}
      width={props.width}
      height={props.height}
      padding={props.padding}
      gap={props.gap}
    >
      {props.children}
    </box>
  )
}
