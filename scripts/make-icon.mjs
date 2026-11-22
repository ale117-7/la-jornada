// Genera build/icon.png (256×256), el icono del .exe y del instalador: la Grieta vista desde
// arriba, con el Descensor bajando por ella. Placeholder hasta el arte final.
//   node scripts/make-icon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const N = 256;
const SS = 4; // supermuestreo para suavizar los bordes

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const BG_TOP = hex('#141a29');
const BG_BOTTOM = hex('#05060c');
const CYAN = hex('#3fe0e6');
const AMBER = hex('#ffb347');
const VOID_TOP = hex('#0c2a30');
const VOID_BOTTOM = hex('#000000');

/** Bordes de la Grieta a la altura y (0–1): se estrecha hacia abajo, con quiebros. */
function crack(y) {
  const zig = [0, 0.06, -0.04, 0.05, -0.03, 0.02];
  const k = Math.min(zig.length - 2, Math.floor(y * (zig.length - 1)));
  const t = y * (zig.length - 1) - k;
  const off = zig[k] + (zig[k + 1] - zig[k]) * t;
  const half = 0.2 * (1 - y) ** 1.25 + 0.012;
  const c = 0.5 + off * 0.6;
  return [c - half, c + half];
}

function sample(x, y) {
  // Cuadrado redondeado.
  const r = 0.19;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;
  let col = mix(BG_TOP, BG_BOTTOM, y);
  // Cornisas horizontales tenues (las paredes del abismo).
  if (Math.abs(((y * 7) % 1) - 0.5) < 0.012 && y > 0.12 && y < 0.92) col = mix(col, CYAN, 0.12);
  // La Grieta: vacío con borde luminoso.
  const yy = (y - 0.1) / 0.84;
  if (yy >= 0 && yy <= 1) {
    const [a, b] = crack(yy);
    const rim = 0.014;
    if (x > a - rim && x < b + rim) {
      const inside = x > a && x < b;
      col = inside ? mix(VOID_TOP, VOID_BOTTOM, yy ** 0.7) : mix(CYAN, BG_BOTTOM, yy * 0.55);
      // Resplandor del borde hacia dentro.
      if (inside) {
        const d = Math.min(x - a, b - x);
        col = mix(col, CYAN, Math.max(0, 0.35 - d * 9) * (1 - yy * 0.6));
      }
    }
  }
  // El Descensor: un punto ámbar con halo, cayendo por la Grieta.
  const [a, b] = crack(0.52);
  const dx = x - (a + b) / 2;
  const dy = y - (0.1 + 0.52 * 0.84);
  const d2 = dx * dx + dy * dy;
  if (d2 < 0.034 ** 2) col = AMBER;
  else if (d2 < 0.075 ** 2) col = mix(col, AMBER, 0.25 * (1 - Math.sqrt(d2) / 0.075));
  // Estela vertical sobre el Descensor.
  if (Math.abs(dx) < 0.006 && dy < 0 && dy > -0.16) col = mix(col, AMBER, 0.55 * (1 + dy / 0.16));
  return col;
}

const px = Buffer.alloc(N * N * 4);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sample((i + (sx + 0.5) / SS) / N, (j + (sy + 0.5) / SS) / N);
        if (!c) continue;
        r += c[0]; g += c[1]; b += c[2]; a++;
      }
    }
    const o = (j * N + i) * 4;
    if (a) {
      px[o] = Math.round(r / a);
      px[o + 1] = Math.round(g / a);
      px[o + 2] = Math.round(b / a);
      px[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
}

// ----- codificador PNG mínimo (RGBA, sin filtros) -----
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bits por canal
ihdr[9] = 6; // RGBA
const raw = Buffer.alloc(N * (N * 4 + 1));
for (let j = 0; j < N; j++) px.copy(raw, j * (N * 4 + 1) + 1, j * N * 4, (j + 1) * N * 4);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../build/icon.png', import.meta.url), png);
console.log(`build/icon.png (${N}×${N}, ${(png.length / 1024).toFixed(1)} KB)`);
