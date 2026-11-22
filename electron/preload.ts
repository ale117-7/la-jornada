import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../src/core/api';

const bridge: DesktopBridge = {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: (cb) => {
    ipcRenderer.on('state', (_e, s) => cb(s));
  },
  cmd: (name, ...args) => ipcRenderer.invoke('cmd', name, args),
  setHitRects: (rects) => ipcRenderer.send('overlay:hit-rects', rects),
  drag: (active) => ipcRenderer.send('overlay:drag', active),
  expand: (open) => ipcRenderer.send('overlay:expand', open),
  onPointer: (cb) => {
    ipcRenderer.on('overlay:pointer', (_e, inside) => cb(inside));
  },
};

contextBridge.exposeInMainWorld('jornada', bridge);
