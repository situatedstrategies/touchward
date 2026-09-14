import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import { useSettings } from "../../store/settings";
import { RIPPLE_SHAPES, SHAPES } from "../../types";
import { Category, Hint, Row, Section } from "./controls";

export function ShapeSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  return (
    <Category title="Shape" theme={theme}>
      <Section title="Button" theme={theme}>
        <Row>
          {SHAPES.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              selected={settings.shape === s.id}
              onPress={() => update({ shape: s.id })}
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
              onPress={() => update({ rippleShape: r.id })}
              theme={theme}
            />
          ))}
        </Row>
        <Hint theme={theme}>
          The outline of the ripples and of the rings in Original mode. Wavy rings around a
          round button are the look from the app icon.
        </Hint>
      </Section>
    </Category>
  );
}
