import { ageInMonths, cumulativeBenefit, type ClaimAge } from "./breakeven";

/** Last age shown on the chart and table. */
export const MAX_CHART_AGE = 100;

/** Cumulative benefits for both options at one age, in today's dollars. */
export interface SeriesPoint {
  /** Age in whole months. */
  ageMonths: number;
  a: number;
  b: number;
}

/**
 * Cumulative benefits for options A and B at every month of age, from the
 * birthday at or before the earlier claiming age through `MAX_CHART_AGE`.
 */
export function cumulativeSeries(pia: number, a: ClaimAge, b: ClaimAge): SeriesPoint[] {
  const firstStart = Math.min(ageInMonths(a), ageInMonths(b));
  const from = Math.floor(firstStart / 12) * 12;
  const to = MAX_CHART_AGE * 12;
  const points: SeriesPoint[] = [];
  for (let m = from; m <= to; m++) {
    points.push({ ageMonths: m, a: pia * cumulativeBenefit(a, m), b: pia * cumulativeBenefit(b, m) });
  }
  return points;
}

/** Points on each birthday (whole years of age), for the year-by-year table. */
export function yearlyPoints(points: SeriesPoint[]): SeriesPoint[] {
  return points.filter((p) => p.ageMonths % 12 === 0);
}

/**
 * Evenly spaced "nice" axis ticks from 0 up to at least `max`
 * (steps of 1, 2, 2.5 or 5 times a power of ten).
 */
export function niceTicks(max: number, targetCount = 5): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / targetCount;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let i = 0; ; i++) {
    const t = i * step;
    ticks.push(t);
    if (t >= max) break;
  }
  return ticks;
}
