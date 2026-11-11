# shinn-social-security-breakeven
Analysis to assist with real social security breakeven scenarios for starting benefit timing.

Live page: https://coderabbit-demo.github.io/shinn-social-security-breakeven/

## Current scope
Compares two ages to start benefits and shows the breakeven age: the age at which the later start has paid out the same total. It assumes no opportunity cost. Benefits rise with inflation through cost-of-living adjustments, so everything is in today's dollars and the breakeven doesn't depend on the inflation rate. Full retirement age is fixed at 67.

Below the result, a **Chart** tab plots each option's running total of benefits through age 100, with a dotted line at the breakeven age; hover (or focus the chart and use the arrow keys) to see the age, both totals and the difference. A **Table** tab lists the same totals at each birthday, with the breakeven month highlighted.

## Development
```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck  # TypeScript check
npm run build      # builds dist/index.html
npm run preview    # serves the built page
```

## Offline use
`npm run build` produces one self-contained file, `dist/index.html`, with all JavaScript and CSS inlined. Open it directly in a browser with no server or internet connection.

## URL parameters
All inputs can be set from the URL, and the URL updates as you change them, so a comparison can be bookmarked or shared.

| Parameter | Meaning | Range | Default |
|---|---|---|---|
| `pia` | Monthly benefit at full retirement age (today's $) | 1–100000 | 1000 |
| `a_year` | Option A: age to start benefits | 62–70 | 62 |
| `a_month` | Option A: month of age (1 = birthday month) | 1–12 | 1 |
| `b_year` | Option B: age to start benefits | 62–70 | 67 |
| `b_month` | Option B: month of age (1 = birthday month) | 1–12 | 1 |

Example: `index.html?pia=1800&a_year=62&a_month=1&b_year=70&b_month=1`

Missing or invalid values fall back to the defaults.

## Deployment
Pushes to `main` run `.github/workflows/pages.yml`, which tests, builds and publishes `dist/` to GitHub Pages. In the repo's Settings → Pages, set Source to **GitHub Actions** once.
