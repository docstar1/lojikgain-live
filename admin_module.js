// ADMIN MODULE (decrypted in-browser after founder unlock; never shipped in plaintext)
// Contains: Fraud Radar (Beneish M-Score components + Benford digit audit) and the
// derived statement-analysis charts with book-grounded legends.
// ---- Fraud Radar helpers (Beneish M-Score + Benford digit audit) ----
function fsFirstDigit(v) {
  if (typeof v !== "number" || !isFinite(v) || v === 0) return null;
  const s = String(Math.abs(v)).replace(/^[0.\-]+/, "").replace(/^0+/, "");
  const c = s.charAt(0);
  return (c >= "1" && c <= "9") ? Number(c) : null;
}
function fsBenford(vals) {
  const obs = [0,0,0,0,0,0,0,0,0], exp = [0,0,0,0,0,0,0,0,0];
  let n = 0;
  (vals || []).forEach(v => { const dg = fsFirstDigit(v); if (dg) { obs[dg-1]++; n++; } });
  if (!n) return null;
  let mad = 0, chi2 = 0;
  for (let d = 1; d <= 9; d++) {
    exp[d-1] = Math.log10(1 + 1/d) * 100;
    const op = obs[d-1] / n * 100;
    mad += Math.abs(op - exp[d-1]);
    if (exp[d-1] > 0) chi2 += Math.pow(obs[d-1] - Math.log10(1+1/d)*n, 2) / (Math.log10(1+1/d)*n);
  }
  mad /= 9;
  const band = mad < 0.006 ? "Close conformity" : mad < 0.012 ? "Acceptable conformity" : mad < 0.015 ? "Marginal conformity" : "Nonconformity";
  return { n: n, obs: obs, exp: exp, mad: mad, chi2: chi2, band: band };
}
function fsMscoreData(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, S = f.series || {};
  const trend = (f.balance_sheet_summary || {}).trend || [];
  const nHist = (f.hist_years || []).length;
  const out = { rows: [], partial: null, ok: false };
  if (nHist < 2) return out;
  const i2 = nHist - 1, i1 = nHist - 2;
  const t2 = trend[trend.length - 1] || {}, t1 = trend[trend.length - 2] || {};
  const ratio = (a, b) => (typeof a === "number" && typeof b === "number" && b !== 0) ? a / b : null;
  const rev = S.revenue || [], ni = S.net_profit || [], cfo = S.cfo || [], gm = S.gross_margin_pct || [];
  const comps = [
    ["DSRI", "Days sales in receivables index — are receivables swelling faster than sales?", ratio(t2.receivables_pct, t1.receivables_pct), 1.031, "receivables % of assets, this year vs last"],
    ["GMI", "Gross margin index — is the margin eroding? Deterioration raises manipulation risk.", ratio(typeof gm[i1] === "number" ? gm[i1] : null, typeof gm[i2] === "number" ? gm[i2] : null), 1.010, "gross margin %, last year over this year"],
    ["AQI", "Asset quality index — are soft/other assets growing faster than hard assets?", ratio(t2.other_assets_pct, t1.other_assets_pct), 1.007, "other assets % of balance sheet, composition proxy"],
    ["SGI", "Sales growth index — fast growers attract manipulation; growth itself is the pressure.", ratio(rev[i2], rev[i1]), 1.607, "revenue this year over last"],
    ["DEPI", "Depreciation index — is depreciation being stretched to prop up profits?", null, 1.077, "no depreciation series in the dataset"],
    ["SGAI", "SG&A to sales index — is selling cost discipline weakening?", null, 1.041, "no SG&A series in the dataset"],
    ["LVGI", "Leverage index — is debt building beyond the asset base?", ratio(t2.debt_to_equity, t1.debt_to_equity), 1.111, "debt/equity proxy for total debt over total assets"],
    ["TATA", "Total accruals to total assets — earnings running far ahead of cash flow.", (() => { const r = rev[i2]; return (typeof ni[i2] === "number" && typeof cfo[i2] === "number" && typeof r === "number" && r > 0) ? (ni[i2] - cfo[i2]) / r : null; })(), 0.018, "accrual gap (net profit minus operating cash flow) as % of revenue — revenue proxy for total assets"]
  ];
  out.rows = comps;
  const okRows = comps.filter(c => typeof c[2] === "number");
  out.missing = comps.filter(c => !(typeof c[2] === "number")).map(c => c[0]);
  if (okRows.length >= 4) {
    const W = { DSRI: 0.92, GMI: 0.528, AQI: 0.404, SGI: 0.892, DEPI: 0, SGAI: 0, LVGI: 0.115, TATA: 4.679 };
    let m = -4.84;
    comps.forEach(c => { if (typeof c[2] === "number") m += W[c[0]] * c[2]; });
    out.partial = m;
    out.ok = true;
  }
  return out;
}
function fsPanelFR(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, S = f.series || {}, fa = hev.forensic_audit || {};
  const years = f.all_10_years || [], nHist = (f.hist_years || years).length;
  let html = `<div class="fs-note">Fraud Radar — two classical screens computed live from the stored data: Beneish's M-Score components and a Benford's Law digit audit. Both are screens that say where to look, never proof of fraud. Worked reference: Enron's own M-Score climbed from a safe −2.27 (1999) to −0.44 (2000), the year before the collapse.</div>`;
  // 1) Beneish M-Score
  const ms = fsMscoreData(d);
  html += `<h4>Beneish M-Score — probability the accounts are massaged (Beneish 1999)</h4>`;
  html += `<table class="report-table"><thead><tr><th>Component</th><th>What it reads</th><th>This stock</th><th>Flags above</th><th>Status</th></tr></thead><tbody>`;
  ms.rows.forEach(c => {
    const has = typeof c[2] === "number";
    const flag = has && c[2] > c[3];
    html += `<tr><td><strong>${esc(c[0])}</strong></td><td>${esc(c[1])}</td><td>${has ? fsNum(c[2], 3) : "—"}</td><td>${fsNum(c[3], 3)}</td><td>${has ? (flag ? "FLAG" : "ok") : esc(c[4])}</td></tr>`;
  });
  html += `</tbody></table>`;
  if (ms.ok) {
    const m = ms.partial;
    const band = m > -1.78 ? "Above −1.78, the zone Beneish's full model associates with proven manipulators. Treat as a serious red flag and check the flagged components manually."
      : (m > -2.22 ? "Between −2.22 and −1.78, the gray zone. Not an accusation, but worth reading the flagged components below the table." : "Below −2.22, the zone Beneish's full model associates with non-manipulators.");
    html += `<p class="fs-note"><strong>Partial M-Score: ${fsNum(m, 2)}</strong>. ${esc(band)} ${ms.missing.length ? `This is a partial score: ${esc(ms.missing.join(", "))} cannot be computed from the stored data and enter neutrally, which makes the score read safer than a full 8-component run would.` : ""}</p>`;
  } else {
    html += `<p class="fs-note">Not enough paired years in the stored data to compute even the partial score.</p>`;
  }
  // 2) Accrual quality
  const rev = S.revenue || [], ni = S.net_profit || [], cfo = S.cfo || [];
  if (nHist >= 2) {
    html += `<h4>Accrual quality — does profit turn into cash?</h4>`;
    html += `<table class="report-table"><thead><tr><th>Year</th><th>Net profit</th><th>Operating cash flow</th><th>Accrual gap</th><th>Gap % of revenue</th></tr></thead><tbody>`;
    years.forEach((y, i) => {
      if (i >= nHist) return;
      const gap = (typeof ni[i] === "number" && typeof cfo[i] === "number") ? ni[i] - cfo[i] : null;
      const gp = (gap != null && typeof rev[i] === "number" && rev[i] > 0) ? (gap / rev[i]) * 100 : null;
      html += `<tr><td>${esc(y)}</td><td>${fsNum(ni[i], 0)}</td><td>${fsNum(cfo[i], 0)}</td><td>${fsNum(gap, 0)}</td><td>${fsNum(gp, 1)}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<p class="fs-note">Persistent profit well above operating cash flow is the single most common precursor in earnings-manipulation cases; persistent negative gaps with rising profits deserve a look too.</p>`;
  }
  // 3) Benford digit audit
  const MON = ["revenue", "eps", "net_profit", "operating_profit", "cfo", "capex", "fcf", "equity", "net_debt", "shares", "book_value_ps", "dps"];
  const acctVals = [];
  MON.forEach(k => {
    (S[k] || []).slice(0, nHist).forEach(v => { if (typeof v === "number" && v !== 0) acctVals.push(v); });
  });
  if (Array.isArray(d.revenue)) d.revenue.forEach(v => { if (typeof v === "number" && v !== 0) acctVals.push(v); });
  if (Array.isArray(d.eps)) d.eps.forEach(v => { if (typeof v === "number" && v !== 0) acctVals.push(v); });
  const priceVals = (d.price_series || []).filter(v => typeof v === "number" && v !== 0);
  const bA = fsBenford(acctVals), bP = fsBenford(priceVals);
  const benfordTable = (b, label) => {
    if (!b) return "";
    let h = `<h4>${esc(label)}</h4>`;
    h += `<table class="report-table"><thead><tr><th>First digit</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th></tr></thead><tbody>`;
    h += `<tr><td>Expected %</td>${b.exp.map(p => `<td>${fsNum(p, 1)}</td>`).join("")}</tr>`;
    h += `<tr><td>Observed %</td>${b.obs.map(o => `<td>${fsNum(o / b.n * 100, 1)}</td>`).join("")}</tr>`;
    h += `</tbody></table>`;
    h += `<p class="fs-note">Observations: ${b.n}. Mean absolute deviation ${fsNum(b.mad, 4)} → <strong>${esc(b.band)}</strong> (Nigrini bands: &lt;0.006 close, &lt;0.012 acceptable, &lt;0.015 marginal, above that nonconformity). Chi-square ${fsNum(b.chi2, 1)} against the 15.51 cut-off, but chi-square overstates deviations at small samples.</p>`;
    return h;
  };
  if (bA) html += benfordTable(bA, "Benford's Law — first digits of the stored accounting figures (historical years)");
  if (bP) html += benfordTable(bP, "Benford's Law — first digits of the stored price series (market data, not accounting data)");
  if (bA || bP) html += `<p class="fs-note">Read this honestly: Benford's Law is strongest on hundreds of independent transaction values. Annual statement lines and a 3-year monthly price series are small, correlated samples, so a marginal band here is a reason to look closer, never a finding on its own. The forensic audit tab's 17 checks (${esc(fa.verdict_label || "")}) remain the primary screen; this tab adds the two classical quantitative tests on top.</p>`;
  return html;
}

// Sector-specific operating KPIs (screener-style). A row renders only when the
// company's data file actually carries that field, so every stock shows what it should be checked on.
const FS_KPI_TEMPLATES = [
  { match: /bank|financial|insur|nbfc/i, kpis: [
    ["Deposits", "settings.deposits"], ["Advances / loans", "settings.advances"],
    ["Net interest margin %", "settings.nim_pct"], ["Gross NPA %", "settings.gross_npa_pct"],
    ["Net NPA %", "settings.net_npa_pct"], ["CASA %", "settings.casa_pct"],
    ["Capital adequacy %", "settings.car_pct"], ["Branches", "settings.branch_count"],
    ["Employees", "settings.employees"] ] },
  { match: /oil|gas|energy|petrol|refin/i, kpis: [
    ["New wells drilled (per yr)", "settings.wells_dug_per_year"], ["Producing wells", "settings.producing_wells"],
    ["Proved reserves (boe)", "settings.reserves_boe"], ["Production volume", "settings.production_volume"],
    ["Refining capacity", "settings.refining_capacity"], ["Avg realisation", "settings.avg_realisation"],
    ["Reserve replacement %", "settings.reserve_replacement_pct"] ] },
  { match: /telecom|wireless/i, kpis: [
    ["Subscribers", "settings.subscribers"], ["ARPU", "settings.arpu"], ["Churn %", "settings.churn_pct"],
    ["Towers", "settings.tower_count"], ["Spectrum capex", "settings.spectrum_capex"] ] },
  { match: /retail|store|department/i, kpis: [
    ["Store count", "settings.store_count"], ["Same-store sales growth %", "settings.sss_growth_pct"],
    ["Average ticket", "settings.avg_ticket"], ["Inventory turns", "settings.inventory_turns"] ] },
  { match: /pharma|health|biotech|hospital/i, kpis: [
    ["R&D % of sales", "settings.rd_pct_of_sales"], ["ANDA approvals", "settings.anda_approvals"],
    ["Granted patents", "settings.patents_granted"], ["Pipeline candidates", "settings.pipeline_count"],
    ["Hospitals / beds", "settings.bed_count"] ] },
  { match: /auto|vehicle|automobil/i, kpis: [
    ["Volumes (units)", "settings.unit_volumes"], ["Capacity utilisation %", "settings.capacity_utilisation_pct"],
    ["New launches", "settings.new_launches"] ] },
  { match: /software|it services|tech/i, kpis: [
    ["Headcount", "settings.headcount"], ["Utilisation %", "settings.utilisation_pct"],
    ["Attrition %", "settings.attrition_pct"], ["Revenue per employee", "settings.revenue_per_employee"] ] },
  { match: /cement|construct/i, kpis: [
    ["Capacity (MT)", "settings.capacity_mt"], ["Volume growth %", "settings.volume_growth_pct"] ] },
  { match: /power|utility|electric/i, kpis: [
    ["Installed capacity (MW)", "settings.installed_capacity_mw"], ["PLF %", "settings.plf_pct"],
    ["AT&C losses %", "settings.atc_losses_pct"] ] },
  { match: /airline|aviation/i, kpis: [
    ["Available seat km", "settings.ask"], ["Seat factor %", "settings.seat_factor_pct"],
    ["Fuel cost % of sales", "settings.fuel_cost_pct"] ] },
  { match: /real estate|realty|propert/i, kpis: [
    ["Land bank (acres)", "settings.land_bank_acres"], ["Ongoing projects", "settings.ongoing_projects"],
    ["Pre-sales", "settings.presales"] ] },
  { match: /fmcg|consumer|beverage|food/i, kpis: [
    ["Distribution reach", "settings.distribution_reach"], ["Volume growth %", "settings.volume_growth_pct"] ] }
];


function appendDerivedCharts(grid, hev, renderChartCardFn, escFn) {
  const renderChartCard = renderChartCardFn, esc = escFn;
  // Derived statement-analysis charts, built from the stored series; legends quote the source books verbatim.
  const hevF = hev.forecasts || {};
  const fser = hevF.series || {};
  const trend2 = ((hevF.balance_sheet_summary || {}).trend) || [];
  const histYears = (hevF.hist_years || hevF.all_10_years || []).slice(0, (hevF.hist_years || hevF.all_10_years || []).length);
  const histN = (hevF.hist_years || hevF.all_10_years || []).length;
  if (grid && histN >= 2) {
    const sec = document.createElement("div");
    sec.style.cssText = "grid-column:1/-1;margin-top:8px";
    sec.innerHTML = `<h4 style="margin:4px 0 2px">Statement analysis charts — from the books you shared</h4>`;
    grid.appendChild(sec);
    const specs = [];
    const yearsH = histYears;
    specs.push({ id: "d1_scissors", title: "Scissors effect: revenue growth vs net margin vs EPS growth (historical years)", type: "line", labels: yearsH,
      series: { "Revenue growth %": (fser.revenue_growth_pct || []).slice(0, histN), "Net margin %": (fser.net_margin_pct || []).slice(0, histN), "EPS growth %": (fser.eps_growth_pct || []).slice(0, histN) } });
    if (trend2.length >= 2) {
      specs.push({ id: "d2_working_capital", title: "Working capital reading: current and quick ratio by year", type: "line", labels: trend2.map(t => t.year),
        series: { "Current ratio": trend2.map(t => t.current_ratio), "Quick ratio": trend2.map(t => t.quick_ratio) } });
    }
    const revS = fser.revenue || [], capS = fser.capex || [];
    if (capS && capS.length) {
      specs.push({ id: "d3_capex", title: "Capital expenditure intensity: capex as % of revenue (historical years)", type: "bar", labels: yearsH,
        series: { "Capex % of revenue": yearsH.map((y, i) => (revS[i] > 0 && capS[i] != null) ? (capS[i] / revS[i]) * 100 : null) } });
    }
    if ((fser.roe_pct || []).length >= 2 && (fser.roce_pct || []).length >= 2) {
      specs.push({ id: "d4_leverage", title: "Leverage read: ROE vs ROCE (historical years)", type: "line", labels: yearsH,
        series: { "ROE %": (fser.roe_pct || []).slice(0, histN), "ROCE %": (fser.roce_pct || []).slice(0, histN) } });
    }
    const legends = {
      d1_scissors: `Legend: blue = revenue growth %, green = net margin %, amber = EPS growth %. Framework: FA p.2, section "THE SCISSORS EFFECT" (those source pages are image-only in the PDF, so cited, not quoted). When the cost line grows faster than sales, margins compress.`,
      d2_working_capital: `Legend: blue = current ratio, green = quick ratio. "Working capital is two-sided. From the point of view of balance sheet value, it is liquid. From a going-concern point of view, it is permanent." (FA p.28) "Analyzing how the requirement has changed from year end to year end can shed light on whether the company's operations are improving or deteriorating." (FA p.29)`,
      d3_capex: `Legend: blue bars = capex as % of revenue each year. "By comparing capital expenditure with depreciation charges, you can determine whether the company is: Expanding its industrial base by increasing production capacity... Maintaining its industrial base, replacing production capacity as necessary... Underinvesting or divesting (capital expenditure below depreciation). This situation can only be temporary or the company's future will be in danger, unless the objective is to liquidate the company." (FA p.35)`,
      d4_leverage: `Legend: blue = ROE %, green = ROCE %. Judge the group from FA pp.71-72: Group 1 ROE up / ROCE down; Group 2 stable ROE with ROCE equal to ROE (no debt); Group 3 ROE slightly down with ROCE up and above ROE; Group 4 stable high ROE with much lower ROCE (massive debt). "First, look at where the performance is coming from, operations or finance or both. Second, the risk return trade off. Thirdly, flexibility- keep flexibility for the future. Finally, understand the relationship b/w profitability and growth i.e. SSG" (FA p.72)`,
    };
    specs.forEach(sp => {
      const card = renderChartCard(sp);
      grid.appendChild(card);
      const lg = document.createElement("div");
      lg.className = "chart-card glass";
      lg.style.cssText = "font-size:12px;color:var(--muted);line-height:1.45";
      lg.innerHTML = esc(legends[sp.id] || "");
      grid.appendChild(lg);
    });
  }

}

window.ADMIN_MODULE = { fsPanelFR: fsPanelFR, appendDerivedCharts: appendDerivedCharts };
