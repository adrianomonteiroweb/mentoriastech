/**
 * Gera os assets de marca da MentoriasTech a partir da logo (wordmark):
 *  - Monograma "MT" (M branco + T azul) para favicon e ícones PWA
 *  - Wordmark completo "MentoriasTech" para logo / OG / e-mail
 *
 * Rode com: node scripts/generate-brand-assets.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const NAVY_A = "#0A0E27";
const NAVY_B = "#0e1640";
const BLUE_LIGHT = "#5AA2FF";
const BLUE_DEEP = "#2563EB";

// ─── Defs compartilhados (fundo navy + glow azul + gradiente do "Tech") ───────
function defs(size) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${NAVY_A}"/>
        <stop offset="1" stop-color="${NAVY_B}"/>
      </linearGradient>
      <radialGradient id="glow" cx="${size * 0.5}" cy="${size * 0.6}" r="${size * 0.5}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${BLUE_DEEP}" stop-opacity="0.45"/>
        <stop offset="1" stop-color="${BLUE_DEEP}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="blue" x1="0" y1="0" x2="0" y2="${size}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${BLUE_LIGHT}"/>
        <stop offset="1" stop-color="${BLUE_DEEP}"/>
      </linearGradient>
    </defs>`;
}

// ─── Monograma quadrado "MT" ──────────────────────────────────────────────────
// variant: "rounded" (cantos arredondados, fora transparente) | "full" (full-bleed)
function monogramSvg(size = 512, variant = "rounded") {
  const radius = variant === "rounded" ? Math.round(size * 0.22) : 0;
  // No maskable (full) o conteúdo encolhe para caber na zona segura (~62%).
  const fontSize = variant === "full" ? size * 0.42 : size * 0.5;
  const baseline = size * 0.66;
  const bgRect =
    variant === "full"
      ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>
         <rect width="${size}" height="${size}" fill="url(#glow)"/>`
      : `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
         <rect width="${size}" height="${size}" rx="${radius}" fill="url(#glow)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${defs(size)}
  ${bgRect}
  <text x="50%" y="${baseline}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="${-fontSize * 0.04}">
    <tspan fill="#FFFFFF">M</tspan><tspan fill="url(#blue)">T</tspan>
  </text>
</svg>`;
}

// ─── Wordmark "MentoriasTech" ─────────────────────────────────────────────────
// withBg: true → fundo navy + glow (logo.png/OG); false → transparente (logo.svg)
function wordmarkSvg(w = 1280, h = 420, withBg = false) {
  const fontSize = Math.round(h * 0.4);
  const baseline = h * 0.6;
  const bg = withBg
    ? `<rect width="${w}" height="${h}" fill="url(#bg)"/>
       <rect width="${w}" height="${h}" fill="url(#glow)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${defs(w)}
  ${bg}
  <text x="50%" y="${baseline}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="${-fontSize * 0.02}">
    <tspan fill="#FFFFFF">Mentorias</tspan><tspan fill="url(#blue)">Tech</tspan>
  </text>
</svg>`;
}

function writeFile(rel, content) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
  console.log("wrote", rel);
}

async function writePng(rel, svg, size, sizeH) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(size, sizeH || size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log("wrote", rel);
}

(async () => {
  // SVGs vetoriais (favicon + genérico + apple)
  writeFile("app/icon.svg", monogramSvg(512, "rounded"));
  writeFile("app/apple-icon.svg", monogramSvg(512, "full"));
  writeFile("public/icons/icon.svg", monogramSvg(512, "rounded"));

  // Wordmark
  writeFile("public/images/logo.svg", wordmarkSvg(1280, 420, false));

  // PNGs do ícone PWA / favicon
  await writePng("public/icons/icon-192.png", monogramSvg(512, "rounded"), 192);
  await writePng("public/icons/icon-512.png", monogramSvg(512, "rounded"), 512);
  await writePng("public/icons/icon-maskable-512.png", monogramSvg(512, "full"), 512);
  await writePng("public/apple-touch-icon.png", monogramSvg(512, "full"), 180);
  await writePng("public/favicon-32.png", monogramSvg(512, "rounded"), 32);

  // PNG do wordmark (logo + OG/e-mail) sobre navy
  await writePng("public/images/logo.png", wordmarkSvg(1280, 420, true), 1280, 420);

  console.log("✓ assets de marca gerados");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
