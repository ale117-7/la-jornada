// Guardado en archivo JSON (sustituye a localStorage en escritorio).
// Escritura atómica (temporal + renombrar) y 3 copias de respaldo rotativas.
import { closeSync, copyFileSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, statSync, writeFileSync, writeSync } from 'node:fs';
import type { SaveStore } from '../src/core/save';

export class FileStore implements SaveStore {
  private lastRotation: number;

  constructor(
    private file: string,
    private backups = 3,
    /** Los respaldos rotan como mucho cada este tiempo, para que cubran un rato y no solo 90 s. */
    private rotateEveryMs = 5 * 60_000,
  ) {
    this.lastRotation = existsSync(this.bak(1)) ? statSync(this.bak(1)).mtimeMs : 0;
  }

  private bak(n: number): string {
    return `${this.file}.bak${n}`;
  }

  /** Devuelve el guardado principal o, si está dañado, el respaldo válido más reciente. */
  read(): string | null {
    const candidates = [this.file, ...Array.from({ length: this.backups }, (_, i) => this.bak(i + 1))];
    for (const f of candidates) {
      try {
        const raw = readFileSync(f, 'utf8');
        JSON.parse(raw);
        return raw;
      } catch {
        /* probar el siguiente */
      }
    }
    return null;
  }

  /** Copia aparte una partida que no se pudo cargar: save.rechazado-<fecha>.json. */
  quarantine(raw: string, reason: string): void {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = this.file.replace(/\.json$/, '') + `.rechazado-${stamp}.json`;
    try {
      writeFileSync(dest, raw);
      console.warn(`Partida no válida (${reason}); copia guardada en ${dest}`);
    } catch (e) {
      console.warn('No se pudo apartar la partida rechazada', e);
    }
  }

  write(json: string): void {
    try {
      const tmp = `${this.file}.tmp`;
      const fd = openSync(tmp, 'w');
      try {
        writeSync(fd, json);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      if (existsSync(this.file) && Date.now() - this.lastRotation >= this.rotateEveryMs) {
        for (let n = this.backups - 1; n >= 1; n--) {
          if (existsSync(this.bak(n))) renameSync(this.bak(n), this.bak(n + 1));
        }
        copyFileSync(this.file, this.bak(1));
        this.lastRotation = Date.now();
      }
      renameSync(tmp, this.file);
    } catch (e) {
      console.warn('No se pudo guardar', e);
    }
  }
}
