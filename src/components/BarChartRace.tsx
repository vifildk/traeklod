'use client';

import { useEffect, useRef, useState } from 'react';

const COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24',
  '#60a5fa', '#f87171', '#a78bfa', '#2dd4bf',
  '#fb923c', '#a3e635', '#e879f9', '#4ade80',
];

interface Bar {
  name: string;
  count: number;
  winPct: number;
  widthPct: number;
  color: string;
}

interface Props {
  frames: number[][];
  names: string[];
  total: number;
  duration?: number;
  onComplete: () => void;
}

export function BarChartRace({
  frames,
  names,
  total,
  duration = 10_000,
  onComplete,
}: Props) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [simsDone, setSimsDone] = useState(0);
  const [timeProgress, setTimeProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    startRef.current = 0;

    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);

      // Find which two frames to interpolate between
      const fi = t * (frames.length - 1);
      const lo = Math.floor(fi);
      const hi = Math.min(lo + 1, frames.length - 1);
      const mix = fi - lo;

      // Interpolate counts
      const rawCounts = frames[lo].map((c, i) => c + (frames[hi][i] - c) * mix);
      const maxCount = Math.max(...rawCounts, 1);

      const newBars: Bar[] = names.map((name, i) => ({
        name,
        count: Math.round(rawCounts[i]),
        winPct: (rawCounts[i] / total) * 100,
        widthPct: (rawCounts[i] / maxCount) * 100,
        color: COLORS[i % COLORS.length],
      }));

      newBars.sort((a, b) => b.count - a.count);

      setBars(newBars);
      setSimsDone(Math.round(t * total));
      setTimeProgress(t);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p className="text-center text-zinc-500 text-sm mb-8 tabular-nums">
        {simsDone.toLocaleString('da-DK')}
        <span className="text-zinc-700"> / {total.toLocaleString('da-DK')} simuleringer</span>
      </p>

      <div className="space-y-3">
        {bars.map((bar, rank) => (
          <div key={bar.name} className="flex items-center gap-3">
            <span className="w-5 text-right text-zinc-600 text-sm flex-shrink-0 tabular-nums">
              {rank + 1}
            </span>
            <span className="w-28 text-right text-sm truncate flex-shrink-0 text-zinc-300">
              {bar.name}
            </span>
            <div className="flex-1 h-9 bg-zinc-900 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${Math.max(bar.widthPct, bar.count > 0 ? 2 : 0)}%`,
                  backgroundColor: bar.color,
                }}
              />
            </div>
            <span className="w-16 text-right text-sm tabular-nums text-zinc-400 flex-shrink-0">
              {bar.count.toLocaleString('da-DK')}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-8 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full"
          style={{ width: `${timeProgress * 100}%` }}
        />
      </div>
    </div>
  );
}
