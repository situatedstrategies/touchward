import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import { useSettings } from "../../store/settings";
import { HOLD_PRESETS, type Mode } from "../../types";
import { Category, Hint, Row, Section, Stepper } from "./controls";

const MODES: { id: Mode; label: string; hint: string }[] = [
  {
    id: "both",
    label: "Tap or hold",
    hint: "Quick press taps. Keep holding to run the timer.",
  },
  { id: "tap", label: "Tap only", hint: "Every press is a reward. No timer." },
  { id: "hold", label: "Hold only", hint: "Only finishing the timer pays out." },
];

const MIN_HOLD_SECONDS = 1;
const MAX_HOLD_SECONDS = 600;

export function ButtonSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const modeHint = MODES.find((m) => m.id === settings.mode)?.hint ?? "";

  const stepHold = (delta: number) => {
    const next = Math.min(
      MAX_HOLD_SECONDS,
      Math.max(MIN_HOLD_SECONDS, settings.holdSeconds + delta),
    );
    update({ holdSeconds: next });
  };

  return (
    <Category title="Button" theme={theme}>
      <Section title="Press" theme={theme}>
        <Row>
          {MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={settings.mode === m.id}
              onPress={() => update({ mode: m.id })}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>{modeHint}</Hint>
      </Section>

      {settings.mode !== "tap" && (
        <Section title="Hold timer" theme={theme}>
          <Row>
            {HOLD_PRESETS.map((s) => (
              <Chip
                key={s}
                label={`${s}s`}
                selected={settings.holdSeconds === s}
                onPress={() => update({ holdSeconds: s })}
                theme={theme}
              />
            ))}
          </Row>
          <Stepper
            value={`${settings.holdSeconds}s`}
            onStep={stepHold}
            theme={theme}
            decrementLabel="One second shorter"
            incrementLabel="One second longer"
          />
          <Hint theme={theme}>
            Hold the button until its outline fills. Let go early and nothing happens.
          </Hint>
        </Section>
      )}
    </Category>
  );
}
