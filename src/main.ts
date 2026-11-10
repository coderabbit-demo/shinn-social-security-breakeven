import "./style.css";
import { benefitMultiplier, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE } from "./benefitMultiplier";
import { ageInMonths, breakevenAge, type ClaimAge } from "./breakeven";
import { DEFAULT_INPUTS, parseParams, toSearch, type Inputs } from "./params";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const piaInput = $<HTMLInputElement>("pia");
const selects = {
  a_year: $<HTMLSelectElement>("a_year"),
  a_month: $<HTMLSelectElement>("a_month"),
  b_year: $<HTMLSelectElement>("b_year"),
  b_month: $<HTMLSelectElement>("b_month"),
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatAge(years: number, months: number): string {
  return `${years} years ${months} month${months === 1 ? "" : "s"}`;
}

function formatClaimAge(claim: ClaimAge): string {
  return formatAge(claim.age_year, claim.age_month - 1);
}

function fillOptions(select: HTMLSelectElement, from: number, to: number, label: (n: number) => string) {
  for (let n = from; n <= to; n++) {
    select.add(new Option(label(n), String(n)));
  }
}

function readInputs(): Inputs {
  const pia = Number(piaInput.value);
  return {
    pia: Number.isFinite(pia) && pia > 0 ? pia : DEFAULT_INPUTS.pia,
    a: { age_year: Number(selects.a_year.value), age_month: Number(selects.a_month.value) },
    b: { age_year: Number(selects.b_year.value), age_month: Number(selects.b_month.value) },
  };
}

function writeInputs(inputs: Inputs) {
  piaInput.value = String(inputs.pia);
  selects.a_year.value = String(inputs.a.age_year);
  selects.a_month.value = String(inputs.a.age_month);
  selects.b_year.value = String(inputs.b.age_year);
  selects.b_month.value = String(inputs.b.age_month);
}

function syncUrl(inputs: Inputs) {
  try {
    history.replaceState(null, "", `?${toSearch(inputs)}`);
  } catch {
    // Some browsers block URL changes on pages opened from disk; the page still works.
  }
}

function render() {
  const inputs = readInputs();
  syncUrl(inputs);

  for (const [key, claim] of [["a", inputs.a], ["b", inputs.b]] as const) {
    const multiplier = benefitMultiplier(claim.age_year, claim.age_month);
    $(`${key}_age`).textContent = formatClaimAge(claim);
    $(`${key}_mult`).textContent = `${(multiplier * 100).toFixed(2)}%`;
    $(`${key}_benefit`).textContent = dollars.format(multiplier * inputs.pia);
  }

  const [early, later] =
    ageInMonths(inputs.a) <= ageInMonths(inputs.b) ? [inputs.a, inputs.b] : [inputs.b, inputs.a];

  const breakevenEl = $("breakeven_age");
  const summaryEl = $("summary");
  const errorEl = $("error");

  try {
    const result = breakevenAge(early, later);
    breakevenEl.textContent = formatAge(result.years, result.months);
    summaryEl.textContent =
      `If you live past ${formatAge(result.years, result.months)}, waiting until ` +
      `${formatClaimAge(later)} pays more in total. Otherwise, starting at ${formatClaimAge(early)} does.`;
    errorEl.hidden = true;
  } catch (err) {
    breakevenEl.textContent = "—";
    summaryEl.textContent = "";
    errorEl.textContent =
      ageInMonths(early) === ageInMonths(later)
        ? "Pick two different ages to compare."
        : err instanceof Error
          ? err.message
          : String(err);
    errorEl.hidden = false;
  }
}

fillOptions(selects.a_year, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, String);
fillOptions(selects.b_year, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, String);
const monthLabel = (n: number) => `${n} (+${n - 1} mo)`;
fillOptions(selects.a_month, 1, 12, monthLabel);
fillOptions(selects.b_month, 1, 12, monthLabel);

writeInputs(parseParams(location.search));
$<HTMLFormElement>("inputs").addEventListener("input", render);
render();
