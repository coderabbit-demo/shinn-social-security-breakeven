import { EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE } from "./benefitMultiplier";
import type { ClaimAge } from "./breakeven";

export interface Inputs {
  /** Monthly benefit at full retirement age, in today's dollars. */
  pia: number;
  a: ClaimAge;
  b: ClaimAge;
}

export const DEFAULT_INPUTS: Inputs = {
  pia: 1000,
  a: { age_year: 62, age_month: 1 },
  b: { age_year: 67, age_month: 1 },
};

/** Largest monthly benefit accepted from the URL or the form. */
export const MAX_PIA = 100_000;

/** Parses a whole number within `[min, max]`, or returns `fallback` if it's missing or invalid. */
function intInRange(value: string | null, min: number, max: number, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/** Parses a monthly benefit greater than 0 and at most `MAX_PIA`, or returns `fallback`. */
export function piaValue(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= MAX_PIA ? n : fallback;
}

/**
 * Reads inputs from a URL query string such as
 * `?pia=1000&a_year=62&a_month=1&b_year=67&b_month=1`.
 * Missing or invalid values fall back to the defaults.
 */
export function parseParams(search: string): Inputs {
  const p = new URLSearchParams(search);
  const d = DEFAULT_INPUTS;
  return {
    pia: piaValue(p.get("pia"), d.pia),
    a: {
      age_year: intInRange(p.get("a_year"), EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, d.a.age_year),
      age_month: intInRange(p.get("a_month"), 1, 12, d.a.age_month),
    },
    b: {
      age_year: intInRange(p.get("b_year"), EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, d.b.age_year),
      age_month: intInRange(p.get("b_month"), 1, 12, d.b.age_month),
    },
  };
}

/** Builds the query string for a set of inputs (without the leading `?`). */
export function toSearch(inputs: Inputs): string {
  return new URLSearchParams({
    pia: String(inputs.pia),
    a_year: String(inputs.a.age_year),
    a_month: String(inputs.a.age_month),
    b_year: String(inputs.b.age_year),
    b_month: String(inputs.b.age_month),
  }).toString();
}
