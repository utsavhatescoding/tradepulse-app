# Publishing a new monthly Customs release

Example: Asoj FY 2083/84.

## 1. Process the workbook

```bash
python tools/process_customs_release.py \
  --input "/path/to/FTS_Upto_Asoj_2083_84.xlsx" \
  --output "data/2083_84/asoj" \
  --fy 2083_84 \
  --release asoj \
  --label Asoj \
  --order 3 \
  --coverage "Mid July 2026 to Mid October 2026" \
  --updated 2026-10-XX \
  --previous-dir "data/2083_84/bhadra" \
  --report-url "https://tradepulsenepal.com/asoj-2083-84-trade-report.html"
```

The script preserves official cumulative values and derives single-month totals from the prior release.

## 2. Add the release to `data/releases.json`

Append the new release under FY 2083/84 and make it the default when ready.

## 3. Extend `data/2083_84/trends.json`

Append Asoj cumulative and derived monthly values. A later automation step can do this automatically.

## 4. Validate

```bash
python tools/validate_data.py
```

Do not publish if reconciliation fails.

## 5. Preview locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## 6. Push

Cloudflare Pages redeploys from Git automatically.
