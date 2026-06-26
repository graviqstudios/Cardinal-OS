// Renders the Play Store graphic assets (PNG) from the brand SVG sources.
// Uses the sharp bundled with @capacitor/assets. Run: node native/store/render.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("@capacitor/assets/node_modules/sharp");
const here = dirname(fileURLToPath(import.meta.url));

const jobs = [
  { src: resolve(here, "../assets/icon-only.svg"), out: resolve(here, "icon-512.png"), w: 512, h: 512 },
  { src: resolve(here, "feature-graphic.svg"), out: resolve(here, "feature-graphic.png"), w: 1024, h: 500 },
];

for (const { src, out, w, h } of jobs) {
  await sharp(readFileSync(src), { density: 384 })
    .resize(w, h)
    .png()
    .toFile(out);
  console.log("wrote", out);
}
