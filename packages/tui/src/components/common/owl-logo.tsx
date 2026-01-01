import { Box, Text } from "@opentui/solid"
import { BRAND_COLORS, THEME_COLORS } from "../../constants/colors"

export function OwlLogo() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: BRAND_COLORS.owlPurple }}>
        {"    ___"}
      </text>
      <text style={{ fg: BRAND_COLORS.owlPurple }}>
        {"   {o,o}"}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleDark }}>
        {"   |)__)"}
      </text>
      <text style={{ fg: BRAND_COLORS.sightPurple }}>
        {"   -\"-\"-"}
      </text>
    </box>
  )
}

// Larger version for splash screen
export function OwlLogoLarge() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: BRAND_COLORS.owlPurple }}>{"       ___     "}</text>
      <text style={{ fg: BRAND_COLORS.owlPurple }}>{"      /   \\    "}</text>
      <text style={{ fg: BRAND_COLORS.purpleLight }}>{"     / O O \\   "}</text>
      <text style={{ fg: BRAND_COLORS.purpleMedium }}>{"    /  ___  \\  "}</text>
      <text style={{ fg: BRAND_COLORS.owlPurple }}>{"   /  /   \\  \\ "}</text>
      <text style={{ fg: BRAND_COLORS.purpleDark }}>{"  (  (     )  )"}</text>
      <text style={{ fg: BRAND_COLORS.sightPurple }}>{"   \\  \\___/  / "}</text>
      <text style={{ fg: BRAND_COLORS.purpleDarker }}>{"    \\_______/  "}</text>
      <text style={{ fg: BRAND_COLORS.purpleDarkest }}>{"      |   |    "}</text>
      <text style={{ fg: BRAND_COLORS.purpleVeryDark }}>{"     _|   |_   "}</text>
    </box>
  )
}

// With glasses!
export function OwlLogoWithGlasses() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: THEME_COLORS.text.secondary, fontSize: 10 }}>
        {"          ^___^          "}
      </text>
      <text style={{ fg: BRAND_COLORS.owlPurple }}>
        {"         /     \\         "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleLight }}>
        {"        | O   O |        "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleDark }}>
        {"       ┌─────────┐       "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleDark }}>
        {"       │  ◉ ◉  │       "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleDark }}>
        {"       └─────────┘       "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleMedium }}>
        {"         \\  v  /         "}
      </text>
      <text style={{ fg: BRAND_COLORS.owlPurple }}>
        {"          \\ | /          "}
      </text>
      <text style={{ fg: BRAND_COLORS.sightPurple }}>
        {"         (  )  )         "}
      </text>
      <text style={{ fg: BRAND_COLORS.purpleDarker }}>
        {"          \\___/          "}
      </text>
    </box>
  )
}
