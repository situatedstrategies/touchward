import brumeDoree from "../../assets/music/brume_doree.m4a";
import canopeeDusk from "../../assets/music/canopee_dusk.m4a";
import jardinNocturne from "../../assets/music/jardin_nocturne.m4a";
import miroirTropical from "../../assets/music/miroir_tropical.m4a";
import neonLagune from "../../assets/music/neon_lagune.m4a";
import oiseauLent from "../../assets/music/oiseau_lent.m4a";
import palmierBleu from "../../assets/music/palmier_bleu.m4a";
import plageViolette from "../../assets/music/plage_violette.m4a";
import soleilDoux from "../../assets/music/soleil_doux.m4a";
import vagueLointaine from "../../assets/music/vague_lointaine.m4a";

export interface Track {
  id: string;
  title: string;
  /** Asset id from Metro; expo-audio takes it as a source. */
  source: number;
}

/**
 * The ambient set that ships with the app: ten short pieces, each fading in
 * from and out to silence, level matched to -16 LUFS. Their origin and terms
 * are in assets/music/LICENSES.md; the player shuffles them and crossfades.
 */
export const TRACKS: Track[] = [
  { id: "canopee_dusk", title: "Canopée Dusk", source: canopeeDusk },
  { id: "plage_violette", title: "Plage Violette", source: plageViolette },
  { id: "neon_lagune", title: "Néon Lagune", source: neonLagune },
  { id: "soleil_doux", title: "Soleil Doux", source: soleilDoux },
  { id: "jardin_nocturne", title: "Jardin Nocturne", source: jardinNocturne },
  { id: "oiseau_lent", title: "Oiseau Lent", source: oiseauLent },
  { id: "miroir_tropical", title: "Miroir Tropical", source: miroirTropical },
  { id: "brume_doree", title: "Brume Dorée", source: brumeDoree },
  { id: "palmier_bleu", title: "Palmier Bleu", source: palmierBleu },
  { id: "vague_lointaine", title: "Vague Lointaine", source: vagueLointaine },
];

/** Shown in the app and the store listing next to the music setting. */
export const MUSIC_CREDIT =
  "These ambient tracks were created using AI-generated composition and audio-synthesis code through Perplexity Computer. The recordings were synthesized programmatically; no third-party audio recordings or sample libraries were incorporated into the generation process.";
