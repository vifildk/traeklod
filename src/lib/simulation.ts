export interface SimulationResult {
  frames: number[][];
  names: string[];
  total: number;
}

export function runSimulation(
  names: string[],
  total: number,
  numFrames = 100
): SimulationResult {
  const n = names.length;
  const counts = new Array(n).fill(0);
  const frames: number[][] = [];
  const perFrame = Math.ceil(total / numFrames);

  for (let f = 0; f < numFrames; f++) {
    const runs = Math.min(perFrame, total - f * perFrame);
    for (let i = 0; i < runs; i++) {
      counts[Math.floor(Math.random() * n)]++;
    }
    frames.push([...counts]);
  }

  return { frames, names, total };
}

export function getWinner(result: SimulationResult): string {
  const final = result.frames[result.frames.length - 1];
  const idx = final.reduce((best, v, i) => (v > final[best] ? i : best), 0);
  return result.names[idx];
}
