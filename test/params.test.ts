import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, parseParams, toSearch } from "../src/params";

describe("parseParams", () => {
  it("uses defaults for an empty query string", () => {
    expect(parseParams("")).toEqual(DEFAULT_INPUTS);
  });

  it("reads every parameter", () => {
    expect(parseParams("?pia=2500&a_year=64&a_month=3&b_year=70&b_month=1")).toEqual({
      pia: 2500,
      a: { age_year: 64, age_month: 3 },
      b: { age_year: 70, age_month: 1 },
    });
  });

  it("keeps defaults for parameters that are missing", () => {
    expect(parseParams("?a_year=65&b_year=70")).toEqual({
      pia: 1000,
      a: { age_year: 65, age_month: 1 },
      b: { age_year: 70, age_month: 1 },
    });
  });

  it.each([
    ["pia=-5", "pia", 1000],
    ["pia=abc", "pia", 1000],
    ["pia=1000000", "pia", 1000],
  ])("falls back on invalid %s", (query, key, expected) => {
    expect(parseParams(query)[key as "pia"]).toBe(expected);
  });

  it.each(["a_year=61", "a_year=71", "a_year=63.5", "a_month=0", "a_month=13", "a_month="])(
    "falls back on invalid %s",
    (query) => {
      expect(parseParams(query).a).toEqual(DEFAULT_INPUTS.a);
    },
  );
});

describe("toSearch", () => {
  it("round-trips through parseParams", () => {
    const inputs = { pia: 1850, a: { age_year: 63, age_month: 7 }, b: { age_year: 69, age_month: 2 } };
    expect(parseParams(toSearch(inputs))).toEqual(inputs);
  });
});
