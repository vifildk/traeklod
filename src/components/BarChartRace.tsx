'use client';

import { useEffect, useRef, useState } from 'react';

const COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24',
  '#60a5fa', '#f87171', '#a78bfa', '#2dd4bf',
  '#fb923c', '#a3e635', '#e879f9', '#4ade80',
];

// Each row = h-9 (36px bar) + gap-3 (12px) = 48px
const ROW_HEIGHT = 48;
// How often to re-sort and update counts (ms)
const SORT_INTERVAL = 600;

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
  // React state — updated infrequently (every SORT_INTERVAL ms)
  const [sortedNames, setSortedNames] = useState<string[]>(names);
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>(
    Object.fromEntries(names.map((n) => [n, 0]))
  );
  const [countdown, setCountdown] = useState<number | null>(delayMs > 0 ? 3 : null);

  // DOM refs — updated every frame (60fps), bypass React
  const barFillRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  // Animation bookkeeping
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const lastSortRef = useRef<number>(-SORT_INTERVAL);
  const completedRef = useRef(false);
  const nameToIdx = useRef(new Map(names.map((n, i) => [n, i])));
  const colorMap = Object.fromEntries(names.map((n, i) => [n, COLORS[i % COLORS.length]]));

  // Countdown ticks (inside this component so it can overlay the bars)
  useEffect(() => {
    if (delayMs <= 0) return;
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => setCountdown(null), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fixed scale: winner's final count = 100% width — never changes during animation
  const finalMaxCount = Math.max(...frames[frames.length - 1], 1);

  // Animation loop — starts after delayMs
  useEffect(() => {
    completedRef.current = false;

    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);

      // Interpolate between two adjacent frames
      const fi = t * (frames.length - 1);
      const lo = Math.floor(fi);
      const hi = Math.min(lo + 1, frames.length - 1);
      const mix = fi - lo;
      const rawCounts = frames[lo].map((c, i) => c + (frames[hi][i] - c) * mix);

      // ── High-frequency DOM updates (no React re-render) ──────────────────
      names.forEach((name, i) => {
        const el = barFillRefs.current.get(name);
        if (el) {
          const pct = rawCounts[i] > 0 ? Math.max((rawCounts[i] / finalMaxCount) * 100, 2) : 0;
          el.style.width = `${pct}%`;
        }
      });
      if (progressRef.current) progressRef.current.style.width = `${t * 100}%`;
      if (counterRef.current) {
        counterRef.current.textContent = Math.round(t * total).toLocaleString('da-DK');
      }

      // ── Low-frequency React update (re-sort + update counts) ─────────────
      if (elapsed - lastSortRef.current >= SORT_INTERVAL || t === 1) {
        const rounded = rawCounts.map(Math.round);
        setSortedNames(
          [...names].sort(
            (a, b) =>
              rounded[nameToIdx.current.get(b)!] - rounded[nameToIdx.current.get(a)!]
          )
        );
        setDisplayCounts(Object.fromEntries(names.map((n, i) => [n, rounded[i]])));
        lastSortRef.current = elapsed;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
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

      {/* Bar chart — rows absolutely positioned so CSS can animate their Y */}
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
              <span className="w-16 text-right text-sm tabular-nums text-zinc-400 flex-shrink-0 select-none">
                {(displayCounts[name] ?? 0).toLocaleString('da-DK')}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3-2-1 overlay — sits on top of the bars */}
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
