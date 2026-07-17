import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

interface RadialTimerProps {
  disabled: boolean;
  durationMilliseconds: number;
  onProgressChange(progress: number): Promise<void>;
  progress: number;
  remainingMilliseconds: number;
}

function progressFromPointer(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
): number {
  const bounds = svg.getBoundingClientRect();
  const x = ((clientX - bounds.left) * 360) / bounds.width;
  const y = ((clientY - bounds.top) * 215) / bounds.height;
  const angle = Math.atan2(Math.max(0, 194 - y), x - 180);

  return Math.min(1, Math.max(0, 1 - angle / Math.PI));
}

export function RadialTimer({
  disabled,
  durationMilliseconds,
  onProgressChange,
  progress,
  remainingMilliseconds,
}: RadialTimerProps): React.JSX.Element {
  const [committing, setCommitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visualProgress, setVisualProgress] = useState(progress);
  const activePointer = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const latestDragProgress = useRef(0);
  const visualProgressRef = useRef(progress);
  const shownRemainingMilliseconds =
    dragging || committing
      ? durationMilliseconds * (1 - visualProgress)
      : remainingMilliseconds;
  const totalSeconds = Math.ceil(shownRemainingMilliseconds / 1000);
  const time = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (dragging || committing) {
      return;
    }

    const from = visualProgressRef.current;
    const startedAt = performance.now();

    if (Math.abs(progress - from) < 0.000_001) {
      showProgress(progress);
      return;
    }

    const animate = (currentTime: number): void => {
      const elapsed = Math.min(1, (currentTime - startedAt) / 700);
      const eased = 1 - (1 - elapsed) ** 3;
      const nextProgress = from + (progress - from) * eased;

      visualProgressRef.current = nextProgress;
      setVisualProgress(nextProgress);

      if (elapsed < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [committing, dragging, progress]);

  function showProgress(nextProgress: number): void {
    visualProgressRef.current = nextProgress;
    setVisualProgress(nextProgress);
  }

  function startDragging(event: ReactPointerEvent<SVGGElement>): void {
    if (disabled || committing || event.button !== 0) {
      return;
    }

    const svg = event.currentTarget.ownerSVGElement;
    if (svg === null) {
      return;
    }

    const nextProgress = progressFromPointer(event.clientX, event.clientY, svg);
    event.preventDefault();
    activePointer.current = event.pointerId;
    latestDragProgress.current = nextProgress;
    svg.setPointerCapture(event.pointerId);
    setDragging(true);
    showProgress(nextProgress);
  }

  function drag(event: ReactPointerEvent<SVGSVGElement>): void {
    if (activePointer.current !== event.pointerId) {
      return;
    }

    const nextProgress = progressFromPointer(
      event.clientX,
      event.clientY,
      event.currentTarget,
    );
    latestDragProgress.current = nextProgress;
    showProgress(nextProgress);
  }

  async function finishDragging(
    pointerId: number,
    svg: SVGSVGElement,
    nextProgress: number,
  ): Promise<void> {
    if (activePointer.current !== pointerId) {
      return;
    }

    activePointer.current = null;
    latestDragProgress.current = nextProgress;
    setDragging(false);
    setCommitting(true);
    showProgress(nextProgress);

    if (svg.hasPointerCapture(pointerId)) {
      svg.releasePointerCapture(pointerId);
    }

    try {
      await onProgressChange(nextProgress);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <section
      aria-label={`${Math.round(visualProgress * 100)} percent complete`}
      className="absolute inset-x-0 bottom-0 h-56"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-auto w-full touch-none"
        onLostPointerCapture={(event) =>
          void finishDragging(
            event.pointerId,
            event.currentTarget,
            latestDragProgress.current,
          )
        }
        onPointerCancel={(event) =>
          void finishDragging(
            event.pointerId,
            event.currentTarget,
            latestDragProgress.current,
          )
        }
        onPointerMove={drag}
        onPointerUp={(event) =>
          void finishDragging(
            event.pointerId,
            event.currentTarget,
            progressFromPointer(
              event.clientX,
              event.clientY,
              event.currentTarget,
            ),
          )
        }
        viewBox="0 0 360 215"
      >
        <path
          className="text-app-ring-outer"
          d="M 17 194 A 163 163 0 0 1 343 194"
          fill="none"
          stroke="currentColor"
          strokeLinecap="butt"
          strokeWidth="3"
        />
        <path
          className="text-app-ring"
          d="M 30 194 A 150 150 0 0 1 330 194"
          fill="none"
          pathLength="100"
          stroke="currentColor"
          strokeLinecap="butt"
          strokeWidth="18"
        />
        <path
          className="text-stone-50"
          d="M 30 194 A 150 150 0 0 1 330 194"
          fill="none"
          pathLength="100"
          stroke="currentColor"
          strokeDasharray="100"
          strokeDashoffset={100 - visualProgress * 100}
          strokeLinecap="butt"
          strokeWidth="18"
        />
        {Array.from({ length: 9 }, (_, index) => {
          const angle = Math.PI + ((index + 1) * Math.PI) / 10;
          return (
            <line
              key={index}
              className="text-app-background"
              stroke="currentColor"
              strokeLinecap="butt"
              strokeWidth="2"
              x1={180 + Math.cos(angle) * 141}
              x2={180 + Math.cos(angle) * 152}
              y1={194 + Math.sin(angle) * 141}
              y2={194 + Math.sin(angle) * 152}
            />
          );
        })}
        <g
          className="tracker-handle cursor-grab touch-none active:cursor-grabbing"
          data-dragging={dragging}
          onPointerDown={startDragging}
          style={{ offsetDistance: `${visualProgress * 100}%` }}
        >
          <rect
            fill="transparent"
            height="24"
            pointerEvents="all"
            rx="12"
            width="34"
            x="-17"
            y="-12"
          />
          <rect
            className="stroke-app-background fill-stone-50"
            height="10"
            rx="5"
            strokeWidth="2"
            width="26"
            x="-13"
            y="-5"
          />
        </g>
      </svg>

      <div className="absolute inset-x-0 bottom-9 text-center">
        <p className="font-timer text-5xl font-medium tracking-tight tabular-nums">
          {time}
        </p>
      </div>
    </section>
  );
}
