import { TextAttributes } from "@opentui/core";
import { render } from "@opentui/solid";
import { createSignal, onMount } from "solid-js";

const PROFILE_PATH = `${process.env.HOME}/.config/typefeast-pvp/profile.json`;

render(() => {
  const [profileExists, setProfileExists] = createSignal<boolean | null>(null);

  onMount(async () => {
    const file = Bun.file(PROFILE_PATH);
    const exists = await file.exists();
    setProfileExists(exists);
  });

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box justifyContent="center" alignItems="flex-start" flexDirection="column" gap={1}>
        <box justifyContent="center" alignItems="flex-end">
          <ascii_font font="tiny" text="TypeFeast PVP" />
        </box>

        <box flexDirection="column" gap={1}>
          <text attributes={TextAttributes.DIM}>Profile Check:</text>
          <text>
            {profileExists() === null
              ? "Checking..."
              : profileExists()
                ? "✓ Profile found"
                : "✗ Profile not found"}
          </text>
          {profileExists() === false && (
            <text attributes={TextAttributes.DIM}>
              Expected at: {PROFILE_PATH}
            </text>
          )}
        </box>
      </box>
    </box>
  );
});