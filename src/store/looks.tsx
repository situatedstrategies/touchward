import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isHexColor } from "../design/palette";
import { LOOK_KEYS, type LookSettings, type SavedLook } from "../looks/looks";
import { DEFAULT_SETTINGS, MAX_STRENGTH, REWARD_MODES, RIPPLE_SHAPES, SHAPES } from "../types";

const LOOKS_KEY = "touchward.looks.v1";
const LIBRARY_LIMIT = 60;

interface LooksContextValue {
  looks: SavedLook[];
  save: (name: string, look: LookSettings) => SavedLook;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  loaded: boolean;
}

const LooksContext = createContext<LooksContextValue | null>(null);

const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const hexList = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((c) => isStr(c) && isHexColor(c)) ? (v as string[]) : null;

/** A stored look with every field checked, or null if it cannot be trusted. */
function sanitizeLook(raw: unknown): LookSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const tapColors = hexList(r.tapColors);
  const rippleColors = hexList(r.rippleColors);
  const shape = SHAPES.find((s) => s.id === r.shape)?.id ?? d.shape;
  const rewardMode = REWARD_MODES.find((m) => m.id === r.rewardMode)?.id ?? d.rewardMode;
  const rippleShape = RIPPLE_SHAPES.find((s) => s.id === r.rippleShape)?.id ?? d.rippleShape;
  return {
    shape,
    rewardMode,
    rippleShape,
    idleColor: isStr(r.idleColor) && isHexColor(r.idleColor) ? r.idleColor : d.idleColor,
    tapColors: tapColors && tapColors.length > 0 ? tapColors : d.tapColors,
    randomColors: isBool(r.randomColors) ? r.randomColors : d.randomColors,
    returnToIdle: isBool(r.returnToIdle) ? r.returnToIdle : d.returnToIdle,
    rippleColors: rippleColors && rippleColors.length === 3 ? rippleColors : d.rippleColors,
    rippleFollowButton: isBool(r.rippleFollowButton) ? r.rippleFollowButton : false,
    backdrop: isStr(r.backdrop) && r.backdrop.length > 0 ? r.backdrop : d.backdrop,
    hapticStrength: isNum(r.hapticStrength)
      ? Math.min(MAX_STRENGTH, Math.max(0, r.hapticStrength))
      : 0.8,
  };
}

function parseLooks(raw: string | null): SavedLook[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const out: SavedLook[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const look = sanitizeLook(r.look);
      if (!look || !isStr(r.id) || !isStr(r.name)) continue;
      out.push({ id: r.id, name: r.name, savedAt: isStr(r.savedAt) ? r.savedAt : "", look });
    }
    return out.slice(0, LIBRARY_LIMIT);
  } catch {
    return [];
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LooksProvider({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LOOKS_KEY)
      .then((raw) => {
        if (!cancelled) setLooks(parseLooks(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          hydrated.current = true;
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(LOOKS_KEY, JSON.stringify(looks)).catch(() => {});
  }, [looks]);

  const save = useCallback((name: string, look: LookSettings) => {
    const entry: SavedLook = {
      id: newId(),
      name: name.trim() || "Untitled",
      savedAt: new Date().toISOString(),
      look: Object.fromEntries(LOOK_KEYS.map((k) => [k, look[k]])) as LookSettings,
    };
    setLooks((list) => [entry, ...list].slice(0, LIBRARY_LIMIT));
    return entry;
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setLooks((list) =>
      list.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setLooks((list) => list.filter((l) => l.id !== id));
  }, []);

  const value = useMemo(
    () => ({ looks, save, rename, remove, loaded }),
    [looks, save, rename, remove, loaded],
  );
  return <LooksContext.Provider value={value}>{children}</LooksContext.Provider>;
}

export function useLooks(): LooksContextValue {
  const ctx = useContext(LooksContext);
  if (!ctx) throw new Error("useLooks must be used inside LooksProvider");
  return ctx;
}
