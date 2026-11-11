import { benefitMultiplier } from "./benefitMultiplier";

/** A claiming age, using the same 1-based month as `benefitMultiplier`. */
export interface ClaimAge {
  age_year: number;
  age_month: number;
}

export interface Breakeven {
  /** Age at breakeven, in whole months. */
  totalMonths: number;
  /** Whole years of age at breakeven. */
  years: number;
  /** Extra months beyond `years` (0–11). */
  months: number;
}

/** Converts a claiming age to months. `(62, 1)` is exactly 62 years 0 months = 744. */
export function ageInMonths({ age_year, age_month }: ClaimAge): number {
  return age_year * 12 + (age_month - 1);
}

/**
 * Total benefits received by a given age, as a multiple of the PIA,
 * claiming at `claim` and receiving one payment per month since then.
 * In today's dollars, since COLA keeps each payment constant in real terms.
 */
export function cumulativeBenefit(claim: ClaimAge, atAgeMonths: number): number {
  const elapsed = Math.max(atAgeMonths - ageInMonths(claim), 0);
  return benefitMultiplier(claim.age_year, claim.age_month) * elapsed;
}

/**
 * Age at which claiming `later` has paid out at least as much in total as
 * claiming `early`, assuming no opportunity cost and benefits that keep pace
 * with inflation.
 *
 * Solves m1 * (t - s1) = m2 * (t - s2) for t, then rounds up to the first
 * whole month in which the later claim has caught up.
 */
export function breakevenAge(early: ClaimAge, later: ClaimAge): Breakeven {
  const s1 = ageInMonths(early);
  const s2 = ageInMonths(later);
  if (s2 <= s1) {
    throw new RangeError("The later claiming age must be after the earlier one");
  }

  const m1 = benefitMultiplier(early.age_year, early.age_month);
  const m2 = benefitMultiplier(later.age_year, later.age_month);
  if (m2 <= m1) {
    throw new RangeError("Claiming later does not pay more, so there is no breakeven age");
  }

  const exact = (m2 * s2 - m1 * s1) / (m2 - m1);
  // Small tolerance so floating-point noise (e.g. 944.0000000001) doesn't push it a month later.
  const totalMonths = Math.ceil(exact - 1e-9);
  return { totalMonths, years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}
