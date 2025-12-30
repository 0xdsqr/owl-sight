import { parseArgs } from "util"

export interface AppConfig {
  profiles: string[]
  regions: string[]
  timeRange: number // days
  useAll: boolean
}

export function parseCliArgs(): AppConfig {
  const { values } = parseArgs({
    options: {
      profiles: { type: "string", short: "p", multiple: true },
      regions: { type: "string", short: "r", multiple: true },
      "time-range": { type: "string", short: "t" },
      all: { type: "boolean", short: "a" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  })

  if (values.help) {
    console.log(`
AWS FinOps TUI - Terminal-based AWS cost dashboard

Usage: aws-finops-tui [options]

Options:
  -p, --profiles <names>   AWS profiles to use (space-separated)
  -r, --regions <regions>  AWS regions for EC2/audit (space-separated)
  -t, --time-range <days>  Time range in days (default: 30)
  -a, --all                Use all available AWS profiles
  -h, --help               Show this help message

Examples:
  aws-finops-tui                           # Use default profile
  aws-finops-tui -p dev prod               # Use specific profiles
  aws-finops-tui -a -r us-east-1 eu-west-1 # All profiles, specific regions
  aws-finops-tui -t 90                     # Last 90 days of data

Keyboard shortcuts (in TUI):
  1-5       Switch tabs
  Tab       Next tab
  Shift+Tab Previous tab
  r         Refresh data
  p         Profile selector
  e         Export data
  \`         Toggle console
  q/Ctrl+C  Quit
`)
    process.exit(0)
  }

  return {
    profiles: (values.profiles as string[]) ?? [],
    regions: (values.regions as string[]) ?? ["us-east-1"],
    timeRange: parseInt((values["time-range"] as string) ?? "30", 10),
    useAll: values.all ?? false,
  }
}
