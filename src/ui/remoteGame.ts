// Cliente del juego para las ventanas de escritorio: solo muestra el estado que llega
// por IPC y reenvía órdenes. La simulación vive en el proceso principal.
import type { Command, DesktopBridge, DesktopSettings, GameApi, ShortcutId, Snapshot } from '../core/api';
import type { Settings } from '../core/types';

export class RemoteGame implements GameApi {
  private constructor(
    private snap: Snapshot,
    private bridge: DesktopBridge,
  ) {}

  static async connect(bridge: DesktopBridge): Promise<RemoteGame> {
    const g = new RemoteGame(await bridge.getState(), bridge);
    bridge.onState((s) => g.receive(s));
    return g;
  }

  /** Lo que no llega en cada envío (Crónica sin cambios, ajustes de escritorio) se conserva. */
  private receive(s: Snapshot): void {
    if (s.chronicleOmitted) s.save.chronicle = this.snap.save.chronicle;
    s.desktop ??= this.snap.desktop;
    this.snap = s;
  }

  get day() {
    return this.snap.save.current!;
  }
  get save() {
    return this.snap.save;
  }
  get speed() {
    return this.snap.speed;
  }
  get desktop() {
    return this.snap.desktop;
  }

  step(): void {}
  persist(): void {}

  toggle = () => this.send('toggle');
  startDay = () => this.send('startDay');
  setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => this.send('setSetting', key, value);
  chooseCard = (index: number) => this.send('chooseCard', index);
  forceCrossroads = () => this.send('forceCrossroads');
  setSpeed =(speed: number) => this.send('setSpeed', speed);
  resetDay = (seed?: number) => this.send('resetDay', seed);
  jumpToHour = (hours: number) => this.send('jumpToHour', hours);
  shiftDate = (days: number | null) => this.send('shiftDate', days);
  setCutoffHour = (hour: number) => this.send('setCutoffHour', hour);
  setDesktop = <K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => this.send('setDesktop', key, value);
  setShortcut = (id: ShortcutId, accel: string) => this.send('setShortcut', id, accel);
  pauseShortcuts = (paused: boolean) => this.send('pauseShortcuts', paused);

  private send(name: Command, ...args: unknown[]): void {
    void this.bridge.cmd(name, ...args).then((s) => this.receive(s));
  }
}
