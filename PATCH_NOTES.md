# LojikGain security patch

## What changed
1. **Removed the public admin digest.** `ADMIN_DIGEST` (a SHA-256 of `lojikx_v1:email:password`)
   shipped in `app.js` and `founder.html`. It was an offline password-cracking oracle, and the
   Founder key is derived from the same email:password, so cracking it opened the vault.
   The admin gate is now: the Founder vault must decrypt. AES-GCM's auth tag is the check.
   Login UX is unchanged (same modal, same credentials).
2. **Removed the URL password unlock.** `founder.html` no longer reads `?email=`/`?password=`
   (or `?e=`/`?pass=`) and no longer auto-unlocks from a query string, which leaks the
   password into browser history, referrers and logs. Session restore on reload still works.
3. **Scrubbed committed credentials.** `audit_live.js` no longer contains the founder email or
   password; it now reads `LOJIK_EMAIL` / `LOJIK_PASS` from the environment. Deleted
   `decrypt_out.txt` (plaintext of the encrypted Founder data).
4. **Added `.gitignore`** for `*.enc`, `audit_live.js`, `decrypt_out.txt`, `node_modules/`.
5. **Untracked the encrypted payloads** (`founder_data.enc`, `founder_bundle.enc`) so they are
   no longer part of the published site (local copies kept).
6. **Added `tools/reencrypt_founder.py`** to re-encrypt the vault under a new password.

## You still must do (the patch alone does not undo exposure)
- **Rotate the founder password and re-encrypt.** The old password is already exposed
  (it sat in a plaintext file, and the digest was public). Until it changes, the vault is open.
  `python3 tools/reencrypt_founder.py founder_data.json founder_data.enc --email dr.timothysuraj@gmail.com`
- **Host the `.enc` privately, or accept it is public.** Untracking removes it from the repo,
  so the deployed Founder page will 404 on the vault until you serve it from an authenticated
  endpoint (your Flask `/api/...` is the natural place). If you would rather keep it on Pages,
  a strong rotated password makes public ciphertext acceptable, in which case `git add` it back.
- **Purge it from history / rotate anything else.** If the repo or any zip was shared, the old
  blob and digest remain in git history; consider a history rewrite and treat the old as burned.

## Left alone (not security, flagging only)
- `app.js` and `static/app.js` are byte-identical copies kept in manual sync (the "Sync app.js"
  commits). Worth collapsing to one source with a build step.
- `requireAuthFor()` always returns `false`, so the paywall gate is decorative on the client.
- `isAdminEmail()` still hard-codes your personal email as a string (display/dead-code only now).
- `data/public_research_data` ships as both `.js` and `.json` (~24 MB duplicated).

---

## Update 2 - Financial Statements + Fraud Radar (2026-11-05)

**What's new**

1. Financial Statements tab (5th top-level tab, screener.in style)
   - Profit & Loss, Balance Sheet, Cash Flows tables: stored history (5 years) + 5 modelled forecast years, growth rows (revenue / profit / EPS / price CAGR) in admin mode.
   - Analysis Notes (admin-only content, statement tables stay public): margin structure, scissors effect (cost growth vs sales growth), working-capital reading (current ratio, quick ratio, receivables/inventory % of assets), capex analysis, financing & leverage classification, WACC note from the DCF block.
   - Competitors: peer table for the stock's comparator list from the data files (auto-sized per stock, e.g. HDFCBANK 8 peers).
   - Fraud Radar (new sub-tab): Beneish M-Score components (DSRI, GMI, AQI, SGI, DEPI, SGAi, LVGI, TATA; 1999 weights, -4.84 intercept) computed live from stored data, partial score with explicit list of non-computable components, plus accrual-quality table (net profit vs operating cash flow gap), and two Benford's Law first-digit audits (accounting figures and the stored price series) with Nigrini MAD bands and chi-square, each with an honesty caveat about small samples. Enron worked reference quoted (M-Score -2.27 in 1999 to -0.44 in 2000).
   - Sector KPIs: sector-aware reading of the stored data (margins, growth, returns, leverage) with a note when the dataset cannot supply the sector-specific line (e.g. bank deposits, wells drilled).
   - Frameworks from the Financial Performance book (Bertoneche & Knight) wired into Analysis Notes: DuPont ROE decomposition, sustainable growth rate, EVA spread (ROCE vs WACC).

2. Data honesty
   - All derived numbers computed from the stored data file only; anything the dataset cannot supply renders as an em-dash with the reason, never a fabricated figure.
   - M-Score shows a partial score only when at least 4 components are computable; below that it says so.

3. Version + cache
   - Asset cache version bumped v15 -> v17 in both index.html files (cache-busting for returning visitors).

