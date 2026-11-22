// Íconos placeholder de la bandeja, generados por código (▶ trabajando / ⏸ en pausa).
import { nativeImage, type NativeImage } from 'electron';

export function trayIcon(running: boolean): NativeImage {
  const n = 32;
  const buf = Buffer.alloc(n * n * 4);
  const [r, g, b] = running ? [63, 224, 230] : [255, 179, 71];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = x - 15.5;
      const dy = y - 15.5;
      const inCircle = dx * dx + dy * dy <= 15.5 * 15.5;
      const glyph = running
        ? x >= 11 && x <= 23 && Math.abs(dy) <= (23 - x) * 0.62
        : ((x >= 9 && x <= 13) || (x >= 18 && x <= 22)) && y >= 8 && y <= 23;
      const i = (y * n + x) * 4;
      if (glyph) {
        buf[i] = b; // BGRA
        buf[i + 1] = g;
        buf[i + 2] = r;
        buf[i + 3] = 255;
      } else if (inCircle) {
        buf[i] = 31;
        buf[i + 1] = 20;
        buf[i + 2] = 16;
        buf[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}
