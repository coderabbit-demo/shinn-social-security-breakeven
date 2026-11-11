import { niceTicks, type SeriesPoint } from "./series";

export interface ChartData {
  points: SeriesPoint[];
  /** Labels shown in the legend, direct labels and tooltip, e.g. "Option A (62 years 0 months)". */
  labelA: string;
  labelB: string;
  /** Breakeven age in whole months, or null when there is none. */
  breakevenMonths: number | null;
}

const SVG_NS = "http://www.w3.org/2000/svg";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const signedDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});
const compactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats a number of months of age as "78 years 8 months". */
export function formatAgeMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} years ${months} month${months === 1 ? "" : "s"}`;
}

/** Formats B − A, rounding first so tiny float noise reads as $0. */
export function formatDifference(diff: number): string {
  return signedDollars.format(Math.round(diff)).replace("-", "−");
}

/** Creates an SVG element with attributes. */
function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

/**
 * Line chart of cumulative benefits for both options, with a dotted breakeven
 * line and a crosshair tooltip that follows the pointer or arrow keys.
 */
export class BreakevenChart {
  private data: ChartData | null = null;
  private svg: SVGSVGElement;
  private tooltip: HTMLDivElement;
  /** Index into `data.points` currently shown in the tooltip, or null when hidden. */
  private activeIndex: number | null = null;
  /** Hover layer elements and scales from the last draw. */
  private hover: {
    line: SVGLineElement;
    dotA: SVGCircleElement;
    dotB: SVGCircleElement;
    x: (m: number) => number;
    y: (v: number) => number;
    top: number;
    bottom: number;
  } | null = null;

  constructor(private container: HTMLElement) {
    this.svg = svgEl("svg", { class: "chart-svg", role: "img", tabindex: 0 });
    this.tooltip = document.createElement("div");
    this.tooltip.className = "chart-tooltip";
    this.tooltip.hidden = true;
    container.append(this.svg, this.tooltip);

    this.svg.addEventListener("pointermove", (e) => this.onPointer(e));
    this.svg.addEventListener("pointerdown", (e) => this.onPointer(e));
    this.svg.addEventListener("pointerleave", () => {
      if (document.activeElement !== this.svg) this.showIndex(null);
    });
    this.svg.addEventListener("keydown", (e) => this.onKey(e));
    this.svg.addEventListener("focus", () => this.showIndex(this.activeIndex ?? this.defaultIndex()));
    this.svg.addEventListener("blur", () => this.showIndex(null));

    // Redraw at the new size; the chart is drawn in real pixels so text stays readable.
    new ResizeObserver(() => this.draw()).observe(container);
  }

  /** Replaces the data and redraws. Pass null to clear the chart. */
  update(data: ChartData | null) {
    this.data = data;
    this.activeIndex = null;
    this.draw();
  }

  /** Index of the breakeven month, or the first point, for keyboard focus. */
  private defaultIndex(): number {
    if (!this.data) return 0;
    const { points, breakevenMonths } = this.data;
    if (breakevenMonths === null) return 0;
    return Math.max(0, Math.min(points.length - 1, breakevenMonths - points[0].ageMonths));
  }

  private draw() {
    const svg = this.svg;
    svg.replaceChildren();
    this.tooltip.hidden = true;
    this.hover = null;
    const data = this.data;
    if (!data || data.points.length < 2) return;

    const width = Math.max(this.container.clientWidth, 280);
    const narrow = width < 480;
    const height = Math.round(Math.min(Math.max(width * 0.55, 260), 380));
    const margin = { top: 28, right: narrow ? 64 : 84, bottom: 50, left: narrow ? 48 : 60 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));

    const { points } = data;
    const x0 = points[0].ageMonths;
    const x1 = points.at(-1)!.ageMonths;
    const last = points.at(-1)!;
    const yTicks = niceTicks(Math.max(last.a, last.b), narrow ? 4 : 5);
    const yMax = yTicks.at(-1)!;
    const x = (m: number) => margin.left + ((m - x0) / (x1 - x0)) * plotW;
    const y = (v: number) => margin.top + plotH - (v / yMax) * plotH;
    const bottom = margin.top + plotH;

    svg.setAttribute(
      "aria-label",
      `Cumulative benefits from age ${Math.floor(x0 / 12)} to ${Math.floor(x1 / 12)}. ` +
        `At age ${Math.floor(x1 / 12)}: ${data.labelA} ${dollars.format(last.a)}, ` +
        `${data.labelB} ${dollars.format(last.b)}.` +
        (data.breakevenMonths === null ? "" : ` Breakeven at ${formatAgeMonths(data.breakevenMonths)}.`) +
        " Use the arrow keys to read values; the Table tab lists every year.",
    );

    // Grid and y axis
    const grid = svgEl("g", { class: "chart-grid" }, svg);
    for (const t of yTicks) {
      svgEl("line", { x1: margin.left, x2: margin.left + plotW, y1: y(t), y2: y(t) }, grid);
      const label = svgEl("text", { x: margin.left - 8, y: y(t), "text-anchor": "end", "dominant-baseline": "middle" }, grid);
      label.textContent = compactDollars.format(t);
    }

    // X axis
    const axis = svgEl("g", { class: "chart-axis" }, svg);
    svgEl("line", { x1: margin.left, x2: margin.left + plotW, y1: bottom, y2: bottom }, axis);
    const yearStep = narrow ? 10 : 5;
    for (let year = Math.ceil(x0 / 12); year * 12 <= x1; year++) {
      if (year % yearStep !== 0 && year * 12 !== x0) continue;
      const label = svgEl("text", { x: x(year * 12), y: bottom + 20, "text-anchor": "middle" }, axis);
      label.textContent = String(year);
    }
    const axisTitle = svgEl("text", { x: margin.left + plotW / 2, y: bottom + 40, "text-anchor": "middle" }, axis);
    axisTitle.textContent = "Age";

    // Breakeven line, drawn under the series
    if (data.breakevenMonths !== null && data.breakevenMonths >= x0 && data.breakevenMonths <= x1) {
      const bx = x(data.breakevenMonths);
      const g = svgEl("g", { class: "chart-breakeven" }, svg);
      svgEl("line", { x1: bx, x2: bx, y1: margin.top - 6, y2: bottom }, g);
      const label = svgEl("text", { x: bx, y: margin.top - 12, "text-anchor": bx > width / 2 ? "end" : "start", dx: bx > width / 2 ? -4 : 4 }, g);
      label.textContent = `Breakeven ${formatAgeMonths(data.breakevenMonths)}`;
    }

    // Series lines
    const path = (key: "a" | "b") =>
      points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.ageMonths).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
    svgEl("path", { d: path("a"), class: "chart-line series-a" }, svg);
    svgEl("path", { d: path("b"), class: "chart-line series-b" }, svg);

    // Direct labels at the right end, nudged apart if they would overlap
    let ya = y(last.a);
    let yb = y(last.b);
    const gap = 16;
    if (Math.abs(ya - yb) < gap) {
      const mid = (ya + yb) / 2;
      const [lo, hi] = ya <= yb ? [mid - gap / 2, mid + gap / 2] : [mid + gap / 2, mid - gap / 2];
      ya = lo;
      yb = hi;
    }
    for (const [cls, yy, text] of [["series-a", ya, "Option A"], ["series-b", yb, "Option B"]] as const) {
      const label = svgEl("text", { x: margin.left + plotW + 8, y: yy, "dominant-baseline": "middle", class: `chart-direct ${cls}` }, svg);
      label.textContent = text;
    }

    // Hover layer
    const hoverG = svgEl("g", { class: "chart-hover", visibility: "hidden" }, svg);
    const line = svgEl("line", { y1: margin.top, y2: bottom }, hoverG);
    const dotA = svgEl("circle", { r: 4, class: "series-a" }, hoverG);
    const dotB = svgEl("circle", { r: 4, class: "series-b" }, hoverG);
    this.hover = { line, dotA, dotB, x, y, top: margin.top, bottom };
  }

  private onPointer(e: PointerEvent) {
    if (!this.data || !this.hover) return;
    const rect = this.svg.getBoundingClientRect();
    const { points } = this.data;
    const x0 = points[0].ageMonths;
    const x1 = points.at(-1)!.ageMonths;
    const px = e.clientX - rect.left;
    const left = this.hover.x(x0);
    const right = this.hover.x(x1);
    const ratio = Math.min(Math.max((px - left) / (right - left), 0), 1);
    this.showIndex(Math.round(ratio * (points.length - 1)));
  }

  private onKey(e: KeyboardEvent) {
    if (!this.data) return;
    const n = this.data.points.length;
    const i = this.activeIndex ?? this.defaultIndex();
    const next: Record<string, number> = {
      ArrowLeft: i - 1,
      ArrowRight: i + 1,
      ArrowDown: i - 12,
      ArrowUp: i + 12,
      PageDown: i - 12,
      PageUp: i + 12,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    this.showIndex(Math.min(Math.max(next[e.key], 0), n - 1));
  }

  /** Moves the crosshair and tooltip to a point, or hides them. */
  private showIndex(index: number | null) {
    this.activeIndex = index;
    const hover = this.hover;
    if (!this.data || !hover) return;
    const group = hover.line.parentElement as unknown as SVGGElement;
    if (index === null) {
      group.setAttribute("visibility", "hidden");
      this.tooltip.hidden = true;
      return;
    }

    const p = this.data.points[index];
    const px = hover.x(p.ageMonths);
    group.setAttribute("visibility", "visible");
    hover.line.setAttribute("x1", String(px));
    hover.line.setAttribute("x2", String(px));
    hover.dotA.setAttribute("cx", String(px));
    hover.dotA.setAttribute("cy", String(hover.y(p.a)));
    hover.dotB.setAttribute("cx", String(px));
    hover.dotB.setAttribute("cy", String(hover.y(p.b)));

    this.fillTooltip(p);
    const tip = this.tooltip;
    tip.hidden = false;
    const width = this.container.clientWidth;
    const tipW = tip.offsetWidth;
    // Sit to the right of the crosshair, or flip to the left near the right edge.
    const leftPos = px + 12 + tipW <= width ? px + 12 : Math.max(0, px - 12 - tipW);
    tip.style.left = `${leftPos}px`;
    tip.style.top = `${hover.top}px`;
  }

  private fillTooltip(p: SeriesPoint) {
    const data = this.data!;
    const tip = this.tooltip;
    tip.replaceChildren();

    const head = document.createElement("div");
    head.className = "tip-head";
    head.textContent = `Age ${formatAgeMonths(p.ageMonths)}`;
    tip.append(head);

    const row = (value: string, label: string, keyClass: string | null) => {
      const r = document.createElement("div");
      r.className = "tip-row";
      const key = document.createElement("span");
      key.className = keyClass ? `tip-key ${keyClass}` : "tip-key tip-key-none";
      const v = document.createElement("strong");
      v.textContent = value;
      const l = document.createElement("span");
      l.className = "tip-label";
      l.textContent = label;
      r.append(key, v, l);
      tip.append(r);
    };
    row(dollars.format(p.a), data.labelA, "series-a");
    row(dollars.format(p.b), data.labelB, "series-b");
    const diff = p.b - p.a;
    const lead = Math.round(diff) === 0 ? "even" : diff > 0 ? "B ahead" : "A ahead";
    row(formatDifference(diff), `Difference (B − A), ${lead}`, null);
  }
}
