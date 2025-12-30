import {
  createSignal,
  createResource,
  onMount,
  Match,
  Switch,
  Show,
  For,
} from "solid-js";
import { createStore } from "solid-js/store";
import {
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
} from "@opentui/solid";
import type { AppConfig } from "./cli";
import { OverviewTab } from "./components/OverviewTab";
import { ServicesTab } from "./components/ServicesTab";
import { TrendTab } from "./components/TrendTab";
import { AuditTab } from "./components/AuditTab";
import { SettingsTab } from "./components/SettingsTab";
import {
  getAvailableProfiles,
  loadAllData,
  type DashboardData as AWSDashboardData,
  type LoadingState,
} from "./providers/aws/client";
import {
  loadAllData as loadCloudflareData,
  type DashboardData as CloudflareDashboardData,
} from "./providers/cloudflare/client";
import { CloudflareOverview } from "./components/CloudflareOverview";
import { CloudflareZones } from "./components/CloudflareZones";
import { CloudflareWorkers } from "./components/CloudflareWorkers";
import { CloudflareR2 } from "./components/CloudflareR2";

// Provider type
type Provider = "aws" | "cloudflare";

// AWS Tabs
const AWS_TABS = [
  { key: "1", name: "Overview", icon: "~" },
  { key: "2", name: "Services", icon: "$" },
  { key: "3", name: "Trend", icon: "^" },
  { key: "4", name: "Audit", icon: "!" },
  { key: "5", name: "Settings", icon: "*" },
];

// Cloudflare Tabs
const CF_TABS = [
  { key: "1", name: "Overview", icon: "~" },
  { key: "2", name: "Zones", icon: "@" },
  { key: "3", name: "Workers", icon: ">" },
  { key: "4", name: "R2", icon: "#" },
  { key: "5", name: "Settings", icon: "*" },
];

