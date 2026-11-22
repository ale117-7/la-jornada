const SUFFIXES = ['', 'K', 'M', 'B', 'T'];
for (let a = 0; a < 26; a++) for (let b = 0; b < 26; b++) SUFFIXES.push(String.fromCharCode(97 + a, 97 + b));

export function formatNumber(n: number): string {
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs < 1000) return abs < 100 && n % 1 !== 0 ? n.toFixed(1) : Math.round(n).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(abs) / 3));
  const v = n / Math.pow(1000, tier);
  return (Math.abs(v) < 100 ? v.toFixed(2) : v.toFixed(1)) + SUFFIXES[tier];
}

/** "3h 42m" */
export function formatWorked(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  return `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, '0')}m`;
}

/** "3:42" (para el título de la pestaña) */
export function formatHM(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, '0')}`;
}

/** "3:42:07" */
export function formatHMS(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${formatHM(ms)}:${String(sec % 60).padStart(2, '0')}`;
}

export function pad3(n: number): string {
  return String(n).padStart(3, '0');
}
