export enum TimerPhase {
  Focus = 'focus',
  LongBreak = 'longBreak',
  ShortBreak = 'shortBreak',
}

export enum TimerStatus {
  Idle = 'idle',
  Paused = 'paused',
  Running = 'running',
}

export interface TimerSettings {
  focusMinutes: number;
  focusSessions: number;
  longBreakMinutes: number;
  shortBreakMinutes: number;
}

export interface TimerState {
  completedFocusSessions: number;
  endsAt: number | null;
  phase: TimerPhase;
  remainingMilliseconds: number;
  status: TimerStatus;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  focusSessions: 4,
  longBreakMinutes: 15,
  shortBreakMinutes: 5,
};

export function getPhaseDurationMinutes(
  settings: TimerSettings,
  phase: TimerPhase,
): number {
  if (phase === TimerPhase.Focus) {
    return settings.focusMinutes;
  }

  if (phase === TimerPhase.ShortBreak) {
    return settings.shortBreakMinutes;
  }

  return settings.longBreakMinutes;
}

export function getPhaseName(phase: TimerPhase): string {
  if (phase === TimerPhase.Focus) {
    return 'Focus';
  }

  if (phase === TimerPhase.ShortBreak) {
    return 'Short Break';
  }

  return 'Long Break';
}