export function App(props: { config: AppConfig }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();

  // Provider state
  const [activeProvider, setActiveProvider] = createSignal<Provider>("aws");
  const [hasCloudflare, setHasCloudflare] = createSignal(false);

  const [activeTab, setActiveTab] = createSignal(0);
  const [availableProfiles, setAvailableProfiles] = createSignal<string[]>([]);

  // Settings state
  const [settings, setSettings] = createStore({
    profiles: props.config.profiles,
    regions: props.config.regions,
    timeRange: props.config.timeRange,
    cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
    cloudflareAccountIds: [] as string[],
  });

  // Loading state
  const [loadingState, setLoadingState] = createSignal<LoadingState>({
    isLoading: true,
    message: "Initializing...",
    progress: 0,
  });

  // Data state
  const [awsData, setAwsData] = createSignal<AWSDashboardData | null>(null);
  const [cloudflareData, setCloudflareData] =
    createSignal<CloudflareDashboardData | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  // Check for Cloudflare token on mount
  onMount(async () => {
    renderer.useConsole = true;

    // Check for Cloudflare
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfToken) {
      setHasCloudflare(true);
    }

    try {
      const profiles = await getAvailableProfiles();
      setAvailableProfiles(profiles);

      let profilesToUse: string[];
      if (props.config.useAll) {
        profilesToUse = profiles;
      } else if (props.config.profiles.length > 0) {
        profilesToUse = props.config.profiles;
      } else if (profiles.includes("default")) {
        profilesToUse = ["default"];
      } else if (profiles.length > 0) {
        profilesToUse = [profiles[0]!];
      } else {
        throw new Error("No AWS profiles found. Run 'aws configure' first.");
      }

      setSettings("profiles", profilesToUse);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoadingState({ isLoading: false, message: "", progress: 100 });
    }
  });

  const refreshData = async () => {
    setLoadingState({
      isLoading: true,
      message: "Loading data...",
      progress: 0,
    });
    setError(null);

    try {
      if (activeProvider() === "aws") {
        const result = await loadAllData(
          settings.profiles,
          settings.regions,
          settings.timeRange,
          (state) => setLoadingState(state),
        );
        setAwsData(result);
      } else if (
        activeProvider() === "cloudflare" &&
        settings.cloudflareToken
      ) {
        const result = await loadCloudflareData(
          settings.cloudflareToken,
          settings.cloudflareAccountIds,
          (state) => setLoadingState(state),
        );
        setCloudflareData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoadingState({ isLoading: false, message: "", progress: 100 });
    }
  };

  // Switch provider
  const switchProvider = (provider: Provider) => {
    if (provider === "cloudflare" && !hasCloudflare()) return;
    setActiveProvider(provider);
    setActiveTab(0);
    refreshData();
  };

  // Keyboard navigation
  useKeyboard((key) => {
    const tabs = activeProvider() === "aws" ? AWS_TABS : CF_TABS;

    // Tab switching with number keys
    if (key.raw >= "1" && key.raw <= "5") {
      setActiveTab(parseInt(key.raw) - 1);
      return;
    }

    switch (key.name) {
      case "tab":
        if (key.shift) {
          setActiveTab((t) => (t - 1 + tabs.length) % tabs.length);
        } else {
          setActiveTab((t) => (t + 1) % tabs.length);
        }
        break;
      case "r":
        refreshData();
        break;
      case "`":
        renderer.console.toggle();
        break;
      case "q":
        renderer.stop();
        process.exit(0);
        break;
    }

    // Provider switching with [ and ]
    if (key.raw === "[") {
      switchProvider("aws");
    } else if (key.raw === "]" && hasCloudflare()) {
      switchProvider("cloudflare");
    }

    // Ctrl+C to quit
    if (key.raw === "\u0003") {
      renderer.stop();
      process.exit(0);
    }
  });

  const tabs = () => (activeProvider() === "aws" ? AWS_TABS : CF_TABS);

  return (
    <box
      flexDirection="column"
      width="100%"
      height={dimensions().height}
      backgroundColor="#0d1117"
    >
      {/* Header */}
      <Header
        provider={activeProvider()}
        hasCloudflare={hasCloudflare()}
        profiles={settings.profiles}
        timeRange={settings.timeRange}
        isLoading={loadingState().isLoading}
        onProviderSwitch={switchProvider}
      />

      {/* Provider + Tab bar */}
      <box flexDirection="column">
        <ProviderBar
          active={activeProvider()}
          hasCloudflare={hasCloudflare()}
          onSwitch={switchProvider}
        />
        <TabBar
          tabs={tabs()}
          activeTab={activeTab()}
          onSelect={setActiveTab}
          provider={activeProvider()}
        />
      </box>

      {/* Main content */}
      <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
        <Show when={error()}>
          <ErrorBox error={error()!} />
        </Show>

        <Show when={loadingState().isLoading}>
          <LoadingIndicator
            state={loadingState()}
            provider={activeProvider()}
          />
        </Show>

        <Show when={!loadingState().isLoading && !error()}>
          <Switch>
            {/* AWS Views */}
            <Match when={activeProvider() === "aws" && awsData()}>
              <Switch>
                <Match when={activeTab() === 0}>
                  <OverviewTab data={awsData()!} />
                </Match>
                <Match when={activeTab() === 1}>
                  <ServicesTab data={awsData()!} />
                </Match>
                <Match when={activeTab() === 2}>
                  <TrendTab data={awsData()!} />
                </Match>
                <Match when={activeTab() === 3}>
                  <AuditTab data={awsData()!} />
                </Match>
                <Match when={activeTab() === 4}>
                  <SettingsTab
                    provider="aws"
                    settings={settings}
                    availableProfiles={availableProfiles()}
                    onSettingsChange={(newSettings) => {
                      setSettings(newSettings);
                    }}
                    onRefresh={refreshData}
                  />
                </Match>
              </Switch>
            </Match>

            {/* Cloudflare Views */}
            <Match
              when={
                activeProvider() === "cloudflare" && !settings.cloudflareToken
              }
            >
              <CloudflarePlaceholder hasToken={false} />
            </Match>
            <Match when={activeProvider() === "cloudflare" && cloudflareData()}>
              <Switch>
                <Match when={activeTab() === 0}>
                  <CloudflareOverview data={cloudflareData()!} />
                </Match>
                <Match when={activeTab() === 1}>
                  <CloudflareZones data={cloudflareData()!} />
                </Match>
                <Match when={activeTab() === 2}>
                  <CloudflareWorkers data={cloudflareData()!} />
                </Match>
                <Match when={activeTab() === 3}>
                  <CloudflareR2 data={cloudflareData()!} />
                </Match>
                <Match when={activeTab() === 4}>
                  <SettingsTab
                    provider="cloudflare"
                    settings={settings}
                    availableProfiles={availableProfiles()}
                    onSettingsChange={(newSettings) => {
                      setSettings(newSettings);
                    }}
                    onRefresh={refreshData}
                  />
                </Match>
              </Switch>
            </Match>
          </Switch>
        </Show>
      </box>

      {/* Footer */}
      <Footer provider={activeProvider()} hasCloudflare={hasCloudflare()} />
    </box>
  );
}

