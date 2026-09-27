import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import { isMusicAvailable } from "../../music/player";
import { MUSIC_CREDIT, TRACKS } from "../../music/tracks";
import { useSettings } from "../../store/settings";
import { useGate, useUnlock } from "../../store/unlock";
import { MUSIC_VOLUMES, type MusicSettings } from "../../types";
import { Category, Hint, Row, Section, SubLabel, ToggleRow } from "./controls";

/** Background music: on or off, how loud, and whether the silent switch stops it. */
export function SoundSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  const available = isMusicAvailable();
  const music = settings.music;
  const set = (patch: Partial<MusicSettings>) => update({ music: { ...music, ...patch } });

  return (
    <Category title="Sound" theme={theme}>
      <Section title="Music" theme={theme}>
        <ToggleRow
          label={unlocked ? "Play music" : "Play music (unlock)"}
          value={music.enabled && available}
          onChange={(v) => gate(!v, () => set({ enabled: v }))}
          theme={theme}
        />
        <Hint theme={theme}>
          {available
            ? `${TRACKS.length} ambient pieces play in a shuffled rotation while Touchward is open, one fading into the next. Nothing plays once you leave the app.`
            : "Not available in this build. The development and store builds support it."}
        </Hint>
        {available && (
          <>
            <SubLabel theme={theme}>Volume</SubLabel>
            <Row>
              {MUSIC_VOLUMES.map((v) => (
                <Chip
                  key={v.value}
                  label={v.label}
                  selected={Math.abs(music.volume - v.value) < 0.01}
                  locked={!unlocked}
                  onPress={() => gate(false, () => set({ volume: v.value }))}
                  theme={theme}
                />
              ))}
            </Row>
            <ToggleRow
              label="Play when the ringer is silent"
              value={music.playsInSilentMode}
              onChange={(v) => gate(false, () => set({ playsInSilentMode: v }))}
              theme={theme}
            />
            {settings.volumeButtons && (
              <Hint theme={theme}>
                Volume button taps are on, so the phone's volume is parked at half while the app
                is open and the buttons will not change the music. Use the volume chips above
                instead.
              </Hint>
            )}
            <Hint theme={theme}>{MUSIC_CREDIT}</Hint>
          </>
        )}
      </Section>
    </Category>
  );
}
