import type { TimerSettings, TimerState } from './timer';

export interface AppData {
  settings: TimerSettings;
  timer: TimerState;
}

export interface PomodoroApi {
  getData(): Promise<AppData>;
  onShowSettings(callback: () => void): () => void;
  onStateChange(callback: (timer: TimerState) => void): () => void;
  pause(): Promise<TimerState>;
  reset(): Promise<TimerState>;
  setProgress(progress: number): Promise<TimerState>;
  skip(): Promise<TimerState>;
  start(): Promise<TimerState>;
  updateSettings(settings: TimerSettings): Promise<AppData>;
}

declare global {
  interface Window {
    pomodoro: PomodoroApi;
  }
}
