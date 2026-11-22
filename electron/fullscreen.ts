// Detección de aplicaciones en pantalla completa (Windows). Electron no lo expone, así que un
// proceso de PowerShell consulta la API de Windows cada 2 s y avisa solo cuando cambia.
// Se considera pantalla completa: modo presentación / Direct3D exclusivo, o que la ventana en
// primer plano ocupe exactamente todo su monitor (una ventana maximizada no lo hace).
// Se informa del rectángulo (píxeles físicos) del monitor afectado, para que solo se oculte el
// overlay si está en ese mismo monitor (un vídeo a pantalla completa en el otro no le afecta).
import { spawn, type ChildProcess } from 'node:child_process';

const SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class JornadaFs {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cb; public RECT rcMonitor; public RECT rcWork; public int flags; }
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, int flags);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  /** "0", o "1 L T R B" con el monitor (píxeles físicos) en el que hay algo a pantalla completa. */
  public static string Check() {
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero) return "0";
    var mi = new MONITORINFO();
    mi.cb = Marshal.SizeOf(typeof(MONITORINFO));
    if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref mi)) return "0";
    var m = mi.rcMonitor;
    string mon = "1 " + m.L + " " + m.T + " " + m.R + " " + m.B;
    int st;
    if (SHQueryUserNotificationState(out st) == 0 && (st == 3 || st == 4)) return mon;
    var sb = new StringBuilder(64);
    GetClassName(h, sb, 64);
    string c = sb.ToString();
    if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd") return "0";
    RECT r;
    if (!GetWindowRect(h, out r)) return "0";
    return (r.L == m.L && r.T == m.T && r.R == m.R && r.B == m.B) ? mon : "0";
  }
}
"@
[void][JornadaFs]::SetProcessDPIAware()
$last = $null
while ($true) {
  # Si la app se cierra de golpe, este proceso no debe quedarse huérfano.
  if (-not (Get-Process -Id __PARENT__ -ErrorAction SilentlyContinue)) { exit }
  $now = [JornadaFs]::Check()
  if ($now -ne $last) { $last = $now; [Console]::Out.WriteLine($now); [Console]::Out.Flush() }
  Start-Sleep -Milliseconds 2000
}
`;

/** Monitor (píxeles físicos) con una aplicación a pantalla completa. */
export interface FullscreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Esperas entre reintentos si el proceso vigilante muere (p. ej., bloqueado por la política del equipo). */
const RETRY_MS = [5_000, 30_000, 120_000];

export class FullscreenWatcher {
  private child: ChildProcess | null = null;
  private wanted = false;
  private failures = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  /** false si no se pudo vigilar tras varios intentos (equipo con PowerShell restringido, etc.). */
  available = true;

  constructor(
    private onChange: (monitor: FullscreenRect | null) => void,
    private onAvailability: (available: boolean) => void = () => {},
  ) {}

  get running(): boolean {
    return this.child !== null;
  }

  start(): void {
    this.wanted = true;
    this.failures = 0;
    this.spawn();
  }

  private spawn(): void {
    if (this.child || !this.wanted || process.platform !== 'win32') return;
    const startedAt = Date.now();
    let child: ChildProcess;
    try {
      // -EncodedCommand (UTF-16LE en base64) evita problemas de comillas. Un comando, no un
      // archivo .ps1: no depende de la política de ejecución (no hace falta «Bypass»).
      const encoded = Buffer.from(SCRIPT.replace('__PARENT__', String(process.pid)), 'utf16le').toString('base64');
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch (e) {
      console.warn('No se pudo vigilar la pantalla completa', e);
      this.failed(startedAt);
      return;
    }
    this.child = child;
    let reported = false;
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        const v = line.trim().split(' ');
        if (v[0] === '0') this.onChange(null);
        else if (v[0] === '1' && v.length === 5) {
          const [left, top, right, bottom] = v.slice(1).map(Number);
          if ([left, top, right, bottom].every(Number.isFinite)) this.onChange({ left, top, right, bottom });
        } else continue;
        if (!reported) {
          reported = true;
          this.failures = 0;
          this.setAvailable(true);
        }
      }
    });
    const gone = () => {
      if (this.child !== child) return;
      this.child = null;
      this.onChange(null); // sin vigilante, el overlay nunca se queda oculto
      if (this.wanted) this.failed(startedAt);
    };
    child.on('error', gone);
    child.on('exit', gone);
  }

  private failed(startedAt: number): void {
    // Si llevaba un buen rato funcionando, el fallo no cuenta como fallo de arranque.
    if (Date.now() - startedAt > 10 * 60_000) this.failures = 0;
    const wait = RETRY_MS[this.failures++];
    if (wait === undefined) {
      this.setAvailable(false);
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.spawn();
    }, wait);
  }

  private setAvailable(v: boolean): void {
    if (this.available === v) return;
    this.available = v;
    this.onAvailability(v);
  }

  stop(): void {
    this.wanted = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const child = this.child;
    this.child = null;
    child?.kill();
    this.onChange(null);
  }
}
