import { render } from "@opentui/solid"
import { ConsolePosition } from "@opentui/core"
import { App } from "./app"
import { parseCliArgs } from "./cli"

// Parse CLI arguments before rendering
const config = parseCliArgs()

render(() => <App config={config} />, {
  targetFps: 30,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    maxStoredLogs: 500,
    sizePercent: 30,
  },
})
