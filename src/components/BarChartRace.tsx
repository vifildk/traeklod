'use client';

import { useEffect, useRef, useState } from 'react';

const COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24',
  '#60a5fa', '#f87171', '#a78bfa', '#2dd4bf',
  '#fb923c', '#a3e635', '#e879f9', '#4ade80',
];

const ROW_HEIGHT = 48;   // 36px bar + 12px gap
const SORT_INTERVAL = 600; // ms between re-sorts

interface Props {
  frames: number[][];
  names: string[];
  total: number;
  duration?: number;
  delayMs?: number;
  onComplete: () => void;
}

export function BarChartRace({
  frames,
  names,
  total,
  duration = 10_000,
  delayMs = 3_000,
  onComplete,
}: Props) {
  // React state — only drives sort order (updated every SORT_INTERVAL)
  const [sortedNames, setSortedNames] = useState<string[]>(names);
  const [countdown, setCountdown] = useState<number | null>(delayMs > 0 ? 3 : null);

  // DOM refs — updated every frame (60fps), no React re-render
  const barFillRefs  = useRef<Map<string, HTMLDivElement>>(new Map());
  const countRefs    = useRef<Map<string, HTMLSpanElement>>(new Map());
  const progressRef  = useRef<HTMLDivElement>(null);
  const counterRef   = useRef<HTMLSpanElement>(null);

  const rafRef       = useRef<number>(0);
  const startRef     = useRef<number>(0);
  const lastSortRef  = useRef<number>(-SORT_INTERVAL);
  const completedRef = useRef(false);
  const nameToIdx    = useRef(new Map(names.map((n, i) => [n, i])));
  const colorMap     = Object.fromEntries(names.map((n, i) => [n, COLORS[i % COLORS.length]]));

  // Precompute final-frame values for the end-zoom
  const finalFrame    = frames[frames.length - 1];
  const finalMaxCount = Math.max(...finalFrame, 1);
  const finalMinCount = Math.min(...finalFrame);
  const finalRange    = finalMaxCount - finalMinCount || 1;

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (delayMs <= 0) return;
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => setCountdown(null), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    completedRef.current = false;

    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);

      // Interpolate between adjacent frames
      const fi  = t * (frames.length - 1);
      const lo  = Math.floor(fi);
      const hi  = Math.min(lo + 1, frames.length - 1);
      const mix = fi - lo;
      const raw = frames[lo].map((c, i) => c + (frames[hi][i] - c) * mix);

      // 60fps: bar widths + count labels + counters (direct DOM, no React)
      names.forEach((name, i) => {
        const barEl = barFillRefs.current.get(name);
        if (barEl) {
          const pct = raw[i] > 0 ? Math.max((raw[i] / finalMaxCount) * 100, 2) : 0;
          barEl.style.width = `${pct}%`;
        }
        const countEl = countRefs.current.get(name);
        if (countEl) countEl.textContent = Math.round(raw[i]).toLocaleString('da-DK');
      });
      if (progressRef.current) progressRef.current.style.width = `${t * 100}%`;
      if (counterRef.current)  counterRef.current.textContent  = Math.round(t * total).toLocaleString('da-DK');

      // 600ms: re-sort (React state — triggers smooth CSS slide)
      if (elapsed - lastSortRef.current >= SORT_INTERVAL || t === 1) {
        const rounded = raw.map(Math.round);
        setSortedNames([...names].sort(
          (a, b) => rounded[nameToIdx.current.get(b)!] - rounded[nameToIdx.current.get(a)!]
        ));
        lastSortRef.current = elapsed;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;

        // End-zoom: transition bars to a relative scale so differences are visible
        // Winner → 100%, last place → 25%, rest proportional in between
        names.forEach((name, i) => {
          const el = barFillRefs.current.get(name);
          if (el) {
            el.style.transition = 'width 1000ms ease';
            const pct = 25 + ((finalFrame[i] - finalMinCount) / finalRange) * 75;
            el.style.width = `${pct}%`;
          }
        });

        onComplete();
      }
    }

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rankMap = Object.fromEntries(sortedNames.map((n, i) => [n, i]));

  return (
    <div className="relative">
      {/* Simulation counter */}
      <p className="text-center text-zinc-500 text-sm mb-6">
        <span ref={counterRef} className="tabular-nums">0</span>
        <span className="text-zinc-700"> / {total.toLocaleString('da-DK')} simuleringer</span>
      </p>

      {/* Bars — absolutely positioned rows, CSS-animated Y position */}
      <div className="relative" style={{ height: `${names.length * ROW_HEIGHT}px` }}>
        {names.map((name) => {
          const rank = rankMap[name] ?? 0;
          return (
            <div
              key={name}
              className="absolute w-full flex items-center gap-3"
              style={{
                height: `${ROW_HEIGHT - 12}px`,
                transform: `translateY(${rank * ROW_HEIGHT}px)`,
                transition: 'transform 450ms ease',
              }}
            >
              <span className="w-5 text-right text-zinc-600 text-sm flex-shrink-0 tabular-nums select-none">
                {rank + 1}
              </span>
              <span className="w-28 text-right text-sm truncate flex-shrink-0 text-zinc-300 select-none">
                {name}
              </span>
              <div className="flex-1 h-9 bg-zinc-900 rounded-lg overflow-hidden">
                <div
                  ref={(el) => {
                    if (el) barFillRefs.current.set(name, el);
                    else barFillRefs.current.delete(name);
                  }}
                  className="h-full rounded-lg"
                  style={{ width: '0%', backgroundColor: colorMap[name] }}
                />
              </div>
              <span
                ref={(el) => {
                  if (el) countRefs.current.set(name, el);
                  else countRefs.current.delete(name);
                }}
                className="w-16 text-right text-sm tabular-nums text-zinc-400 flex-shrink-0 select-none"
              >
                0
              </span>
            </div>
          );
        })}
      </div>

      {/* 3-2-1 overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 rounded-xl">
          <span
            key={countdown}
            className="animate-countdown text-[9rem] font-bold leading-none text-white tabular-nums"
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-8 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
        <div
          ref={progressRef}
          className="h-full bg-indigo-500 rounded-full"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