// ============================================================================
// Header Component - Now with branding and provider indicator
// ============================================================================

function Header(props: {
  provider: Provider;
  hasCloudflare: boolean;
  profiles: string[];
  timeRange: number;
  isLoading: boolean;
  onProviderSwitch: (p: Provider) => void;
}) {
  const providerColors = {
    aws: { bg: "#ff9900", fg: "#000000", accent: "#ff9900" },
    cloudflare: { bg: "#f38020", fg: "#000000", accent: "#f38020" },
  };

  const colors = () => providerColors[props.provider];

  return (
    <box
      height={3}
      backgroundColor="#161b22"
      paddingLeft={1}
      paddingRight={1}
      flexDirection="row"
      alignItems="center"
      borderColor="#30363d"
      border={["bottom"]}
    >
      {/* Logo */}
      <box flexDirection="row" alignItems="center" gap={1}>
        <text style={{ fg: "#a78bfa" }}>{"{o,o}"}</text>
        <text>
          <span style={{ fg: "#a78bfa", bold: true }}>owl</span>
          <span style={{ fg: "#8b949e" }}>-</span>
          <span style={{ fg: "#7c3aed", bold: true }}>sight</span>
        </text>
        <text style={{ fg: "#484f58" }}>|</text>
        <text style={{ fg: colors().accent }}>
          <b>{props.provider === "aws" ? "AWS" : "Cloudflare"}</b>
        </text>
      </box>

      <box flexGrow={1} />

      {/* Status info */}
      <box flexDirection="row" gap={2} alignItems="center">
        <Show when={props.provider === "aws"}>
          <text style={{ fg: "#8b949e" }}>
            <span style={{ fg: "#7ee787" }}>{props.profiles.length}</span>{" "}
            profile{props.profiles.length !== 1 ? "s" : ""}
          </text>
          <text style={{ fg: "#484f58" }}>|</text>
          <text style={{ fg: "#8b949e" }}>
            <span style={{ fg: "#58a6ff" }}>{props.timeRange}</span>d range
          </text>
        </Show>

        <Show when={props.isLoading}>
          <text style={{ fg: "#484f58" }}>|</text>
          <text style={{ fg: "#f0883e" }}>
            <span style={{ bold: true }}>...</span> Loading
          </text>
        </Show>
      </box>
    </box>
  );
}

// ============================================================================
// Provider Bar - Switch between AWS and Cloudflare
// ============================================================================

