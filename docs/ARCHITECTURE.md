# TradePulse Nepal — Phase 3 architecture

## Product split

- `tradepulsenepal.com` — reports, SEO pages, downloadable datasets and provenance.
- `app.tradepulsenepal.com` — fast interactive trade intelligence app.

The app is static-first. There is no always-on Python web server, so normal dashboard use cannot “sleep” in the way a Streamlit Community Cloud app can.

## Data flow

```text
Department of Customs XLSX
        ↓
tools/process_customs_release.py
        ↓
validated release JSON
        ↓
Git repository
        ↓
Cloudflare Pages
        ↓
app.tradepulsenepal.com
```

The browser never parses Excel. It receives small structured JSON files.

## Release structure

```text
data/
  releases.json
  2083_84/
    trends.json
    shrawan/
      summary.json
      products.json
      countries.json
      routes.json
      monthly_routes.json
      sectors.json
      signals.json
      import_product_partners.json
      export_product_partners.json
    bhadra/
      ...
```

Large partner tables are loaded only when a user opens product/country detail.

## UI architecture

Five destinations:

1. Overview
2. Explore
3. Trends
4. Intelligence
5. Ask TradePulse

This replaces the old 11-tab Streamlit structure. Upload controls, implementation details and source-status blocks are removed from the main user flow.

## Ask TradePulse

Phase 3 v1 uses a deterministic local analyst. It answers from the active release and never sends the dataset to a third-party model. A server-side AI endpoint can later be added behind a Cloudflare Worker without changing the UI.
