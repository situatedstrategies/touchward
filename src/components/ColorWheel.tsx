import { memo, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { hexToHsv, hsvToHex, isHexColor, normalizeHex, type Hsv } from "../design/palette";
import type { Theme } from "../design/theme";
import { body, bodySemibold } from "../design/typography";
import { SWATCHES } from "../types";

const WEDGES = 48;
const WHEEL_SIZE = 232;
/** How often a drag reports a new color to the app. Local state updates every frame. */
const EMIT_INTERVAL_MS = 90;
const SLIDER_HEIGHT = 28;
const THUMB = 26;

interface Props {
  value: string;
  onChange: (hex: string) => void;
  theme: Theme;
}

/**
 * A color picker: a hue and saturation wheel to tap or drag, a brightness
 * slider, a row of quick swatches, and a hex field to read or type.
 */
export function ColorWheel({ value, onChange, theme }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value.toUpperCase());
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // Follow outside changes (another swatch, a reset) without fighting a drag.
  useEffect(() => {
    if (hsvToHex(hsvRef.current) !== normalizeHex(value)) {
      const next = hexToHsv(value);
      setHsv(next);
      hsvRef.current = next;
    }
    setHexText(normalizeHex(value) ?? value);
  }, [value]);

  const lastEmit = useRef(0);
  const emitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(
    () => () => {
      if (emitTimer.current) clearTimeout(emitTimer.current);
    },
    [],
  );

  /** Show the new color at once; tell the app at most every EMIT_INTERVAL_MS, and always at the end. */
  const commit = (next: Hsv, final = false) => {
    setHsv(next);
    hsvRef.current = next;
    const hex = hsvToHex(next);
    setHexText(hex);
    const now = Date.now();
    if (emitTimer.current) {
      clearTimeout(emitTimer.current);
      emitTimer.current = null;
    }
    if (final || now - lastEmit.current >= EMIT_INTERVAL_MS) {
      lastEmit.current = now;
      onChangeRef.current(hex);
    } else {
      emitTimer.current = setTimeout(() => {
        lastEmit.current = Date.now();
        onChangeRef.current(hsvToHex(hsvRef.current));
      }, EMIT_INTERVAL_MS);
    }
  };

  const radius = WHEEL_SIZE / 2;
  const wheelResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderRelease: () => commit(hsvRef.current, true),
        onPanResponderTerminate: () => commit(hsvRef.current, true),
      }),
    [],
  );

  function pick(x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.min(1, Math.hypot(dx, dy) / radius);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    commit({ h: angle, s: dist, v: hsvRef.current.v });
  }

  const sliderWidth = useRef(WHEEL_SIZE);
  const sliderResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => slide(e.nativeEvent.locationX),
        onPanResponderMove: (e) => slide(e.nativeEvent.locationX),
        onPanResponderRelease: () => commit(hsvRef.current, true),
        onPanResponderTerminate: () => commit(hsvRef.current, true),
      }),
    [],
  );

  function slide(x: number) {
    if (!Number.isFinite(x)) return;
    const v = Math.min(1, Math.max(0, x / sliderWidth.current));
    commit({ ...hsvRef.current, v });
  }

  const onHexChange = (text: string) => {
    setHexText(text);
    if (isHexColor(text)) {
      const hex = normalizeHex(text);
      if (hex) {
        const next = hexToHsv(hex);
        setHsv(next);
        hsvRef.current = next;
        onChange(hex);
      }
    }
  };

  const hex = hsvToHex(hsv);
  const fullBright = hsvToHex({ ...hsv, v: 1 });
  const angle = (hsv.h * Math.PI) / 180;
  const thumbX = radius + Math.cos(angle) * hsv.s * radius;
  const thumbY = radius + Math.sin(angle) * hsv.s * radius;

  return (
    <View style={styles.container}>
      <View
        style={[styles.wheel, { width: WHEEL_SIZE, height: WHEEL_SIZE }]}
        {...wheelResponder.panHandlers}
      >
        <HueWheel size={WHEEL_SIZE} />
        <View
          pointerEvents="none"
          style={[styles.shade, { opacity: 1 - hsv.v, borderRadius: WHEEL_SIZE / 2 }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbX - THUMB / 2,
              top: thumbY - THUMB / 2,
              backgroundColor: hex,
              borderColor: theme.text,
            },
          ]}
        />
      </View>

      <View
        style={styles.slider}
        onLayout={(e) => {
          sliderWidth.current = e.nativeEvent.layout.width;
        }}
        {...sliderResponder.panHandlers}
      >
        <Svg width="100%" height={SLIDER_HEIGHT}>
          <Defs>
            <LinearGradient id="brightness" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" />
              <Stop offset="1" stopColor={fullBright} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={SLIDER_HEIGHT / 2} fill="url(#brightness)" />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            {
              left: `${hsv.v * 100}%`,
              backgroundColor: hex,
              borderColor: theme.text,
            },
          ]}
        />
      </View>

      <View style={styles.swatches}>
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => onHexChange(c)}
            accessibilityRole="button"
            accessibilityLabel={`Use ${c}`}
            style={[styles.swatch, { backgroundColor: c, borderColor: theme.border }]}
          />
        ))}
      </View>

      <View style={styles.hexRow}>
        <View style={[styles.preview, { backgroundColor: hex, borderColor: theme.border }]} />
        <Text style={[styles.hexLabel, { color: theme.muted }]}>Hex</Text>
        <TextInput
          value={hexText}
          onChangeText={onHexChange}
          onBlur={() => setHexText(hex)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={[
            styles.hexInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          accessibilityLabel="Hex color"
        />
      </View>
    </View>
  );
}

/**
 * The wheel itself: hue around the circle, white at the center to full
 * saturation at the edge, drawn once as wedges each with its own radial
 * gradient. Brightness is a separate overlay so drags never redraw this.
 */
const HueWheel = memo(function HueWheel({ size }: { size: number }) {
  const r = size / 2;
  const wedges = useMemo(() => {
    const out: { d: string; hue: number }[] = [];
    const step = 360 / WEDGES;
    for (let i = 0; i < WEDGES; i++) {
      const a0 = ((i * step - 0.5) * Math.PI) / 180;
      const a1 = (((i + 1) * step + 0.5) * Math.PI) / 180;
      const x0 = r + r * Math.cos(a0);
      const y0 = r + r * Math.sin(a0);
      const x1 = r + r * Math.cos(a1);
      const y1 = r + r * Math.sin(a1);
      out.push({ d: `M${r},${r} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Z`, hue: i * step });
    }
    return out;
  }, [r]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        {wedges.map((w, i) => (
          <RadialGradient
            key={i}
            id={`hue${i}`}
            cx={r}
            cy={r}
            r={r}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={hsvToHex({ h: w.hue, s: 1, v: 1 })} />
          </RadialGradient>
        ))}
      </Defs>
      {wedges.map((w, i) => (
        <Path key={i} d={w.d} fill={`url(#hue${i})`} />
      ))}
    </Svg>
  );
});

const styles = StyleSheet.create({
  container: { marginTop: 8, alignItems: "center" },
  wheel: { borderRadius: WHEEL_SIZE / 2, overflow: "hidden" },
  shade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
  slider: {
    width: "100%",
    maxWidth: WHEEL_SIZE + 40,
    height: SLIDER_HEIGHT,
    marginTop: 18,
    justifyContent: "center",
  },
  sliderThumb: {
    position: "absolute",
    top: (SLIDER_HEIGHT - THUMB) / 2,
    marginLeft: -THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
  swatches: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 16 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    margin: 4,
  },
  hexRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
  preview: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  hexLabel: bodySemibold(13),
  hexInput: {
    ...body(16),
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontVariant: ["tabular-nums"],
  },
});
