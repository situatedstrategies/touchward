import { Chip } from "../../components/Chip";
import { ColorField } from "../../components/ColorField";
import { BACKDROP_COLORS, isHexColor } from "../../design/palette";
import type { Theme } from "../../design/theme";
import { useSettings } from "../../store/settings";
import {
  COLOR_LIBRARY_LIMIT,
  RIPPLE_COLOR_SLOTS,
  SWATCHES,
  type ColorLibraryKey,
} from "../../types";
import {
  Actions,
  Category,
  Hint,
  Row,
  Section,
  SubLabel,
  TextButton,
  ToggleRow,
} from "./controls";

const MAX_REWARD_COLORS = 8;

export function ColorSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();

  const setTapColor = (index: number, hex: string) => {
    const next = [...settings.tapColors];
    next[index] = hex;
    update({ tapColors: next });
  };
  const addTapColor = () => {
    if (settings.tapColors.length >= MAX_REWARD_COLORS) return;
    const unused = SWATCHES.find((c) => !settings.tapColors.includes(c)) ?? SWATCHES[0];
    update({ tapColors: [...settings.tapColors, unused] });
  };
  const removeTapColor = (index: number) => {
    if (settings.tapColors.length <= 1) return;
    update({ tapColors: settings.tapColors.filter((_, i) => i !== index) });
  };

  const setRippleColor = (index: number, hex: string) => {
    const next = [...settings.rippleColors];
    next[index] = hex;
    update({ rippleColors: next });
  };

  const libraryFor = (key: ColorLibraryKey) => ({
    colors: settings.colorLibraries[key] ?? [],
    onSave: (hex: string) => {
      const current = settings.colorLibraries[key] ?? [];
      if (current.includes(hex)) return;
      update({
        colorLibraries: {
          ...settings.colorLibraries,
          [key]: [hex, ...current].slice(0, COLOR_LIBRARY_LIMIT),
        },
      });
    },
    onRemove: (hex: string) => {
      const current = settings.colorLibraries[key] ?? [];
      update({
        colorLibraries: { ...settings.colorLibraries, [key]: current.filter((c) => c !== hex) },
      });
    },
  });

  const customBackdrop = isHexColor(settings.backdrop);
  const backdropName = BACKDROP_COLORS.find((c) => c.hex === settings.backdrop)?.name;

  return (
    <Category title="Colors" theme={theme}>
      <Section title="Button" theme={theme}>
        <ColorField
          label="Resting"
          value={settings.idleColor}
          onChange={(hex) => update({ idleColor: hex })}
          theme={theme}
          library={libraryFor("idleColor")}
        />
        <SubLabel theme={theme}>On each reward</SubLabel>
        {settings.tapColors.map((c, i) => (
          <ColorField
            key={`${i}-${settings.tapColors.length}`}
            label={`Reward color ${i + 1}`}
            value={c}
            onChange={(hex) => setTapColor(i, hex)}
            theme={theme}
            library={libraryFor("tapColors")}
            action={
              settings.tapColors.length > 1
                ? { label: "Remove", onPress: () => removeTapColor(i) }
                : undefined
            }
          />
        ))}
        {settings.tapColors.length < MAX_REWARD_COLORS && (
          <Actions>
            <TextButton label="Add a reward color" onPress={addTapColor} theme={theme} />
          </Actions>
        )}
        <Hint theme={theme}>
          Each reward moves the button to the next reward color. Keep one color to make it flip
          between resting and that color.
        </Hint>
        <ToggleRow
          label="Shuffle the order"
          value={settings.randomColors}
          onChange={(v) => update({ randomColors: v })}
          theme={theme}
        />
        <ToggleRow
          label="Snap back to the resting color"
          value={settings.returnToIdle}
          onChange={(v) => update({ returnToIdle: v })}
          theme={theme}
        />
      </Section>

      <Section title="Ripples" theme={theme}>
        <ToggleRow
          label="Follow the button color"
          value={settings.rippleFollowButton}
          onChange={(v) => update({ rippleFollowButton: v })}
          theme={theme}
        />
        {settings.rippleFollowButton ? (
          <Hint theme={theme}>
            Rings and ripples are drawn in paler and deeper tints of whatever color the button
            is showing.
          </Hint>
        ) : (
          <>
            {Array.from({ length: RIPPLE_COLOR_SLOTS }, (_, i) => (
              <ColorField
                key={i}
                label={`Color ${i + 1}`}
                value={settings.rippleColors[i]}
                onChange={(hex) => setRippleColor(i, hex)}
                theme={theme}
                library={libraryFor("rippleColors")}
              />
            ))}
            <Hint theme={theme}>
              In Original mode these are the three rings, inner to outer. In every mode ripples
              cycle through them, one per tap. Set all three the same to get tints of one color.
            </Hint>
          </>
        )}
      </Section>

      <Section title="Background" theme={theme}>
        <Row>
          <Chip
            label="Navy glow"
            selected={settings.backdrop === "navy"}
            onPress={() => update({ backdrop: "navy" })}
            theme={theme}
          />
          <Chip
            label="Match phone"
            selected={settings.backdrop === "system"}
            onPress={() => update({ backdrop: "system" })}
            theme={theme}
          />
          <Chip
            label="Color"
            selected={customBackdrop}
            onPress={() => {
              if (!customBackdrop) update({ backdrop: BACKDROP_COLORS[0].hex });
            }}
            theme={theme}
          />
        </Row>
        {customBackdrop && (
          <>
            <Row>
              {BACKDROP_COLORS.map((c) => (
                <Chip
                  key={c.hex}
                  label={c.name}
                  selected={settings.backdrop === c.hex}
                  onPress={() => update({ backdrop: c.hex })}
                  theme={theme}
                />
              ))}
            </Row>
            <ColorField
              label={backdropName ?? "Custom"}
              value={settings.backdrop}
              onChange={(hex) => update({ backdrop: hex })}
              theme={theme}
              library={libraryFor("backdrop")}
            />
          </>
        )}
        <Hint theme={theme}>
          {settings.backdrop === "navy"
            ? "The icon's deep navy with a soft glow behind the button."
            : settings.backdrop === "system"
              ? "Follows your phone's light or dark setting."
              : "Pale, electric, black, white, or any color you type. Text switches to stay readable on it."}
        </Hint>
      </Section>
    </Category>
  );
}
