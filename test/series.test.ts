import { describe, expect, it } from "vitest";
import { cumulativeSeries, MAX_CHART_AGE, niceTicks, yearlyPoints } from "../src/series";

const age = (age_year: number, age_month: number) => ({ age_year, age_month });

describe("cumulativeSeries", () => {
  it("runs monthly from the earlier claiming age's birthday to age 100", () => {
    const points = cumulativeSeries(1000, age(67, 1), age(62, 6));
    expect(points[0].ageMonths).toBe(62 * 12);
    expect(points.at(-1)!.ageMonths).toBe(MAX_CHART_AGE * 12);
    expect(points).toHaveLength((MAX_CHART_AGE - 62) * 12 + 1);
  });

  it("accumulates one payment per month after each claim starts", () => {
    const points = cumulativeSeries(1000, age(62, 1), age(67, 1));
    const at = (years: number) => points.find((p) => p.ageMonths === years * 12)!;
    expect(at(62)).toEqual({ ageMonths: 744, a: 0, b: 0 });
    expect(at(63).a).toBeCloseTo(700 * 12);
    expect(at(67).b).toBe(0);
    expect(at(68).b).toBeCloseTo(1000 * 12);
  });
});

describe("yearlyPoints", () => {
  it("keeps one point per birthday", () => {
    const yearly = yearlyPoints(cumulativeSeries(1000, age(62, 1), age(70, 1)));
    expect(yearly.map((p) => p.ageMonths / 12)).toEqual(
      Array.from({ length: MAX_CHART_AGE - 62 + 1 }, (_, i) => 62 + i),
    );
  });
});

describe("niceTicks", () => {
  it.each([
    [480_000, [0, 100_000, 200_000, 300_000, 400_000, 500_000]],
    [1_000, [0, 200, 400, 600, 800, 1_000]],
    [0, [0, 1]],
  ])("ticks up to %i", (max, expected) => {
    expect(niceTicks(max)).toEqual(expected);
  });

  it("always reaches the maximum", () => {
    for (const max of [1, 7, 333, 98_765, 4_560_000]) {
      expect(niceTicks(max).at(-1)!).toBeGreaterThanOrEqual(max);
    }
  });
});
