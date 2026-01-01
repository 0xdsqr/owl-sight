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
import { OverviewTab } from "./components/aws/overview-tab";
import { ServicesTab } from "./components/aws/services-tab";
import { TrendTab } from "./components/aws/trend-tab";
import { AuditTab } from "./components/aws/audit-tab";
import { S3Tab } from "./components/aws/s3-tab";
import { SettingsTab } from "./components/common/settings-tab";
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
import { CloudflareOverview } from "./components/cloudflare/cloudflare-overview";
import { CloudflareZones } from "./components/cloudflare/cloudflare-zones";
import { CloudflareWorkers } from "./components/cloudflare/cloudflare-workers";
import { CloudflareR2 } from "./components/cloudflare/cloudflare-r2";
import { OwlLogo } from "./components/common/owl-logo";
import { Header } from "./components/layout/header";
import { Footer } from "./components/layout/footer";
import { ProviderBar } from "./components/layout/provider-bar";
import { THEME_COLORS, PROVIDER_COLORS, STATUS_COLORS, FINDING_COLORS } from "./constants/colors";
import { TabBar } from "./components/layout/tab-bar";
import { LoadingIndicator } from "./components/layout/loading-indicator";
import { ErrorBox } from "./components/ui/error-box";

// Provider type
type Provider = "aws" | "cloudflare";

// AWS Tabs
const AWS_TABS = [
  { key: "1", name: "Overview", icon: "~" },
  { key: "2", name: "Services", icon: "$" },
  { key: "3", name: "Trend", icon: "^" },
  { key: "4", name: "Audit", icon: "!" },
  { key: "5", name: "S3", icon: "#" },
  { key: "6", name: "Settings", icon: "*" },
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
    if (key.raw >= "1" && key.raw <= "6") {
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
      backgroundColor={THEME_COLORS.background.primary}
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
                  <OverviewTab data={awsData()!} onNavigate={setActiveTab} />
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
                  <S3Tab
                    profile={settings.profiles[0] ?? "default"}
                    region={settings.regions[0] ?? "us-east-1"}
                  />
                </Match>
                <Match when={activeTab() === 5}>
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
                  <CloudflareOverview data={cloudflareData()!} onNavigate={setActiveTab} />
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
        borderColor={THEME_COLORS.border.default}
        backgroundColor={THEME_COLORS.background.secondary}
        padding={3}
        flexDirection="column"
        alignItems="center"
        width={60}
      >
        <text style={{ fg: PROVIDER_COLORS.cloudflare.primary }}>
          <b>Cloudflare Dashboard</b>
        </text>

        <Show
          when={props.hasToken}
          fallback={
            <>
              <text style={{ fg: FINDING_COLORS.error }} marginTop={2}>
                No API token configured
              </text>
              <text style={{ fg: THEME_COLORS.text.secondary }} marginTop={1}>
                Set CLOUDFLARE_API_TOKEN environment variable
              </text>
              <box marginTop={2} flexDirection="column" gap={1}>
                <text style={{ fg: THEME_COLORS.text.muted }}>
                  export CLOUDFLARE_API_TOKEN="your-token"
                </text>
              </box>
              <box marginTop={2}>
                <OwlLogo />
              </box>
            </>
          }
        >
          <text style={{ fg: STATUS_COLORS.success }} marginTop={2}>
            Token configured - Loading...
          </text>
        </Show>
      </box>
    </box>
  );
}