**Testing**
- 44/44 automated checks pass (syntax, render, per-stock spot checks, admin gating, fraud math).
- Real-browser end-to-end (headless Chromium): landing, ticker load, all six top-level views, all seven Financial Statements sub-tabs as public and admin, Analysis Notes locked for public / full for admin, rapid sub-tab switching with zero page errors. Only failed request in the log is the known harmless /api/auth/me backend ping.

**Files changed**: index.html, static/index.html, static/app.js, app.js, PATCH_NOTES.md

## Update 3 - Admin Buffettology surfacing + verbatim Analysis Notes (2026-11-05)

1. Admin Forensic & LojikX Quality Audit view now shows everything from the Founder vault, verbatim:
   - Buffettology Scorecard card (earned/total, verdict, realm-of-confidence line, passed/failed point IDs).
   - Computation card (retained earnings/TREGIP, initial return, book value model, EPS growth model, bond coupon model, growth CAGRs, quality snapshot - every stored value).
   - All 23 points with their stored question/principle, calc values, YES/NO verdict and note, rendered through the existing LojikX point-card layout.
   - Source: data/founder_points.json (generated from founder_data.enc, plaintext copy on the server; the encrypted vault file is unchanged and stays the system of record). Loaded only when isAdminUser() is true; normal users see nothing new. Note: the admin gate is client-side, so a determined visitor who knows the site could fetch founder_points.json - keep the local server private.
2. Analysis Notes (Financial Statements > Analysis Notes, admin) rewritten so every explanation quotes the source texts verbatim with page cites:
   - Financial Analysis.pdf: working capital (FA pp.27-29), capex expansion/maintenance/underinvestment test (FA p.35), financing questions (FA p.51), the four leverage groups and conclusion verbatim (FA pp.71-72).
   - Bertoneche & Knight, Financial Performance: duPont chart (BK p.100), sustainable growth = ROE x rr (BK pp.102-103), EVA spread (BK p.138).
   - Sentences computed from the stored data are prefixed "Read on this company's series:" so book wording and site computation never blur. Computed tables and all values are unchanged. The FA scissors-effect pages are image-only in the PDF, so that section cites the section title (FA p.2) instead of quoting body text.
   - Cache bumped to v=20261107.
3. Verified in-browser (headless Chromium, admin session): TCS and HDFCBANK render 23 point cards + scorecard + computation with zero page errors; normal-user mode shows none of the new material; all 13 verbatim quote tokens render in Analysis Notes.

## Update 4 - Where everything lives + vault-only admin + statement charts (2026-11-05)

### Where each addition sits in the app
1. Fraud analytics: "Fraud Radar" sub-tab inside the Financial Statements view (Update 2). Ten fraud-pattern readings computed from the loaded statements, each with its explanation line. Visible to admin; the page as shipped shows it inside the admin-gated area.
2. Extra book points (Buffettology): the admin "Forensic & Points" panel. The 23-point scorecard card and the Computation card render above the point cards, verbatim from the founder vault, labelled with your realm/classification words. Nothing was reworded.
3. Financial Analysis presentation: "Analysis Notes" panel inside Financial Statements. Verbatim quotes from Financial Analysis and Bertoneche/Knight with page cites (FA p.27, 28, 29, 35, 51, 71-72; BK p.100, 102-103, 138), and any sentence computed on the company's series is prefixed "Read on this company's series:" so book text and computed text never blur. The scissors pages in the PDF are image-only, so they are cited by section title only.
4. NEW: Visual Analytics now ends with four statement-analysis charts built from the stored series, each followed by a legend card quoting the book line it reads through:
   - Scissors effect (revenue growth vs net margin vs EPS growth)
   - Working capital reading (current and quick ratio)
   - Capital expenditure intensity (capex % of revenue)
   - Leverage read (ROE vs ROCE, FA pp.71-72 group framework)
   They render with the same card style as the 23 charts and are grouped under the Financials filter.

### Vault-only change (important)
- data/founder_points.json (plaintext admin points on the server) is REMOVED. That was a leak risk on a public repo and it is gone from the tree and history path forward.
- The admin panel reads only the encrypted founder vault again, exactly as you originally set up: unlock with your passphrase, decryption happens in the browser, points/score/computation merge into the view. Nothing proprietary sits unencrypted on the server. Tested: admin unlock renders all 23 points + scorecard + computation; user mode still shows nothing.
- Cache version bumped to v=20261109.

## Update 5 - Computation moved behind the founder vault + two-repo split (2026-11-05)

