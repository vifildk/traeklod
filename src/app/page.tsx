'use client';

import { useState, useCallback, useEffect } from 'react';
import { runSimulation, getWinner, type SimulationResult } from '@/lib/simulation';
import { BarChartRace } from '@/components/BarChartRace';

type AppState = 'input' | 'countdown' | 'running' | 'done';

const SIM_OPTIONS = [
  { label: '1.000', value: 1_000 },
  { label: '10.000', value: 10_000 },
  { label: '100.000', value: 100_000 },
  { label: '1.000.000', value: 1_000_000 },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('input');
  const [namesInput, setNamesInput] = useState('');
  const [simCount, setSimCount] = useState(10_000);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const names = namesInput
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const canDraw = names.length >= 2;

  const handleDraw = useCallback(() => {
    if (!canDraw) return;
    // Compute simulation immediately, then start countdown
    const sim = runSimulation(names, simCount);
    setResult(sim);
    setAppState('countdown');
    setCountdown(3);
  }, [names, simCount, canDraw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setAppState('running');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleComplete = useCallback(() => {
    setAppState('done');
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setAppState('input');
  }, []);

  const winner = result && appState === 'done' ? getWinner(result) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight">Træklod</h1>
          {appState === 'input' && (
            <p className="mt-3 text-zinc-500">
              Lodtrækning med{' '}
              <span className="text-zinc-400">{simCount.toLocaleString('da-DK')}</span>{' '}
              simuleringer
            </p>
          )}
          {appState === 'running' && (
            <p className="mt-3 text-zinc-500">Simulerer&hellip;</p>
          )}
          {appState === 'done' && winner && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">
                Vinderen er
              </p>
              <p className="text-4xl font-bold text-white">{winner}</p>
            </div>
          )}
        </div>

        {/* INPUT STATE */}
        {appState === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Deltagere{' '}
                <span className="text-zinc-600 font-normal">(ét navn per linje)</span>
              </label>
              <textarea
                value={namesInput}
                onChange={(e) => setNamesInput(e.target.value)}
                placeholder={'Anders\nBirgit\nCarsten\nDorthe'}
                rows={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none font-mono text-sm leading-relaxed"
              />
              <p className="mt-1.5 text-xs text-zinc-700">
                {names.length === 0
                  ? 'Ingen deltagere endnu'
                  : `${names.length} deltager${names.length === 1 ? '' : 'e'}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Antal simuleringer
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SIM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSimCount(opt.value)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      simCount === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDraw}
              disabled={!canDraw}
              className="w-full py-4 rounded-xl font-semibold text-lg transition-all bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed text-white"
            >
              Træk lod
            </button>

            {names.length === 1 && (
              <p className="text-center text-sm text-zinc-600">
                Tilføj mindst 2 deltagere for at trække lod
              </p>
            )}
          </div>
        )}

        {/* COUNTDOWN OVERLAY */}
        {appState === 'countdown' && countdown !== null && (
          <div className="flex items-center justify-center py-24">
            <span
              key={countdown}
              className="animate-countdown text-[10rem] font-bold leading-none text-white tabular-nums"
            >
              {countdown}
            </span>
          </div>
        )}

        {/* RUNNING / DONE STATE */}
        {(appState === 'running' || appState === 'done') && result && (
          <div>
            <BarChartRace
              frames={result.frames}
              names={result.names}
              total={result.total}
              onComplete={handleComplete}
            />

            {appState === 'done' && (
              <button
                onClick={handleReset}
                className="mt-10 w-full py-3 rounded-xl font-medium text-zinc-500 border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
              >
                Prøv igen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