function ProviderBar(props: {
  active: Provider;
  hasCloudflare: boolean;
  onSwitch: (p: Provider) => void;
}) {
  return (
    <box
      height={2}
      backgroundColor="#0d1117"
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      alignItems="center"
      gap={1}
    >
      {/* AWS Tab */}
      <box
        paddingLeft={2}
        paddingRight={2}
        height={2}
        backgroundColor={props.active === "aws" ? "#21262d" : "transparent"}
        borderColor={props.active === "aws" ? "#ff9900" : "transparent"}
        border={props.active === "aws" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text style={{ fg: props.active === "aws" ? "#ff9900" : "#8b949e" }}>
          <span style={{ fg: "#484f58" }}>[</span>
          <span style={{ bold: props.active === "aws" }}>AWS</span>
          <span style={{ fg: "#484f58" }}>]</span>
        </text>
      </box>

      {/* Cloudflare Tab */}
      <box
        paddingLeft={2}
        paddingRight={2}
        height={2}
        backgroundColor={
          props.active === "cloudflare" ? "#21262d" : "transparent"
        }
        borderColor={props.active === "cloudflare" ? "#f38020" : "transparent"}
        border={props.active === "cloudflare" ? ["bottom"] : undefined}
        alignItems="center"
        justifyContent="center"
      >
        <text
          style={{
            fg: props.hasCloudflare
              ? props.active === "cloudflare"
                ? "#f38020"
                : "#8b949e"
              : "#484f58",
          }}
        >
          <span style={{ fg: "#484f58" }}>[</span>
          <span style={{ bold: props.active === "cloudflare" }}>
            Cloudflare
          </span>
          <span style={{ fg: "#484f58" }}>]</span>
          <Show when={!props.hasCloudflare}>
            <span style={{ fg: "#f85149" }}> (no token)</span>
          </Show>
        </text>
      </box>

      <box flexGrow={1} />

      <text style={{ fg: "#484f58" }}>[ / ] switch provider</text>
    </box>
  );
}

// ============================================================================
// Tab Bar - Now with icons and better styling
// ============================================================================

function TabBar(props: {
  tabs: typeof AWS_TABS;
  activeTab: number;
  onSelect: (idx: number) => void;
  provider: Provider;
}) {
  const accentColor = () => (props.provider === "aws" ? "#ff9900" : "#f38020");

  return (
    <box
      height={1}
      flexDirection="row"
      backgroundColor="#161b22"
      borderColor="#30363d"
      border={["bottom"]}
      paddingLeft={1}
    >
      <For each={props.tabs}>
        {(tab, idx) => {
          const isActive = () => props.activeTab === idx();
          return (
            <box
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={isActive() ? "#21262d" : "transparent"}
            >
              <text style={{ fg: isActive() ? accentColor() : "#8b949e" }}>
                <span style={{ fg: "#484f58" }}>{tab.key}</span>
                <span style={{ fg: isActive() ? "#c9d1d9" : "#8b949e" }}>
                  {" "}
                  {tab.name}
                </span>
              </text>
            </box>
          );
        }}
      </For>
      <box flexGrow={1} />
    </box>
  );
}

// ============================================================================
// Loading Indicator - with provider-specific colors
// ============================================================================

function LoadingIndicator(props: { state: LoadingState; provider: Provider }) {
  const barWidth = 40;
  const filled = Math.round((props.state.progress / 100) * barWidth);
  const empty = barWidth - filled;

  const accentColor = () => (props.provider === "aws" ? "#ff9900" : "#f38020");

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
        <text marginTop={1}>
          <span style={{ fg: accentColor() }}>{"█".repeat(filled)}</span>
          <span style={{ fg: "#21262d" }}>{"░".repeat(empty)}</span>
          <span style={{ fg: "#8b949e" }}> {props.state.progress}%</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Error Box
// ============================================================================

function ErrorBox(props: { error: string }) {
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
        Press <span style={{ fg: "#58a6ff" }}>r</span> to retry or check your
        credentials.
      </text>
    </box>
  );
}

// ============================================================================
// Cloudflare Placeholder
// ============================================================================

function CloudflarePlaceholder(props: { hasToken: boolean }) {
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
        width={60}
      >
        <text style={{ fg: "#f38020" }}>
          <b>Cloudflare Dashboard</b>
        </text>

        <Show
          when={props.hasToken}
          fallback={
            <>
              <text style={{ fg: "#f85149" }} marginTop={2}>
                No API token configured
              </text>
              <text style={{ fg: "#8b949e" }} marginTop={1}>
                Set CLOUDFLARE_API_TOKEN environment variable
              </text>
              <box marginTop={2} flexDirection="column" gap={1}>
                <text style={{ fg: "#484f58" }}>
                  export CLOUDFLARE_API_TOKEN="your-token"
                </text>
              </box>
            </>
          }
        >
          <text style={{ fg: "#7ee787" }} marginTop={2}>
            Token configured - Loading...
          </text>
        </Show>
      </box>
    </box>
  );
}

// ============================================================================
// Footer
// ============================================================================

function Footer(props: { provider: Provider; hasCloudflare: boolean }) {
  return (
    <box
      height={1}
      backgroundColor="#161b22"
      paddingLeft={1}
      paddingRight={1}
      borderColor="#30363d"
      border={["top"]}
      flexDirection="row"
      alignItems="center"
    >
      <text style={{ fg: "#484f58" }}>
        <span style={{ fg: "#8b949e" }}>1-5</span> tabs
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>Tab</span> next
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>r</span> refresh
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>`</span> console
        <span style={{ fg: "#484f58" }}>|</span>
        <span style={{ fg: "#8b949e" }}>q</span> quit
        <Show when={props.hasCloudflare}>
          <span style={{ fg: "#484f58" }}> | </span>
          <span style={{ fg: "#8b949e" }}>[ ]</span> switch provider
        </Show>
      </text>
    </box>
  );
}
