@AGENTS.md

# Træklod

Lodtrækning med simulering. I stedet for ét enkelt tilfældigt træk kører siden et antal simuleringer og visualiserer resultatet som et animeret bar chart race.

**Live:** deployet på Vercel via GitHub (`vifildk/traeklod`). Hvert push til `main` deployer automatisk.

## Tech stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- Ren client-side app — ingen database, ingen backend, ingen driftsomkostninger
- Hostet gratis på Vercel

## Projektstruktur

```
src/
  app/
    page.tsx          # Hoved-UI og state machine
    globals.css       # Tailwind + @keyframes animate-countdown
    layout.tsx        # Root layout (Geist font)
  components/
    BarChartRace.tsx  # Animeret bar chart race
  lib/
    simulation.ts     # Simuleringsmotor
```

## Simuleringsmotor (`src/lib/simulation.ts`)

`runSimulation(names, total, numFrames = 100)` kører `total` simuleringer fordelt over 100 keyframes. Hvert keyframe er et snapshot af kumulative vindertællinger. Returnerer `{ frames, names, total }`.

`getWinner(result)` finder det navn med flest vindertræk i den sidste frame.

Simuleringen er synkron og kører på under 200ms selv for 1.000.000 træk.

## Bar chart race (`src/components/BarChartRace.tsx`)

Props: `frames`, `names`, `total`, `duration` (default 10s), `delayMs` (default 3s), `onComplete`.

**To separate opdateringsrytmer:**
- **60fps via direkte DOM** (ingen React re-renders): stregernes bredde, tællertal pr. deltager, simuleringstæller, progress bar
- **Hvert 600ms via React state**: sorteringsrækkefølge med CSS `transition: transform 450ms ease`

**Animationsflow:**
1. Countdown overlay (3-2-1) vises oven på de statiske streger
2. Animationen starter — stregerne vokser fra 0 mod vinderens slutcount (fast x-skala)
3. Når animationen slutter: `onComplete()` kaldes, derefter kører en 1,4s zoom-animation
4. Zoom: x-aksens nulpunkt glider mod højre (`targetXMin`) via RAF med ease-in-out — alle streger vokser, vinderen rammer 100%, de andre sætter sig på relative positioner

**`targetXMin` formel:** beregnes så sidstepladsen ender på ~20% bredde:
`targetXMin = (finalMinCount - 0.20 × finalMaxCount) / 0.80`

## Hoved-UI (`src/app/page.tsx`)

State machine med tre tilstande: `input` → `running` → `done`.

- **input:** textarea (ét navn per linje), 4 knapper til simuleringsantal (1k/10k/100k/1M, default 10k), "Træk lod"-knap
- **running:** simulering beregnes synkront ved klik, `BarChartRace` renderes med 3s delay
- **done:** vinderens navn vises i headeren, "Prøv igen"-knap nulstiller til input

## Idéer til videre arbejde

- Video-download af hele animationen (MediaRecorder API)
- Del-knap med URL-encoded navneliste
- Lyd/musik under animationen
- Mulighed for vægtede lodder (én person kan have flere "lodder")
- Mobiloptimering (lang navneliste med mange deltagere)
