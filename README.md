# TradePulse Nepal — Phase 3 Web App

A fast, static-first trade intelligence application for Nepal Customs data.

## Why this replaces the public Streamlit UI

The current Streamlit app is valuable as a research/reference implementation, but the public product should be lighter, clearer and always available. This app has no runtime Python server and no Excel parsing in the browser.

## Current product

- Overview — four core KPIs, monthly/cumulative trend, top signals, top products, partner/route concentration.
- Explore — searchable products, countries, customs routes and HS sectors.
- Detail drawers — product partner-country breakdown, country product mix, route/sector detail.
- Trends — cumulative vs derived monthly movement.
- Intelligence — transparent, evidence-backed descriptive signals.
- Ask TradePulse — deterministic Q&A grounded in the selected release.
- Release switcher — Shrawan and Bhadra FY 2083/84 are included.
- Mobile-first responsive layout.

## Run locally

No npm install is required.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Validate

```bash
python tools/validate_data.py
node --check assets/app.js
bash build.sh
```

## Deploy to Vercel

Recommended production hostname:

```text
app.tradepulsenepal.com
```

The repository is static-first. Run:

```bash
bash build.sh
```

Deploy the generated `dist/` directory as the production site. `dist/vercel.json` contains the caching and security headers used by the public app.

After the first verified deployment, attach `app.tradepulsenepal.com` in Vercel and then update the “Explore dashboard” links on `tradepulsenepal.com` from Streamlit to the new app. Keep the Streamlit deployment available as a temporary fallback until Phase 3 has been verified in production.

## Data pipeline

`tools/process_customs_release.py` converts a standard Department of Customs workbook into browser-ready JSON using Python's standard library only.

See:

- `docs/ARCHITECTURE.md`
- `docs/MONTHLY_RELEASE.md`

## Source and provenance

Primary source: Department of Customs, Government of Nepal.

TradePulse Nepal is an independent processing and presentation layer, not an official government publication.
