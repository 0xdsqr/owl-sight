import { Box, Text } from "@opentui/solid"

export function OwlLogo() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: "#a78bfa" }}>
        {"    ___"}
      </text>
      <text style={{ fg: "#a78bfa" }}>
        {"   {o,o}"}
      </text>
      <text style={{ fg: "#8b5cf6" }}>
        {"   |)__)"}
      </text>
      <text style={{ fg: "#7c3aed" }}>
        {"   -\"-\"-"}
      </text>
    </box>
  )
}

// Larger version for splash screen
export function OwlLogoLarge() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: "#a78bfa" }}>{"       ___     "}</text>
      <text style={{ fg: "#a78bfa" }}>{"      /   \\    "}</text>
      <text style={{ fg: "#ddd6fe" }}>{"     / O O \\   "}</text>
      <text style={{ fg: "#c4b5fd" }}>{"    /  ___  \\  "}</text>
      <text style={{ fg: "#a78bfa" }}>{"   /  /   \\  \\ "}</text>
      <text style={{ fg: "#8b5cf6" }}>{"  (  (     )  )"}</text>
      <text style={{ fg: "#7c3aed" }}>{"   \\  \\___/  / "}</text>
      <text style={{ fg: "#6d28d9" }}>{"    \\_______/  "}</text>
      <text style={{ fg: "#5b21b6" }}>{"      |   |    "}</text>
      <text style={{ fg: "#4c1d95" }}>{"     _|   |_   "}</text>
    </box>
  )
}

// With glasses!
export function OwlLogoWithGlasses() {
  return (
    <box flexDirection="column" alignItems="center">
      <text style={{ fg: "#8b949e", fontSize: 10 }}>
        {"          ^___^          "}
      </text>
      <text style={{ fg: "#a78bfa" }}>
        {"         /     \\         "}
      </text>
      <text style={{ fg: "#ddd6fe" }}>
        {"        | O   O |        "}
      </text>
      <text style={{ fg: "#8b5cf6" }}>
        {"       ┌─────────┐       "}
      </text>
      <text style={{ fg: "#8b5cf6" }}>
        {"       │  ◉ ◉  │       "}
      </text>
      <text style={{ fg: "#8b5cf6" }}>
        {"       └─────────┘       "}
      </text>
      <text style={{ fg: "#c4b5fd" }}>
        {"         \\  v  /         "}
      </text>
      <text style={{ fg: "#a78bfa" }}>
        {"          \\ | /          "}
      </text>
      <text style={{ fg: "#7c3aed" }}>
        {"         (  )  )         "}
      </text>
      <text style={{ fg: "#6d28d9" }}>
        {"          \\___/          "}
      </text>
    </box>
  )
}
