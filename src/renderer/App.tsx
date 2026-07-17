import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

import type { AppData } from '../shared/api';
import {
  getPhaseDurationMinutes,
  getPhaseName,
  TimerPhase,
  TimerStatus,
  type TimerSettings,
  type TimerState,
} from '../shared/timer';
import { RadialTimer } from './RadialTimer';
import { Settings } from './Settings';

function nextPhase(data: AppData): TimerPhase {
  if (
    data.timer.phase === TimerPhase.ShortBreak ||
    data.timer.phase === TimerPhase.LongBreak
  ) {
    return TimerPhase.Focus;
  }

  return data.timer.completedFocusSessions + 1 >= data.settings.focusSessions
    ? TimerPhase.LongBreak
    : TimerPhase.ShortBreak;
}

export function App(): React.JSX.Element {
  const [data, setData] = useState<AppData | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let active = true;
    const stopListening = window.pomodoro.onStateChange((timer) => {
      if (active) {
        setData((current) => (current === null ? null : { ...current, timer }));
        setNow(Date.now());
      }
    });
    const stopSettings = window.pomodoro.onShowSettings(() => {
      if (active) setShowSettings(true);
    });

    void window.pomodoro.getData().then((loadedData) => {
      if (!active) return;
      setData(loadedData);
      setNow(Date.now());
    });

    const clock = window.setInterval(() => setNow(Date.now()), 500);
    const updateNow = (): void => setNow(Date.now());
    document.addEventListener('visibilitychange', updateNow);

    return () => {
      active = false;
      stopListening();
      stopSettings();
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', updateNow);
    };
  }, []);

  async function apply(command: () => Promise<TimerState>): Promise<void> {
    setBusy(true);

    try {
      const timer = await command();
      setData((current) => (current === null ? null : { ...current, timer }));
      setNow(Date.now());
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(settings: TimerSettings): Promise<void> {
    setBusy(true);
    try {
      setData(await window.pomodoro.updateSettings(settings));
      setNow(Date.now());
      setShowSettings(false);
    } finally {
      setBusy(false);
    }
  }

  if (data === null) {
    return (
      <main className="bg-app-background flex h-screen items-center justify-center text-stone-50">
        <span className="font-timer text-4xl tabular-nums">--:--</span>
      </main>
    );
  }

  if (showSettings) {
    return (
      <Settings
        busy={busy}
        onCancel={() => setShowSettings(false)}
        onSave={saveSettings}
        settings={data.settings}
      />
    );
  }

  const durationMinutes = getPhaseDurationMinutes(
    data.settings,
    data.timer.phase,
  );
  const currentRemainingMilliseconds =
    data.timer.status === TimerStatus.Running && data.timer.endsAt !== null
      ? Math.max(0, data.timer.endsAt - now)
      : data.timer.remainingMilliseconds;
  const progress = Math.min(
    1,
    Math.max(
      0,
      1 - currentRemainingMilliseconds / (durationMinutes * 60 * 1000),
    ),
  );
  const isRunning = data.timer.status === TimerStatus.Running;

  return (
    <main className="bg-app-background relative h-screen overflow-hidden text-stone-50 select-none">
      <header className="px-8 pt-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {getPhaseName(data.timer.phase)}
        </h1>
        <p className="mt-1 text-sm text-stone-50/60">
          Next:{' '}
          <span className="text-stone-50/80">
            {getPhaseName(nextPhase(data))}
          </span>
        </p>
      </header>

      <section
        className="mt-8 flex items-center justify-center gap-7"
        aria-label="Timer controls"
      >
        <button
          aria-label="Reset timer"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full text-stone-50/70 transition-colors outline-none hover:text-white"
          disabled={busy}
          onClick={() => void apply(window.pomodoro.reset)}
          title="Reset"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>

        <button
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          className="text-app-background flex size-16 cursor-pointer items-center justify-center rounded-full bg-stone-50/90 transition-colors outline-none hover:bg-stone-50"
          disabled={busy}
          onClick={() =>
            void apply(
              isRunning ? window.pomodoro.pause : window.pomodoro.start,
            )
          }
          title={isRunning ? 'Pause' : 'Start'}
          type="button"
        >
          {isRunning ? (
            <Pause
              aria-hidden="true"
              className="size-7"
              fill="currentColor"
              strokeWidth={2}
            />
          ) : (
            <Play
              aria-hidden="true"
              className="ml-1 size-7"
              fill="currentColor"
              strokeWidth={2}
            />
          )}
        </button>

        <button
          aria-label="Skip to next session"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full text-stone-50/70 transition-colors outline-none hover:text-white"
          disabled={busy}
          onClick={() => void apply(window.pomodoro.skip)}
          title="Skip"
          type="button"
        >
          <SkipForward aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
      </section>

      <RadialTimer
        disabled={busy}
        durationMilliseconds={durationMinutes * 60 * 1000}
        onProgressChange={(progress) =>
          apply(() => window.pomodoro.setProgress(progress))
        }
        progress={progress}
        remainingMilliseconds={currentRemainingMilliseconds}
      />
    </main>
  );
}
