/**
 * Erzeugt die PWA-Icons in public/icons/ aus einem SVG-Motiv:
 * cyan gestrichelter Einkesselungsring um eine violette Alien-Zone.
 *
 * Aufruf: node scripts/generate-icons.mjs
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const OUT = new URL('../public/icons/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/** Unregelmäßige "Befalls"-Zone als Polygon um (256,256) */
function blobPoints(radius, vertices = 12) {
  const pts = [];
  for (let i = 0; i < vertices; i++) {
    const a = (Math.PI * 2 * i) / vertices;
    const r = radius * (0.82 + 0.22 * Math.sin(i * 2.1 + 0.7));
    pts.push(`${(256 + Math.cos(a) * r).toFixed(1)},${(256 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function iconSvg({ rounded, contentScale }) {
  const rx = rounded ? 112 : 0;
  const s = contentScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="#05080f"/>
  <g transform="translate(256,256) scale(${s}) translate(-256,-256)">
    <polygon points="${blobPoints(118)}" fill="rgba(160,107,255,0.45)" stroke="#a06bff" stroke-width="8"/>
    <circle cx="256" cy="256" r="44" fill="rgba(255,59,92,0.35)"/>
    <circle cx="256" cy="256" r="24" fill="#ff3b5c"/>
    <circle cx="256" cy="256" r="182" fill="none" stroke="#37e0d8" stroke-width="20"
            stroke-dasharray="54 26" stroke-linecap="round"/>
    <circle cx="256" cy="74" r="16" fill="#37e0d8"/>
  </g>
</svg>`;
}

const standard = Buffer.from(iconSvg({ rounded: true, contentScale: 1 }));
const fullBleed = Buffer.from(iconSvg({ rounded: false, contentScale: 0.78 }));

await sharp(standard).resize(512, 512).png().toFile(`${OUT}icon-512.png`);
await sharp(standard).resize(192, 192).png().toFile(`${OUT}icon-192.png`);
await sharp(fullBleed).resize(512, 512).png().toFile(`${OUT}icon-maskable-512.png`);
await sharp(fullBleed).resize(180, 180).flatten({ background: '#05080f' }).png()
  .toFile(`${OUT}apple-touch-icon.png`);

console.log('PWA-Icons erzeugt in public/icons/');
