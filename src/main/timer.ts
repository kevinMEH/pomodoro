import {
  getPhaseDurationMinutes,
  TimerPhase,
  type TimerSettings,
  type TimerState,
  TimerStatus,
} from '../shared/timer';

export class Timer {
  private settings: TimerSettings;
  private state: TimerState;

  constructor(settings: TimerSettings, initialState: TimerState | null) {
    this.settings = { ...settings };
    this.state =
      initialState === null
        ? this.getIdleState(TimerPhase.Focus, 0)
        : { ...initialState };
  }

  updateSettings(settings: TimerSettings): void {
    this.settings = { ...settings };
    this.reset();
  }

  getState(now: number): TimerState {
    if (
      this.state.status === TimerStatus.Running &&
      this.state.endsAt !== null
    ) {
      return {
        ...this.state,
        remainingMilliseconds: Math.max(0, this.state.endsAt - now),
      };
    }

    return { ...this.state };
  }

  start(now: number): void {
    if (this.state.status === TimerStatus.Running) {
      return;
    }

    this.state.endsAt = now + this.state.remainingMilliseconds;
    this.state.status = TimerStatus.Running;
  }

  pause(now: number): TimerPhase | null {
    if (
      this.state.status !== TimerStatus.Running ||
      this.state.endsAt === null
    ) {
      return null;
    }

    if (now >= this.state.endsAt) {
      return this.tick(now);
    }

    this.state.remainingMilliseconds = this.state.endsAt - now;
    this.state.endsAt = null;
    this.state.status = TimerStatus.Paused;

    return null;
  }

  reset(): void {
    this.state = this.getIdleState(
      this.state.phase,
      this.state.completedFocusSessions,
    );
  }

  setProgress(progress: number, now: number): void {
    if (!Number.isFinite(progress)) {
      return;
    }

    const duration =
      getPhaseDurationMinutes(this.settings, this.state.phase) * 60 * 1000;
    const normalizedProgress = Math.min(1, Math.max(0, progress));
    this.state.remainingMilliseconds = Math.round(
      duration * (1 - normalizedProgress),
    );
    this.state.endsAt =
      this.state.status === TimerStatus.Running
        ? now + this.state.remainingMilliseconds
        : null;
  }

  skip(): void {
    this.advancePhase();
  }

  tick(now: number): TimerPhase | null {
    if (
      this.state.status !== TimerStatus.Running ||
      this.state.endsAt === null ||
      now < this.state.endsAt
    ) {
      return null;
    }

    const completedPhase = this.state.phase;
    this.advancePhase();

    return completedPhase;
  }

  private advancePhase(): void {
    if (this.state.phase === TimerPhase.LongBreak) {
      this.state = this.getIdleState(TimerPhase.Focus, 0);
      return;
    }

    if (this.state.phase === TimerPhase.ShortBreak) {
      this.state = this.getIdleState(
        TimerPhase.Focus,
        this.state.completedFocusSessions,
      );
      return;
    }

    const completedFocusSessions = this.state.completedFocusSessions + 1;
    const nextPhase =
      completedFocusSessions >= this.settings.focusSessions
        ? TimerPhase.LongBreak
        : TimerPhase.ShortBreak;

    this.state = this.getIdleState(nextPhase, completedFocusSessions);
  }

  private getIdleState(
    phase: TimerPhase,
    completedFocusSessions: number,
  ): TimerState {
    return {
      completedFocusSessions,
      endsAt: null,
      phase,
      remainingMilliseconds:
        getPhaseDurationMinutes(this.settings, phase) * 60 * 1000,
      status: TimerStatus.Idle,
    };
  }
}
