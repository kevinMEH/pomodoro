import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, TimerPhase, TimerStatus } from '../src/shared/timer';
import { Timer } from '../src/main/timer';

function completeCurrentPhase(timer: Timer, now: number): TimerPhase | null {
  timer.start(now);

  const state = timer.getState(now);
  if (state.endsAt === null) {
    throw new Error('Timer did not start.');
  }

  return timer.tick(state.endsAt);
}

describe('Timer', () => {
  it('starts with the approved focus defaults', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    expect(timer.getState(0)).toEqual({
      completedFocusSessions: 0,
      endsAt: null,
      phase: TimerPhase.Focus,
      remainingMilliseconds: 25 * 60_000,
      status: TimerStatus.Idle,
    });
  });

  it('derives remaining time from the end timestamp', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(1_000);

    expect(timer.getState(61_000).remainingMilliseconds).toBe(24 * 60_000);
  });

  it('pauses and resumes with the exact remaining time', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(1_000);
    timer.pause(61_000);

    expect(timer.getState(100_000)).toMatchObject({
      remainingMilliseconds: 24 * 60_000,
      status: TimerStatus.Paused,
    });

    timer.start(100_000);

    expect(timer.getState(160_000)).toMatchObject({
      remainingMilliseconds: 23 * 60_000,
      status: TimerStatus.Running,
    });
  });

  it('resets the current phase without resetting cycle progress', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    completeCurrentPhase(timer, 0);
    timer.start(0);
    timer.reset();

    expect(timer.getState(0)).toEqual({
      completedFocusSessions: 1,
      endsAt: null,
      phase: TimerPhase.ShortBreak,
      remainingMilliseconds: 5 * 60_000,
      status: TimerStatus.Idle,
    });
  });

  it('sets progress without changing the timer status', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(1_000);
    timer.setProgress(0.5, 61_000);

    expect(timer.getState(61_000)).toMatchObject({
      endsAt: 61_000 + 12.5 * 60_000,
      remainingMilliseconds: 12.5 * 60_000,
      status: TimerStatus.Running,
    });
  });

  it('continues counting from changed progress while running', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(0);
    timer.setProgress(0.5, 60_000);

    expect(timer.getState(120_000)).toMatchObject({
      remainingMilliseconds: 11.5 * 60_000,
      status: TimerStatus.Running,
    });
  });

  it('resets fully after progress is changed', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.setProgress(0.5, 0);
    timer.reset();

    expect(timer.getState(0)).toMatchObject({
      remainingMilliseconds: 25 * 60_000,
      status: TimerStatus.Idle,
    });
  });

  it('starts the skipped phase at full duration after progress is changed', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.setProgress(0.5, 0);
    timer.skip();

    expect(timer.getState(0)).toMatchObject({
      phase: TimerPhase.ShortBreak,
      remainingMilliseconds: 5 * 60_000,
      status: TimerStatus.Idle,
    });
  });

  it('applies the first running progress change after reset', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.setProgress(0.5, 0);
    timer.reset();
    timer.start(1_000);
    timer.setProgress(0.25, 2_000);

    expect(timer.getState(2_000)).toMatchObject({
      phase: TimerPhase.Focus,
      remainingMilliseconds: 18.75 * 60_000,
      status: TimerStatus.Running,
    });
  });

  it('applies the first running progress change after skip', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.skip();
    timer.start(1_000);
    timer.setProgress(0.25, 2_000);

    expect(timer.getState(2_000)).toMatchObject({
      phase: TimerPhase.ShortBreak,
      remainingMilliseconds: 3.75 * 60_000,
      status: TimerStatus.Running,
    });
  });

  it('selects a long break after four completed focus sessions', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    expect(completeCurrentPhase(timer, 0)).toBe(TimerPhase.Focus);
    timer.skip();
    expect(completeCurrentPhase(timer, 0)).toBe(TimerPhase.Focus);
    timer.skip();
    expect(completeCurrentPhase(timer, 0)).toBe(TimerPhase.Focus);
    timer.skip();
    expect(completeCurrentPhase(timer, 0)).toBe(TimerPhase.Focus);

    expect(timer.getState(0)).toEqual({
      completedFocusSessions: 4,
      endsAt: null,
      phase: TimerPhase.LongBreak,
      remainingMilliseconds: 15 * 60_000,
      status: TimerStatus.Idle,
    });
  });

  it('counts a skipped focus session as completed', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.skip();

    expect(timer.getState(0)).toMatchObject({
      completedFocusSessions: 1,
      phase: TimerPhase.ShortBreak,
    });
  });

  it('starts a new cycle after the long break', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    completeCurrentPhase(timer, 0);
    timer.skip();
    completeCurrentPhase(timer, 0);
    timer.skip();
    completeCurrentPhase(timer, 0);
    timer.skip();
    completeCurrentPhase(timer, 0);
    expect(completeCurrentPhase(timer, 0)).toBe(TimerPhase.LongBreak);

    expect(timer.getState(0)).toMatchObject({
      completedFocusSessions: 0,
      phase: TimerPhase.Focus,
      status: TimerStatus.Idle,
    });
  });

  it('completes instead of pausing an expired session', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(0);

    expect(timer.pause(25 * 60_000)).toBe(TimerPhase.Focus);
    expect(timer.getState(25 * 60_000)).toMatchObject({
      completedFocusSessions: 1,
      phase: TimerPhase.ShortBreak,
      status: TimerStatus.Idle,
    });
  });

  it('applies new settings by resetting the current phase duration', () => {
    const timer = new Timer(DEFAULT_SETTINGS, null);

    timer.start(0);
    timer.updateSettings({
      focusMinutes: 40,
      focusSessions: 2,
      longBreakMinutes: 20,
      shortBreakMinutes: 8,
    });

    expect(timer.getState(0)).toEqual({
      completedFocusSessions: 0,
      endsAt: null,
      phase: TimerPhase.Focus,
      remainingMilliseconds: 40 * 60_000,
      status: TimerStatus.Idle,
    });
  });
});
