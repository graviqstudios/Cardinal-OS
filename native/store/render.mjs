// Renders the Play Store graphic assets (PNG) from the brand SVG sources.
// Text is converted to vector paths using the real brand fonts (Instrument
// Serif / Instrument Sans) so it renders exactly, regardless of the rasterizer.
// Run: node native/store/render.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("@capacitor/assets/node_modules/sharp");
const opentype = require("opentype.js");
const here = dirname(fileURLToPath(import.meta.url));

function loadFont(p) {
  const b = readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const serif = loadFont(resolve(here, "fonts/InstrumentSerif-Regular.ttf"));
const sans = loadFont(resolve(here, "fonts/InstrumentSans.ttf"));

// Compose a path glyph-by-glyph (plain cmap + kerning) to avoid opentype's
// feature shaper, which throws on these fonts' ccmp lookups.
function textToPath(font, text, x, y, size) {
  const scale = size / font.unitsPerEm;
  const path = new opentype.Path();
  let penX = x;
  let prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch); // plain cmap lookup, no feature shaper
    if (prev) penX += font.getKerningValue(prev, g) * scale;
    path.extend(g.getPath(penX, y, size));
    penX += (g.advanceWidth || 0) * scale;
    prev = g;
  }
  return path;
}

// ── Feature graphic (1024×500) ───────────────────────────────────────────────
const W = 1024;
const H = 500;
const title = "Cardinal OS";
const tagline = "One compass for everything.";
const titleSize = 92;
const tagSize = 30;
const baselineGap = 60; // title baseline → tagline baseline

// Measure at origin to size and center the composition.
const t0 = textToPath(serif, title, 0, 0, titleSize).getBoundingBox();
const g0 = textToPath(sans, tagline, 0, 0, tagSize).getBoundingBox();
const textW = Math.max(t0.x2 - t0.x1, g0.x2 - g0.x1);

// Vertical extents relative to the title baseline (y = 0).
const blockTop = t0.y1; // title cap top (negative)
const blockBottom = baselineGap + g0.y2; // tagline descent bottom
const blockH = blockBottom - blockTop;
const blockCenterRel = (blockTop + blockBottom) / 2;

// Needle sized to the text block and vertically centered with it.
const needleH = blockH * 1.22;
const s = needleH / 80; // needle spans 80 units (y 6..86)
const needleW = 22 * s; // needle spans x 39..61
const gap = 54;

const total = needleW + gap + textW;
const startX = (W - total) / 2;
const needleCx = startX + needleW / 2;
const textX = startX + needleW + gap;

const titleBaselineY = H / 2 - blockCenterRel; // block centered on canvas
const tagBaselineY = titleBaselineY + baselineGap;
const needleCy = H / 2;

const ntx = needleCx - 50 * s;
const nty = needleCy - 46 * s; // needle path center is (50, 46)

const titlePath = textToPath(serif, title, textX, titleBaselineY, titleSize).toPathData(2);
const tagPath = textToPath(sans, tagline, textX, tagBaselineY, tagSize).toPathData(2);

const featureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F7F1E6"/>
      <stop offset="1" stop-color="#EFE5D3"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g transform="translate(${ntx.toFixed(2)},${nty.toFixed(2)}) scale(${s.toFixed(4)})">
    <path d="M50 6 L61 53 L39 53 Z" fill="#CB4B33"/>
    <path d="M50 86 L61 53 L39 53 Z" fill="#C9BBA3"/>
  </g>
  <path d="${titlePath}" fill="#2A2521"/>
  <path d="${tagPath}" fill="#6B625A"/>
</svg>`;

// ── Render jobs ──────────────────────────────────────────────────────────────
const iconSvg = readFileSync(resolve(here, "../assets/icon-only.svg"));

await sharp(Buffer.from(featureSvg)).png().toFile(resolve(here, "feature-graphic.png"));
await sharp(iconSvg, { density: 384 }).resize(512, 512).png().toFile(resolve(here, "icon-512.png"));
console.log("wrote feature-graphic.png + icon-512.png");
