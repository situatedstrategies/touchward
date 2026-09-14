import type { Shape } from "../types";

/**
 * Every shape is a closed polyline in a 100 x 100 box, sampled densely enough
 * to read as a smooth curve. Working from points (not SVG arcs and curves)
 * means one path can drive the button, the ripples, and the hold timer, and
 * the timer can trace the outline because the path length is known.
 *
 * All outlines start at 12 o'clock and run clockwise, so a timer that fills
 * along the path starts at the top for every shape.
 */
const SIZE = 100;
const CENTER = SIZE / 2;
const STEPS = 180;

type Point = [number, number];

/** Sample a polar function r(angle) into points, starting at the top, clockwise. */
function polar(radius: (angle: number) => number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < STEPS; i++) {
    const a = -Math.PI / 2 + (i / STEPS) * Math.PI * 2;
    const r = radius(a);
    pts.push([CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)]);
  }
  return pts;
}

/** Superellipse |x/a|^n + |y/a|^n = 1: n = 2 is a circle, 4 a squircle, 10 a rounded square. */
function superellipse(a: number, n: number): Point[] {
  return polar((angle) => {
    const c = Math.abs(Math.cos(angle));
    const s = Math.abs(Math.sin(angle));
    return a / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
  });
}

function polygon(sides: number, radius: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    pts.push([CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)]);
  }
  return pts;
}

function star(points: number, outer: number, inner: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push([CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)]);
  }
  return pts;
}

/** The classic parametric heart, scaled to the box, top notch at 12 o'clock. */
function heart(): Point[] {
  const raw: Point[] = [];
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push([x, y]);
  }
  // Fit to the box with a small margin.
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const k = 94 / Math.max(w, h);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const pts = raw.map<Point>(([x, y]) => [CENTER + (x - cx) * k, CENTER + (y - cy) * k]);
  // t = 0 is the top notch; the parametric heart runs counterclockwise in screen
  // space, so reverse it to run clockwise like the other shapes.
  return [pts[0], ...pts.slice(1).reverse()];
}

/** The icon's wavy ring: a circle whose radius rises and falls `waves` times. */
export function wavyCircle(
  radius: number,
  waves: number,
  amplitude: number,
  phase = 0.4,
): Point[] {
  return polar((a) => radius + amplitude * Math.sin(waves * a + phase));
}

function toPath(pts: Point[]): string {
  return `${pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} Z`;
}

function length(pts: Point[]): number {
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

export const SHAPE_POINTS: Record<Shape, Point[]> = {
  circle: superellipse(47, 2),
  squircle: superellipse(47, 4),
  square: superellipse(46, 10),
  hexagon: polygon(6, 47),
  star: star(5, 48, 24),
  heart: heart(),
  blob: polar((a) => 42 + 4 * Math.sin(3 * a + 0.6) + 3 * Math.sin(5 * a + 2.1)),
};

/** The icon's wavy ring, used for ripples and the Original mode rings. */
export const WAVY_PATH = toPath(wavyCircle(45, 8, 3));

export const SHAPE_PATHS: Record<Shape, string> = Object.fromEntries(
  (Object.keys(SHAPE_POINTS) as Shape[]).map((k) => [k, toPath(SHAPE_POINTS[k])]),
) as Record<Shape, string>;

/** Outline length in box units, for tracing the outline with a dash. */
export const SHAPE_LENGTHS: Record<Shape, number> = Object.fromEntries(
  (Object.keys(SHAPE_POINTS) as Shape[]).map((k) => [k, length(SHAPE_POINTS[k])]),
) as Record<Shape, number>;

/** How a ripple is outlined: the button's own shape, the icon's wavy ring, or a plain circle. */
export type RippleShape = "match" | "wavy" | "round";

export function ripplePath(shape: Shape, rippleShape: RippleShape): string {
  if (rippleShape === "wavy") return WAVY_PATH;
  if (rippleShape === "round") return SHAPE_PATHS.circle;
  return SHAPE_PATHS[shape];
}

export const SHAPE_VIEWBOX = `0 0 ${SIZE} ${SIZE}`;
/** Margin around the 100 box so glow copies and ripples are not clipped. */
export const GLOW_MARGIN = 30;
export const GLOW_VIEWBOX = `${-GLOW_MARGIN} ${-GLOW_MARGIN} ${SIZE + GLOW_MARGIN * 2} ${SIZE + GLOW_MARGIN * 2}`;
/** Multiply a button size by this to get the glow box size. */
export const GLOW_BOX_RATIO = (SIZE + GLOW_MARGIN * 2) / SIZE;
/** SVG transform that scales a path about the center of the 100 box. */
export function scaleAboutCenter(scale: number): string {
  return `translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})`;
}
