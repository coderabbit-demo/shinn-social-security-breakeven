import "./style.css";
import { benefitMultiplier, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE } from "./benefitMultiplier";
import { ageInMonths, breakevenAge, type ClaimAge } from "./breakeven";
import { BreakevenChart, formatAgeMonths, formatDifference } from "./chart";
import { MAX_PIA, parseParams, piaValue, toSearch, type Inputs } from "./params";
import { cumulativeSeries, yearlyPoints, type SeriesPoint } from "./series";

/** Looks up an element by id, typed as `T`. */
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

/** Formats an age as "78 years 8 months". */
function formatAge(years: number, months: number): string {
  return `${years} years ${months} month${months === 1 ? "" : "s"}`;
}

/** Formats a claiming age, converting its 1-based month to months past the birthday. */
function formatClaimAge(claim: ClaimAge): string {
  return formatAge(claim.age_year, claim.age_month - 1);
}

/** Adds one option per number from `from` to `to` to a select element. */
function fillOptions(select: HTMLSelectElement, from: number, to: number, label: (n: number) => string) {
  for (let n = from; n <= to; n++) {
    select.add(new Option(label(n), String(n)));
  }
}

/**
 * Reads the current form values, using the same benefit limits as the URL parameters.
 * Returns null if the benefit field is empty or out of range.
 */
function readInputs(): Inputs | null {
  const pia = piaValue(piaInput.value, NaN);
  if (Number.isNaN(pia)) return null;
  return {
    pia,
    a:{ age_year: Number(selects.a_year.value), age_month: Number(selects.a_month.value) },
    b: { age_year: Number(selects.b_year.value), age_month: Number(selects.b_month.value) },
  };
}

/** Sets the form fields from a set of inputs. */
function writeInputs(inputs: Inputs) {
  piaInput.value = String(inputs.pia);
  selects.a_year.value = String(inputs.a.age_year);
  selects.a_month.value = String(inputs.a.age_month);
  selects.b_year.value = String(inputs.b.age_year);
  selects.b_month.value = String(inputs.b.age_month);
}

/** Writes the inputs to the URL query string so the comparison can be shared. */
function syncUrl(inputs: Inputs) {
  try {
    history.replaceState(null, "", `?${toSearch(inputs)}`);
  } catch {
    // Some browsers block URL changes on pages opened from disk; the page still works.
  }
}

/** Blanks every result on the page. */
function clearResults() {
  for (const id of ["a_age", "a_mult", "a_benefit", "b_age", "b_mult", "b_benefit"]) {
    $(id).textContent = "—";
  }
  $("breakeven_age").textContent = "—";
  $("summary").textContent = "";
  $("growth").hidden = true;
  chart.update(null);
}

const chart = new BreakevenChart($("chart"));

/** Fills the year-by-year table, adding a highlighted row at the breakeven month. */
function renderTable(points: SeriesPoint[], breakevenMonths: number | null) {
  const rows: (SeriesPoint & { breakeven?: boolean })[] = yearlyPoints(points);
  if (breakevenMonths !== null) {
    const point = points.find((p) => p.ageMonths === breakevenMonths);
    if (point) {
      const at = rows.findIndex((r) => r.ageMonths >= breakevenMonths);
      if (rows[at]?.ageMonths === breakevenMonths) rows[at] = { ...point, breakeven: true };
      else rows.splice(at === -1 ? rows.length : at, 0, { ...point, breakeven: true });
    }
  }

  const body = $("growth_rows");
  body.replaceChildren(
    ...rows.map((r) => {
      const tr = document.createElement("tr");
      if (r.breakeven) tr.className = "is-breakeven";
      const age = document.createElement("th");
      age.scope = "row";
      age.textContent = r.breakeven ? `${formatAgeMonths(r.ageMonths)} · breakeven` : String(r.ageMonths / 12);
      tr.append(age);
      for (const value of [dollars.format(r.a), dollars.format(r.b), formatDifference(r.b - r.a)]) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      return tr;
    }),
  );
}

/** Updates the chart, legend and table for the current inputs. */
function renderGrowth(inputs: Inputs, breakevenMonths: number | null) {
  const labelA = `Option A (${formatClaimAge(inputs.a)})`;
  const labelB = `Option B (${formatClaimAge(inputs.b)})`;
  $("legend_a").textContent = labelA;
  $("legend_b").textContent = labelB;
  $("legend_breakeven").hidden = breakevenMonths === null;

  const points = cumulativeSeries(inputs.pia, inputs.a, inputs.b);
  $("growth").hidden = false;
  chart.update({ points, labelA, labelB, breakevenMonths });
  renderTable(points, breakevenMonths);
}

/** Recalculates both options and the breakeven age, and updates the page and URL. */
function render() {
  const inputs = readInputs();
  piaInput.setAttribute("aria-invalid", String(inputs === null));

  if (inputs === null) {
    // Don't show results for a value the field doesn't contain, or put it in the URL.
    clearResults();
    const errorEl = $("error");
    errorEl.textContent = `Enter a monthly benefit greater than $0 and no more than ${dollars.format(MAX_PIA)}.`;
    errorEl.hidden = false;
    return;
  }

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

  let breakevenMonths: number | null = null;
  try {
    const result = breakevenAge(early, later);
    breakevenMonths = result.totalMonths;
    breakevenEl.textContent = formatAge(result.years, result.months);
    summaryEl.textContent =
      `At or after ${formatAge(result.years, result.months)}, waiting until ` +
      `${formatClaimAge(later)} pays at least as much in total as starting at ${formatClaimAge(early)}.`;
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

  renderGrowth(inputs, breakevenMonths);
}

/** Switches between the chart and table views, with arrow-key support between tabs. */
function setupTabs() {
  const tabs = [$<HTMLButtonElement>("tab_chart"), $<HTMLButtonElement>("tab_table")];
  const select = (tab: HTMLButtonElement) => {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      $(t.getAttribute("aria-controls")!).hidden = !selected;
    }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      select(next);
      next.focus();
    });
  });
}

setupTabs();

fillOptions(selects.a_year, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, String);
fillOptions(selects.b_year, EARLIEST_CLAIMING_AGE, MAX_CREDIT_AGE, String);
/** Labels a 1-based month of age, e.g. "4 (+3 mo)". */
const monthLabel = (n: number) => `${n} (+${n - 1} mo)`;
fillOptions(selects.a_month, 1, 12, monthLabel);
fillOptions(selects.b_month, 1, 12, monthLabel);

writeInputs(parseParams(location.search));
$<HTMLFormElement>("inputs").addEventListener("input", render);
render();
