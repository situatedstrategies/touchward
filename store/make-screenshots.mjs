// Turns phone screen captures into Google Play screenshots.
//
//   node store/make-screenshots.mjs --plain      the capture itself at exactly 9:16
//                                                (trim status bar and bottom strip, extend
//                                                the edge color to fill), for Play's
//                                                phone screenshot slots
//   node store/make-screenshots.mjs            captioned portrait 9:16 (1080 x 1920)
//   node store/make-screenshots.mjs --landscape  captioned landscape 16:9 (1920 x 1080)
//
// The set and its order come from store/screenshots/captions.txt, one line per
// capture as "filename | caption". Each file is looked up in
// store/screenshots/raw first, then in store/. If captions.txt is missing,
// every PNG or JPEG in raw is used in name order with the CAPTIONS below.
// Output goes to store/screenshots/play/16x9 or play/9x16 as <nn>-<name>.png.
//
// Each capture is scaled onto a navy canvas with a caption in Josefin Sans,
// the same type as the app, so the set reads as one. Needs Playwright (npm i
// -D playwright, or the global install used in Claude Code sessions) and the
// app's node_modules for the font files.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const CAPTIONS = [
  "Tap when you did the thing.",
  "Every tap, a new color.",
  "Ripples that linger.",
  "Or go full neon.",
  "Shape it your way.",
  "Reminders that fit your day.",
  "No account. No ads. One price.",
];

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error("Playwright not found. Run: npm i -D playwright");
}

const landscape = process.argv.includes("--landscape");
const plain = process.argv.includes("--plain");
const W = landscape ? 1920 : 1080;
const H = landscape ? 1080 : 1920;
const root = path.dirname(new URL(import.meta.url).pathname);
const rawDir = path.join(root, "screenshots", "raw");
const outDir = path.join(
  root,
  "screenshots",
  "play",
  plain ? "phone" : landscape ? "16x9" : "9x16",
);
fs.mkdirSync(outDir, { recursive: true });

// [{ file, source, caption }] in output order.
const captionsFile = path.join(root, "screenshots", "captions.txt");
const locate = (file) =>
  [path.join(rawDir, file), path.join(root, file)].find((p) => fs.existsSync(p));
let entries;
if (fs.existsSync(captionsFile)) {
  entries = fs
    .readFileSync(captionsFile, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [file, ...rest] = l.split("|");
      const source = locate(file.trim());
      if (!source)
        throw new Error(
          `${file.trim()} listed in captions.txt was not found in raw/ or store/`,
        );
      return { file: file.trim(), source, caption: rest.join("|").trim() };
    });
} else {
  entries = fs
    .readdirSync(rawDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort()
    .map((f, i) => ({ file: f, source: path.join(rawDir, f), caption: CAPTIONS[i] ?? "" }));
}
if (entries.length === 0) {
  console.error(`Nothing to do: no captures listed in ${captionsFile} and none in ${rawDir}.`);
  process.exit(1);
}

const fontFace = (family, weight, file) => {
  const p = path.join(root, "..", "node_modules", "@expo-google-fonts", file);
  if (!fs.existsSync(p)) return "";
  const b64 = fs.readFileSync(p).toString("base64");
  return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
};
const css =
  fontFace("Josefin Sans", 600, "josefin-sans/600SemiBold/JosefinSans_600SemiBold.ttf") +
  fontFace("Nunito Sans", 500, "nunito-sans/500Medium/NunitoSans_500Medium.ttf");

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// Plain mode. iPhone captures are about 9:19.5, taller than 9:16. Trim the
// status bar (top) and the strip under the bottom row of buttons, which
// leaves the capture a little too narrow for 9:16; make up the difference by
// extending the outermost pixel column on each side, which is invisible on the
// app's flat and vertically graded backgrounds. Height is a multiple of 16 so
// the ratio is exact, and the width follows from it.
async function plainShot(page, b64, mime, out) {
  const dataUrl = `data:${mime};base64,${b64}`;
  const png = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const TRIM_TOP = Math.round(img.height * 0.076); // status bar
    const TRIM_BOTTOM = Math.round(img.height * 0.045); // below the buttons
    let h = img.height - TRIM_TOP - TRIM_BOTTOM;
    h -= h % 16;
    const w = (h * 9) / 16;
    const pad = Math.round((w - img.width) / 2);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    // Edge columns stretched into the padding, then the capture on top.
    x.drawImage(img, 0, TRIM_TOP, 1, h, 0, 0, pad + 1, h);
    x.drawImage(img, img.width - 1, TRIM_TOP, 1, h, w - pad - 1, 0, pad + 1, h);
    x.drawImage(img, 0, TRIM_TOP, img.width, h, pad, 0, img.width, h);
    return c.toDataURL("image/png");
  }, dataUrl);
  fs.writeFileSync(out, Buffer.from(png.split(",")[1], "base64"));
}

for (const [i, { file, source, caption }] of entries.entries()) {
  const mime = /\.png$/i.test(file) ? "image/png" : "image/jpeg";
  const b64 = fs.readFileSync(source).toString("base64");
  if (plain) {
    const out = path.join(
      outDir,
      `${String(i + 1).padStart(2, "0")}-${file.replace(/\.(png|jpe?g)$/i, "")}.png`,
    );
    await plainShot(page, b64, mime, out);
    console.log(`${file} -> ${path.relative(process.cwd(), out)} (plain 9:16)`);
    continue;
  }
  // Portrait: caption above, capture below. Landscape: caption left, capture right.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
    .stage{position:relative;width:${W}px;height:${H}px;display:flex;
      flex-direction:${landscape ? "row" : "column"};align-items:center;justify-content:center;
      gap:${landscape ? 80 : 44}px;padding:${landscape ? "0 120px" : "96px 0 72px"};box-sizing:border-box;
      background:radial-gradient(${landscape ? "1200px 900px at 30% 50%" : "900px 1200px at 50% 20%"}, #0f2b7d 0%, #0a1a52 45%, #050c2c 100%);
      font-family:"Josefin Sans","Avenir Next","Nunito Sans",sans-serif;color:#eef2ff}
    .cap{font-weight:600;font-size:${landscape ? 64 : 66}px;letter-spacing:.06em;line-height:1.2;text-align:${landscape ? "left" : "center"};
      max-width:${landscape ? 640 : 960}px;padding-top:.1em;text-wrap:balance;flex:none}
    .shot{flex:none;height:${landscape ? H - 160 : H - 96 - 72 - 44 - 110}px;width:auto;border-radius:48px;
      box-shadow:0 40px 120px -30px rgba(79,176,255,.6),0 0 0 1px rgba(255,255,255,.1)}
  </style></head><body><div class="stage">
    <div class="cap">${caption.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>
    <img class="shot" src="data:${mime};base64,${b64}">
  </div></body></html>`;
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(Array.from(document.images, (im) => im.decode())));
  const out = path.join(
    outDir,
    `${String(i + 1).padStart(2, "0")}-${file.replace(/\.(png|jpe?g)$/i, "")}.png`,
  );
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`${file} -> ${path.relative(process.cwd(), out)} (${W}x${H})`);
}
await browser.close();