- Fraud Radar (Beneish M-Score components + Benford digit audit) and the four statement-analysis charts with their book-grounded legends now live ONLY in the encrypted admin module (admin_code.enc). The public bundle ships none of that computation.
- After founder unlock, the module is decrypted in the browser and the panels render as before. Public visitors see an "available to authorised accounts" note in place of the Fraud Radar, and the standard 23 charts without the derived ones.
- The score, quality band and rating stay public, as agreed.
- admin_module.js (the plaintext source of the module) is NOT part of the public repo; it lives in the private repo.
- Public repo gets a clean copy: no build scripts, no tools, no PATCH_NOTES, no audit file, and the vault comment no longer hints at the passphrase format.
- Homepage quick picks now include NIFTY 50 (first) and S&P 500 (last); both verified loading.
## Update 6 (2026-11-05): Full Statements view (screener.in format)

- New tool `tools/build_statement_full.py TICKER...`: fetches the screener.in consolidated page and stores a `statement_full` block (Profit & Loss, Quarters, Balance Sheet, Cash Flow, Ratios, Shareholding with period labels) in `data/tickers/<T>.json`.
- Generated for ITC and HDFCBANK; static/data synced; ITC payload in public_index.json refreshed (the app reads the embedded payload first).
- Financials tab: new first sub-tab "Full Statements" (`fsPanelSV`) renders the screener-style tables verbatim (periods as columns, TTM included); becomes the default sub-tab when a ticker has `statement_full`.
- Tickertape reference recorded (Income / Balance Sheet / Cash Flow tabs, quarterly dropdown, rows Total Revenue, EBITDA, PBDT, PBT, Net Income, EPS); screener format chosen as primary because it matches the founder's xlsx template exactly.
- Browser re-verification could not run this session (sandbox missing libatk, no root); verify locally: open a ticker, Financials tab, "Full Statements".
- Cache bumped to `app.js?v=20261105_sv1`. Commit `1e3dfdb`.

## Update 7 (2026-11-05): Full Statements extended to 122 tickers incl. 47 US

- New tool `tools/build_statement_full_us.py TICKER...`: US statements from stockanalysis.com (screener.in has no US listings). Parses all tables on the financials pages and routes them by first-row label into profit-loss / cash-flow / balance-sheet / ratios; dedicated statement pages define column layout before the overview page fills gaps.
- 47 US tickers built (45 OK first pass + XOM retry): AAPL pl=15 bs=47 cf=34 ra=36 etc. TTM/Current duplicate first period relabelled. HTML entities unescaped, periods cleaned to "Sep '26" form.
- Coverage now 122/128 statement_full. Known gaps: BDL and PAGEIND (screener.in serves zero numeric cells on their consolidated pages as of 2026-11-05, values load client-side), TATAMOTORS and ZOMATO (404 on screener, renamed listings; replacements not auto-substituted), S&P 500 and NIFTY 50 (indices, statements not applicable).
- Renderer fixes in fsPanelSV (both app.js copies): quarterly shareholding now also reads the `quarterly_trends` key the India builder stores; "Profit & Loss" heading no longer double-escaped (was rendering a literal "&amp;" in the browser).
- Verified by a JS render harness on US and India shapes: tables, period headers, number formatting, shareholding blocks and source/units note all render; no double escapes. Live browser check still pending locally (no GUI in sandbox): open a ticker, Financials tab, Full Statements.
- Commit `992f005`.

## Update 8 (2026-11-06): Full Statements gap tickers closed - coverage 126/128

- `tools/build_statement_full.py` extended: `slug` parameter for renamed screener listings (TATAMOTORS now lives at TMPV, ZOMATO at ETERNAL), and a standalone-page fallback for companies whose consolidated page ships zero numeric cells (BDL, PAGEIND: numbers load client-side there; screener's API endpoints 404 and the results pages need login).
- BDL and PAGEIND built from their standalone pages: quarters 13, P&L 13, balance-sheet 10, cash-flow 6, ratios 6, shareholding yearly + quarterly. `consolidated: false` recorded, so the panel note correctly reads "(standalone)".
- TATAMOTORS and ZOMATO built from their renamed consolidated listings and stored under the app's own tickers (data/tickers/TATAMOTORS.json, ZOMATO.json), with the actual source page kept in `url` and `listing_slug` recording the override.
- Coverage is now 126/128 statement_full. The two remaining gaps are S&P 500 and NIFTY 50 (indices, statements not applicable) by design.
- Renderer unchanged this round: fsPanelSV already handles both shapes, so BDL/PAGEIND show the standalone note automatically.
- Verified with the JS render harness on all four new files: all five section tables + both shareholding blocks render, TTM column present, "(standalone)"/"(consolidated)" note correct per company, no double escapes, 500+ numeric cells rendering per company. Live browser check still pending locally (no GUI in sandbox): open BDL, PAGEIND, TATAMOTORS, ZOMATO, Financials tab, Full Statements.
- static/data synced for all four.
