import { Chip } from "../../components/Chip";
import type { Theme } from "../../design/theme";
import { isMusicAvailable } from "../../music/player";
import { MUSIC_CREDIT, TRACKS } from "../../music/tracks";
import { useSettings } from "../../store/settings";
import { useGate, useUnlock } from "../../store/unlock";
import { MUSIC_MIXES, MUSIC_VOLUMES, type MusicSettings } from "../../types";
import { Category, Hint, Row, Section, SubLabel, ToggleRow } from "./controls";

/**
 * Background music: on or off, what plays (a two track loop or the shuffled
 * set), how loud, and whether the silent switch stops it. All of it is part
 * of the unlock; the speaker on the home screen flips the same switch.
 */
export function SoundSection({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  const { unlocked } = useUnlock();
  const gate = useGate();
  const available = isMusicAvailable();
  const music = settings.music;
  const set = (patch: Partial<MusicSettings>) => update({ music: { ...music, ...patch } });
  const trackChips = (slot: "first" | "second") =>
    TRACKS.map((t) => (
      <Chip
        key={t.id}
        label={t.title}
        selected={music[slot] === t.id}
        locked={!unlocked}
        onPress={() => gate(false, () => set({ [slot]: t.id }))}
        theme={theme}
      />
    ));

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
            ? "Plays while Touchward is open and stops when you leave. The speaker at the top of the home screen turns it on and off too."
            : "Not available in this build. The development and store builds support it."}
        </Hint>
        {available && (
          <>
            <SubLabel theme={theme}>What plays</SubLabel>
            <Row>
              {MUSIC_MIXES.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  selected={music.mix === m.id}
                  locked={!unlocked}
                  onPress={() => gate(false, () => set({ mix: m.id }))}
                  theme={theme}
                />
              ))}
            </Row>
            {music.mix === "pair" ? (
              <>
                <Hint theme={theme}>
                  Two pieces take turns, one fading into the next. Pick the same piece twice for
                  a single loop. Ten pieces make {TRACKS.length * TRACKS.length} combinations.
                </Hint>
                <SubLabel theme={theme}>First</SubLabel>
                <Row>{trackChips("first")}</Row>
                <SubLabel theme={theme}>Second</SubLabel>
                <Row>{trackChips("second")}</Row>
              </>
            ) : (
              <Hint theme={theme}>
                All {TRACKS.length} pieces in a shuffled rotation, one fading into the next.
              </Hint>
            )}
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
