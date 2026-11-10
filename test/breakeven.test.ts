import { describe, expect, it } from "vitest";
import { ageInMonths, breakevenAge, cumulativeBenefit, type ClaimAge } from "../src/breakeven";

/** Shorthand for building a claiming age. */
const age = (age_year: number, age_month: number): ClaimAge => ({ age_year, age_month });

describe("ageInMonths", () => {
  it("treats month 1 as the start of the age year", () => {
    expect(ageInMonths(age(62, 1))).toBe(744);
    expect(ageInMonths(age(62, 12))).toBe(755);
  });
});

describe("breakevenAge", () => {
  it.each([
    [age(62, 1), age(67, 1), 944, 78, 8],
    [age(67, 1), age(70, 1), 990, 82, 6],
    // (1.24 * 840 - 0.70 * 744) / 0.54 = 964.4 -> first whole month is 965
    [age(62, 1), age(70, 1), 965, 80, 5],
  ])("%o vs %o -> %i months (%i years %i months)", (early, later, totalMonths, years, months) => {
    expect(breakevenAge(early, later)).toEqual({ totalMonths, years, months });
  });

  it.each([
    [age(62, 1), age(67, 1)],
    [age(62, 6), age(66, 3)],
    [age(64, 1), age(69, 7)],
    [age(67, 1), age(70, 1)],
  ])("%o vs %o: later claim has caught up exactly at the breakeven month", (early, later) => {
    const { totalMonths } = breakevenAge(early, later);
    expect(cumulativeBenefit(later, totalMonths)).toBeGreaterThanOrEqual(
      cumulativeBenefit(early, totalMonths) - 1e-9,
    );
    expect(cumulativeBenefit(later, totalMonths - 1)).toBeLessThan(
      cumulativeBenefit(early, totalMonths - 1),
    );
  });

  it("rejects the same claiming age", () => {
    expect(() => breakevenAge(age(65, 1), age(65, 1))).toThrow(RangeError);
  });

  it("rejects reversed claiming ages", () => {
    expect(() => breakevenAge(age(67, 1), age(62, 1))).toThrow(RangeError);
  });

  it("rejects ages past 70 where waiting no longer pays more", () => {
    expect(() => breakevenAge(age(70, 1), age(70, 6))).toThrow(RangeError);
  });
});
