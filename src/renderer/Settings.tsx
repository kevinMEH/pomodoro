import { useState } from 'react';

import type { TimerSettings } from '../shared/timer';

interface SettingsProps {
  busy: boolean;
  onCancel(): void;
  onSave(settings: TimerSettings): Promise<void>;
  settings: TimerSettings;
}

const fields: { key: keyof TimerSettings; label: string }[] = [
  { key: 'focusMinutes', label: 'Focus Duration (min)' },
  { key: 'shortBreakMinutes', label: 'Short Break Duration (min)' },
  { key: 'longBreakMinutes', label: 'Long Break Duration (min)' },
  { key: 'focusSessions', label: 'Long Break Frequency' },
];

export function Settings({
  busy,
  onCancel,
  onSave,
  settings,
}: SettingsProps): React.JSX.Element {
  const [draft, setDraft] = useState<TimerSettings>({ ...settings });

  return (
    <main className="bg-app-background flex h-screen flex-col text-stone-50 select-none">
      <header className="px-8 pt-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section
        className="mt-8 flex flex-1 flex-col gap-4 px-8"
        aria-label="Timer settings"
      >
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-stone-50/80">{field.label}</span>
            <input
              aria-label={field.label}
              className="w-20 rounded-md border border-stone-50/20 bg-stone-50/10 px-3 py-2 text-right tabular-nums outline-none focus:border-stone-50/50"
              disabled={busy}
              inputMode="numeric"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) {
                  return;
                }
                setDraft((current) => ({ ...current, [field.key]: value }));
              }}
              type="text"
              value={draft[field.key]}
            />
          </div>
        ))}
      </section>

      <footer className="flex items-center justify-center gap-4 px-8 pb-10">
        <button
          className="cursor-pointer rounded-full px-5 py-2 text-sm text-stone-50/70 transition-colors outline-none hover:text-white"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="text-app-background cursor-pointer rounded-full bg-stone-50/90 px-5 py-2 text-sm font-medium transition-colors outline-none hover:bg-stone-50"
          disabled={busy}
          onClick={() => void onSave(draft)}
          type="button"
        >
          Save
        </button>
      </footer>
    </main>
  );
}
