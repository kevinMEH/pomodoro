import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type { PomodoroApi } from '../shared/api';
import type { TimerState } from '../shared/timer';

const api: PomodoroApi = {
  getData: () => ipcRenderer.invoke('timer:getData'),
  onShowSettings: (callback) => {
    const listener = (): void => callback();
    ipcRenderer.on('app:showSettings', listener);
    return () => ipcRenderer.removeListener('app:showSettings', listener);
  },
  onStateChange: (callback) => {
    const listener = (_event: IpcRendererEvent, timer: TimerState): void => {
      callback(timer);
    };
    ipcRenderer.on('timer:stateChanged', listener);
    return () => ipcRenderer.removeListener('timer:stateChanged', listener);
  },
  pause: () => ipcRenderer.invoke('timer:pause'),
  reset: () => ipcRenderer.invoke('timer:reset'),
  setProgress: (progress) => ipcRenderer.invoke('timer:setProgress', progress),
  skip: () => ipcRenderer.invoke('timer:skip'),
  start: () => ipcRenderer.invoke('timer:start'),
  updateSettings: (settings) =>
    ipcRenderer.invoke('timer:updateSettings', settings),
};

contextBridge.exposeInMainWorld('pomodoro', api);
