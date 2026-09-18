import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import {
  isFreeLinger,
  isFreeRippleMax,
  isFreeRippleShape,
  isFreeRippleWidth,
  isFreeShape,
} from "../../purchases/gates";
import { useSettings } from "../../store/settings";
import { useGate, useUnlock } from "../../store/unlock";
import {
  RIPPLE_LINGERS,
  RIPPLE_MAX_MAX,
  RIPPLE_MAX_MIN,
  RIPPLE_SHAPES,
  RIPPLE_WIDTHS,
  SHAPES,
} from "../../types";
import { Category, Hint, Row, Section, SubLabel } from "./controls";

export function ShapeSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  return (
    <Category title="Shape" theme={theme}>
      <Section title="Button" theme={theme}>
        <Row>
          {SHAPES.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              selected={settings.shape === s.id}
              locked={!unlocked && !isFreeShape(s.id)}
              onPress={() => gate(isFreeShape(s.id), () => update({ shape: s.id }))}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>The hold timer traces this same outline.</Hint>
      </Section>

      <Section title="Ripples" theme={theme}>
        <Row>
          {RIPPLE_SHAPES.map((r) => (
            <Chip
              key={r.id}
              label={r.label}
              selected={settings.rippleShape === r.id}
              locked={!unlocked && !isFreeRippleShape(r.id)}
              onPress={() => gate(isFreeRippleShape(r.id), () => update({ rippleShape: r.id }))}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>
          The outline of the ripples and of the rings in Original mode. Wavy rings around a
          round button are the look from the app icon.
        </Hint>
        <SubLabel theme={theme}>Thickness</SubLabel>
        <Row>
          {RIPPLE_WIDTHS.map((w) => (
            <Chip
              key={w.id}
              label={w.label}
              selected={settings.rippleWidth === w.id}
              locked={!unlocked && !isFreeRippleWidth(w.id)}
              onPress={() => gate(isFreeRippleWidth(w.id), () => update({ rippleWidth: w.id }))}
              theme={theme}
            />
          ))}
        </Row>
        <SubLabel theme={theme}>Linger</SubLabel>
        <Row>
          {RIPPLE_LINGERS.map((l) => (
            <Chip
              key={l.value}
              label={l.label}
              selected={settings.rippleLinger === l.value}
              locked={!unlocked && !isFreeLinger(l.value)}
              onPress={() =>
                gate(isFreeLinger(l.value), () => update({ rippleLinger: l.value }))
              }
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>
          How long each ripple stays at the end of its travel before it fades. With a longer
          linger, a few taps in a row build up layered rings.
        </Hint>
        <SubLabel theme={theme}>Rings at a time</SubLabel>
        <Row>
          {Array.from(
            { length: RIPPLE_MAX_MAX - RIPPLE_MAX_MIN + 1 },
            (_, i) => RIPPLE_MAX_MIN + i,
          ).map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={settings.rippleMax === n}
              locked={!unlocked && !isFreeRippleMax(n)}
              onPress={() => gate(isFreeRippleMax(n), () => update({ rippleMax: n }))}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>
          The most ripples on screen at once. When a new one arrives past the limit, the oldest
          makes room.
        </Hint>
      </Section>
    </Category>
  );
}
