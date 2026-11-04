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
