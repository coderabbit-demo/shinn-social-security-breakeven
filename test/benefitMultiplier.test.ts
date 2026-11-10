import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { benefitMultiplier, monthsFromFullRetirementAge } from "../src/benefitMultiplier";

interface GroundTruthRow {
  ageYear: number;
  ageMonth: number;
  monthsFromFra: number;
  multiplierPct: number;
  monthlyBenefit: number;
}

const PIA = 1000;

/** Reads the ground-truth table from the TSV fixture. */
function loadGroundTruth(): GroundTruthRow[] {
  const path = fileURLToPath(new URL("./fixtures/benefit-multipliers.tsv", import.meta.url));
  const [, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  return lines.map((line) => {
    const [ageYear, ageMonth, monthsFromFra, multiplier, benefit] = line.split("\t");
    return {
      ageYear: Number(ageYear),
      ageMonth: Number(ageMonth),
      monthsFromFra: Number(monthsFromFra),
      multiplierPct: Number(multiplier.replace("%", "")),
      monthlyBenefit: Number(benefit.replace(/[$,]/g, "")),
    };
  });
}

const rows = loadGroundTruth();

describe("benefitMultiplier ground truth", () => {
  it("loads all fixture rows", () => {
    expect(rows).toHaveLength(97);
  });

  it.each(rows)(
    "age $ageYear month $ageMonth -> $multiplierPct%",
    ({ ageYear, ageMonth, monthsFromFra, multiplierPct, monthlyBenefit }) => {
      expect(monthsFromFullRetirementAge(ageYear, ageMonth)).toBe(monthsFromFra);

      const multiplier = benefitMultiplier(ageYear, ageMonth);
      // Fixture percentages are rounded to 2 decimals (e.g. 70.42%).
      expect(multiplier * 100).toBeCloseTo(multiplierPct, 2);
      expect(Math.round(multiplier * PIA)).toBe(monthlyBenefit);
    },
  );
});

describe("benefitMultiplier edge cases", () => {
  it("caps delayed credits at age 70", () => {
    expect(benefitMultiplier(71, 6)).toBe(benefitMultiplier(70, 1));
  });

  it("rejects ages before 62", () => {
    expect(() => benefitMultiplier(61, 12)).toThrow(RangeError);
  });

  it.each([0, 13])("rejects age_month %i", (month) => {
    expect(() => benefitMultiplier(65, month)).toThrow(RangeError);
  });

  it("rejects non-integer inputs", () => {
    expect(() => benefitMultiplier(65.5, 1)).toThrow(RangeError);
  });
});
