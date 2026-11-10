/**
 * Social Security benefit multiplier relative to the Primary Insurance Amount (PIA).
 *
 * Sources:
 * - Early retirement reduction: 20 CFR 404.410
 *   https://www.ssa.gov/OP_Home/cfr20/404/404-0410.htm
 *   5/9 of 1% per month for the first 36 months before FRA,
 *   5/12 of 1% per month for each additional month.
 * - Delayed retirement credits: 20 CFR 404.313
 *   https://www.ssa.gov/OP_Home/cfr20/404/404-0313.htm
 *   2/3 of 1% per month (8% per year) after FRA, up to age 70.
 */

/** Full retirement age, hardcoded for now (applies to those born 1960 or later). */
export const FULL_RETIREMENT_AGE = 67;

/** Earliest age benefits can start. */
export const EARLIEST_CLAIMING_AGE = 62;

/** Delayed retirement credits stop accruing at this age. */
export const MAX_CREDIT_AGE = 70;

const EARLY_FIRST_36_RATE = 5 / 9 / 100;
const EARLY_BEYOND_36_RATE = 5 / 12 / 100;
const DELAYED_RATE = 2 / 3 / 100;

/**
 * Months between the claiming age and full retirement age.
 * Negative = before FRA, positive = after FRA.
 *
 * `age_month` is 1-based: month 1 is the first month of `age_year`
 * (e.g. age_year 67, age_month 1 is exactly 67 years 0 months).
 */
export function monthsFromFullRetirementAge(age_year: number, age_month: number): number {
  return (age_year - FULL_RETIREMENT_AGE) * 12 + (age_month - 1);
}

/**
 * Returns the benefit multiplier as a fraction of PIA (1.0 = 100%).
 *
 * @param age_year  Whole years of age at claiming (62 or older).
 * @param age_month 1-based month within that age year (1–12).
 */
export function benefitMultiplier(age_year: number, age_month: number): number {
  if (!Number.isInteger(age_year) || !Number.isInteger(age_month)) {
    throw new RangeError("age_year and age_month must be integers");
  }
  if (age_month < 1 || age_month > 12) {
    throw new RangeError(`age_month must be between 1 and 12, got ${age_month}`);
  }
  if (age_year < EARLIEST_CLAIMING_AGE) {
    throw new RangeError(`Benefits cannot start before age ${EARLIEST_CLAIMING_AGE}`);
  }

  const maxDelayedMonths = (MAX_CREDIT_AGE - FULL_RETIREMENT_AGE) * 12;
  const months = Math.min(monthsFromFullRetirementAge(age_year, age_month), maxDelayedMonths);

  if (months >= 0) {
    return 1 + months * DELAYED_RATE;
  }

  const monthsEarly = -months;
  const first36 = Math.min(monthsEarly, 36);
  const beyond36 = Math.max(monthsEarly - 36, 0);
  return 1 - first36 * EARLY_FIRST_36_RATE - beyond36 * EARLY_BEYOND_36_RATE;
}
