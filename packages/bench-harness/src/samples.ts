/** Raw measured samples for one metric, before statistics are computed. */
export interface Samples {
  unit: string;
  runs: number[];
}

/** Metric key → samples, as returned by every browser/build measurement. */
export type SampleSet = Record<string, Samples>;

/** Per framework → metric → samples collected in each round. */
export type PooledSamples = Record<string, Record<string, { unit: string; rounds: number[][] }>>;

/** Append one round's samples for a framework into the pool. */
export function addRound(pool: PooledSamples, framework: string, set: SampleSet): void {
  const fw = (pool[framework] ??= {});
  for (const [metric, { unit, runs }] of Object.entries(set)) {
    if (runs.length === 0) continue;
    (fw[metric] ??= { unit, rounds: [] }).rounds.push(runs);
  }
}
