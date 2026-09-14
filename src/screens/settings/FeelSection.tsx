import { REWARD_MODE_SPECS } from "../../button/rewardModes";
import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import {
  isPulsarAvailable,
  playPattern,
  playPulsarPreset,
  playReward,
  presetLabel,
  pulsarPresetNames,
  pulsarSupportLevel,
  PATTERNS_BY_ID,
} from "../../haptics";
import { useSettings } from "../../store/settings";
import { REWARD_MODES, STRENGTHS, type PatternId, type RewardMode } from "../../types";
import { Category, Hint, PresetPicker, Row, Section, SubLabel } from "./controls";

const ADVANCED_SUPPORT = 3;

export function FeelSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const pulsar = isPulsarAvailable();
  const limited = pulsar && pulsarSupportLevel() < ADVANCED_SUPPORT;
  const mode = REWARD_MODES.find((m) => m.id === settings.rewardMode) ?? REWARD_MODES[0];

  const playMode = (id: RewardMode, strength: number) => {
    const spec = REWARD_MODE_SPECS[id];
    playReward({ pattern: spec.pulsar, strength, pulses: spec.pulses });
  };

  const chooseMode = (id: RewardMode) => {
    update({ rewardMode: id });
    playMode(id, settings.hapticStrength);
  };

  const chooseStrength = (value: number) => {
    update({ hapticStrength: value });
    playMode(settings.rewardMode, value);
  };

  const chooseTapPreset = (name: string | null) => {
    update({ tapPreset: name });
    if (name) playPulsarPreset(name);
    else playMode(settings.rewardMode, settings.hapticStrength);
  };

  const chooseHoldPattern = (id: PatternId) => {
    update({ holdPattern: id });
    playPattern(PATTERNS_BY_ID[id]);
  };

  const chooseHoldPreset = (name: string | null) => {
    update({ holdPreset: name });
    if (name) playPulsarPreset(name);
    else playPattern(PATTERNS_BY_ID[settings.holdPattern]);
  };

  return (
    <Category title="Feel" theme={theme}>
      <Section title="Tap" theme={theme}>
        <Row>
          {REWARD_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={settings.rewardMode === m.id}
              onPress={() => chooseMode(m.id)}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>
          {mode.visual}, {mode.haptic}. Sets what a tap looks and feels like. Picking one plays
          it.
        </Hint>
        {pulsar && (
          <>
            <SubLabel theme={theme}>Strength</SubLabel>
            <Hint theme={theme}>
              Full is the motor's ceiling. Hard and Max add energy on top: every tap at full
              amplitude, echo taps a few milliseconds behind, and a low rumble underneath.
            </Hint>
            <Row>
              {STRENGTHS.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={Math.abs(settings.hapticStrength - s.value) < 0.01}
                  onPress={() => chooseStrength(s.value)}
                  theme={theme}
                />
              ))}
            </Row>
            <SubLabel theme={theme}>Pulsar preset</SubLabel>
            <PresetPicker value={settings.tapPreset} onChange={chooseTapPreset} theme={theme} />
            <Hint theme={theme}>
              {settings.tapPreset
                ? `Every tap plays "${presetLabel(settings.tapPreset)}" instead of the mode's own haptic.`
                : `Or pick one of Pulsar's ${pulsarPresetNames().length} presets to play on every tap instead. Picking one plays it.`}
            </Hint>
          </>
        )}
      </Section>

      {settings.mode !== "tap" && (
        <Section title="Timer done" theme={theme}>
          <Row>
            {Object.values(PATTERNS_BY_ID).map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                selected={settings.holdPattern === p.id}
                onPress={() => chooseHoldPattern(p.id)}
                theme={theme}
              />
            ))}
          </Row>
          <Hint theme={theme}>
            {PATTERNS_BY_ID[settings.holdPattern].description} This is what buzzes back when the
            outline fills.
          </Hint>
          {pulsar && (
            <>
              <SubLabel theme={theme}>Pulsar preset</SubLabel>
              <PresetPicker
                value={settings.holdPreset}
                onChange={chooseHoldPreset}
                theme={theme}
              />
              <Hint theme={theme}>
                {settings.holdPreset
                  ? `Finishing the timer plays "${presetLabel(settings.holdPreset)}".`
                  : "Or pick a Pulsar preset for the timer instead."}
              </Hint>
            </>
          )}
        </Section>
      )}

      {!pulsar && (
        <Section title="Engine" theme={theme}>
          <Hint theme={theme}>
            This build plays the built in patterns. Development and store builds include Pulsar,
            which adds strength control and over 150 presets with real amplitude and sharpness.
          </Hint>
        </Section>
      )}
      {limited && (
        <Section title="Engine" theme={theme}>
          <Hint theme={theme}>
            This phone reports limited haptic control, so patterns may play simplified.
          </Hint>
        </Section>
      )}
    </Category>
  );
}
