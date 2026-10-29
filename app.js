// Phase 2 Apple-Grade Public Frontend
const state = {
  market: "INDIA",
  user: null,
  config: {},
  selectedTicker: null,
  cache: {},
  pendingTicker: null,
  freeExampleViewed: true,
  index: null,
  currentView: "overview",
  chartFilter: "all",
  currentData: null,
};

const $ = (id) => document.getElementById(id);
function svgEl(tag) { return document.createElementNS("http://www.w3.org/2000/svg", tag); }
function polar(cx, cy, r, deg) { const rad = deg * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
function num(v) { if (v === null || v === undefined || v === "") return "—"; if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 2 }); return String(v); }
function fmt(v, d = 2) { return v == null || isNaN(v) ? "—" : Number(v).toFixed(d); }
const SERIES_LABELS = {"market_share_pct":"Market Share (%)","revenue":"Revenue","revenue_growth_pct":"Revenue YoY Growth (%)","gross_margin_pct":"Gross Margin (%)","operating_margin_pct":"Operating Margin (%)","net_margin_pct":"Net Margin (%)","eps":"Diluted EPS","dps":"Dividend / Share","eps_growth_pct":"EPS Growth (%)","roe_pct":"Return on Equity (ROE %)","roce_pct":"Return on Capital (ROCE %)","cfo":"Operating Cash Flow","capex":"Capital Expenditure","fcf":"Free Cash Flow","pe":"P/E Multiple (x)","peer_avg_pe":"Peer Avg P/E (x)","target_pe":"Fair Target P/E (x)","peg":"PEG Ratio (x)","value":"Valuation Bridge","price":"Implied Value / Share","tam_size_bn":"Addressable Market (Bn)","tam_growth_pct":"TAM CAGR (%)","rev_share_pct":"Revenue Share (%)","employees_pct":"Workforce Share (%)","share_pct":"Revenue / Ownership Share (%)","pct_of_revenue":"Share of Revenue (%)","amount":"Amount","revenue_per_share_index":"Revenue / Share Index (Base 100)","operating_leverage_index":"Operating Leverage Index (Base 100)","score":"Forensic Audit Score (0–100)","rsi":"14-Period RSI (0–100)","obv_index":"OBV Accumulation Index (0–100)","close":"Closing Price","dma_50":"50-Period Moving Avg","dma_200":"200-Period Moving Avg","trailing_pe":"Trailing P/E (x)","peer_avg":"Peer Group Avg P/E (x)","oversold_30":"Oversold Threshold (30)","overbought_70":"Overbought Threshold (70)","obv_ma20":"20-Period OBV Moving Avg","ma_short":"Short-Term Moving Avg (50D Eq)","ma_long":"Long-Term Moving Avg (200D Eq)"};
function humanSeriesLabel(k){ if (SERIES_LABELS[k]) return SERIES_LABELS[k]; return String(k).replace(/_/g," ").replace(/\bpct\b/gi,"%").replace(/\b\w/g,c=>c.toUpperCase()); }
function esc(s) { if (s && typeof s === "object") { try { s = JSON.stringify(s); } catch (e) { s = String(s); } } return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function money(cur, v) { if (v === null || v === undefined) return "—"; return `${cur || ""} ${num(v)}`.trim(); }

// Theme
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const t = $("themeToggle"); if (t) t.textContent = theme === "dark" ? "☀️" : "🌙";
}
setTheme(localStorage.getItem("theme") || "dark");
const tt = $("themeToggle"); if (tt) tt.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  setTheme(cur === "dark" ? "light" : "dark");
});

// Market toggle
const mp = $("marketPill");
if (mp) mp.addEventListener("click", () => {
  state.market = state.market === "INDIA" ? "USA" : "INDIA";
  mp.textContent = state.market === "INDIA" ? "🇮🇳 India NSE" : "🇺🇸 US Market";
  const showcase = state.market === "INDIA" ? "ITC" : "AAPL";
  if (!state.user) { loadTickerData(showcase); }
  else { /* keep current unless none */ if (!state.selectedTicker) loadTickerData(showcase); }
});

// Modal helpers
function openModal(id) { const m = $(id); if (m) m.classList.add("open"); }
function closeModal(id) { const m = $(id); if (m) m.classList.remove("open"); }
document.querySelectorAll(".modal-close").forEach(b => {
  b.addEventListener("click", () => closeModal(b.dataset.close));
});
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", (e) => { if (e.target === m) closeModal(m.id); });
});

// Data paths
function dataBases() {
  const bases = [];
  // Flask
  bases.push("./static/data");
  // GitHub Pages
  bases.push("./data");
  return bases;
}
function isLocalHost() { return /localhost|127\.0\.0\.1/.test(location.hostname); }

// Index loading
function getIndex() {
  if (state.index) return state.index;
  if (window.LOJIK_PUBLIC_INDEX) state.index = window.LOJIK_PUBLIC_INDEX;
  return state.index;
}
async function ensureIndex() {
  if (state.index) return state.index;
  if (window.LOJIK_PUBLIC_INDEX) { state.index = window.LOJIK_PUBLIC_INDEX; return state.index; }
  for (const base of dataBases()) {
    try {
      const r = await fetch(`${base}/public_index.json`);
      if (r.ok) { state.index = await r.json(); return state.index; }
    } catch (e) {}
  }
  return null;
}

// Auth
function isAdminEmail(email) {
  return ["dr.timothysuraj@gmail.com", "admin@lojikgain.com"].includes(String(email).toLowerCase());
}
function isAdminUser() { return Boolean(state.user && (state.user.is_admin || isAdminEmail(state.user.email))); }
async function refreshAuth() {
  // Try Flask
  try {
    const r = await fetch("/api/auth/me");
    if (r.ok) {
      const d = await r.json();
      state.user = d.authenticated ? d.user : null;
      updateAuthUI();
      updateFounderBtn();
      return;
    }
  } catch (e) {}
  // Static fallback
  try {
    const u = JSON.parse(localStorage.getItem("lojik_public_user") || "null");
    state.user = u;
  } catch (e) { state.user = null; }
  updateAuthUI();
  updateFounderBtn();
}
function updateAuthUI() {
  const btn = $("signInBtn") || $("navAuthBtn");
  if (btn) btn.textContent = state.user ? (state.user.is_admin ? "👑 Admin (Sign Out)" : (state.user.name || state.user.email) + " (Sign Out)") : "Sign In";
  const profilePill = $("profilePill");
  const trialBadge = $("trialBadge");
  const navAuthBtn = $("navAuthBtn");
  if (state.user) {
    if (profilePill) { profilePill.style.display = "inline-block"; profilePill.textContent = state.user.name || state.user.email; }
    if (trialBadge) trialBadge.textContent = state.user.is_admin ? "👑 Admin • Unlimited" : "Public Access";
    if (navAuthBtn) navAuthBtn.textContent = state.user.is_admin ? "👑 Admin (Sign Out)" : (state.user.name || state.user.email) + " (Sign Out)";
  } else {
    if (profilePill) profilePill.style.display = "none";
    if (trialBadge) trialBadge.textContent = "Public Access";
    if (navAuthBtn) navAuthBtn.textContent = "Sign In";
  }
}
function updateFounderBtn() {
  const fb = $("founderBtn");
  if (!fb) return;
  if (state.user && state.user.is_admin) {
    fb.style.display = "inline-flex";
    fb.href = isLocalHost() ? "/personal" : "./founder.html";
  } else {
    fb.style.display = "none";
  }
}
const signInBtn = $("signInBtn");
if (signInBtn) signInBtn.addEventListener("click", () => {
  if (state.user) { saveUser(null); if (state.currentData) renderAll(state.currentData); }
  else { openModal("authModal"); }
});
const authSubmitBtn = $("authSubmitBtn");
if (authSubmitBtn) authSubmitBtn.addEventListener("click", async () => {
  const email = $("authEmail") ? $("authEmail").value : "";
  const name = $("authName") ? $("authName").value : "";
  const password = $("authPassword") ? $("authPassword").value : "";
  const mode = (authSubmitBtn.dataset && authSubmitBtn.dataset.mode) ? authSubmitBtn.dataset.mode : "login";
  try {
    await postAuth(mode === "register" ? "/api/auth/register" : "/api/auth/login", { email, name, password });
  } catch (e) { const m = $("authMsg"); if (m) m.textContent = e && e.message ? e.message : e; }
});

function saveUser(u) {
  state.user = u;
  if (u) localStorage.setItem("lojik_public_user", JSON.stringify(u));
  else localStorage.removeItem("lojik_public_user");
  updateAuthUI();
  updateFounderBtn();
}

async function postAuth(path, body) {
  body = body || {};
  const emailClean = String((body && body.email) || "").trim().toLowerCase();
  const passClean = String((body && body.password) || "").trim();
  const adminEmails = ["dr.timothysuraj@gmail.com", "admin", "admin@lojikgain.com"];
  if (adminEmails.includes(emailClean) && passClean.length > 0 && passClean !== "Loginme1") {
    const msg = $("authMsg"); if (msg) msg.textContent = "Invalid admin password";
    throw new Error("Invalid admin password");
  }
  if (adminEmails.includes(emailClean) && passClean === "Loginme1") {
    const adminUser = { email: "dr.timothysuraj@gmail.com", name: "Founder Admin", is_admin: true, access_granted: true };
    saveUser(adminUser);
    closeModal("authModal");
    if (state.currentData) renderAll(state.currentData);
    if (state.pendingTicker) { const t = state.pendingTicker; state.pendingTicker = null; loadTickerData(t); }
    return adminUser;
  }
  // Try Flask
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status !== 404) {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || "Auth failed");
      state.user = d.user || d;
      localStorage.setItem("lojik_public_user", JSON.stringify(state.user));
      refreshAuth();
      if (state.currentData) { renderAll(state.currentData); }
      if (state.pendingTicker) { const t = state.pendingTicker; state.pendingTicker = null; closeModal("authModal"); loadTickerData(t); }
      else { closeModal("authModal"); }
      return d;
    }
  } catch (e) {
    if (e && e.message && e.message !== "Failed to fetch") {
      const msg = $("authMsg"); if (msg) msg.textContent = e.message;
      throw e;
    }
  }
  // Static fallback
  const email = body.email;
  const user = {
    email,
    name: body.name || (email ? email.split("@")[0] : "User"),
    is_admin: isAdminEmail(email),
    is_paid: isAdminEmail(email),
    access_granted: true,
    auth_provider: path.includes("google") ? "google" : "email",
  };
  state.user = user;
  localStorage.setItem("lojik_public_user", JSON.stringify(user));
  refreshAuth();
  if (state.currentData) { renderAll(state.currentData); }
  if (state.pendingTicker) { const t = state.pendingTicker; state.pendingTicker = null; closeModal("authModal"); loadTickerData(t); }
  else { closeModal("authModal"); }
  return { authenticated: true, user };
}

// Auth modal handlers
const loginBtn = $("loginBtn");
if (loginBtn) loginBtn.addEventListener("click", async () => {
  try {
    await postAuth("/api/auth/login", { email: $("authEmail").value, password: $("authPassword").value });
    const m = $("authMsg"); if (m) m.textContent = "";
  } catch (e) { const m = $("authMsg"); if (m) m.textContent = e.message; }
});
const registerBtn = $("registerBtn");
if (registerBtn) registerBtn.addEventListener("click", async () => {
  try {
    await postAuth("/api/auth/register", { email: $("authEmail").value, name: $("authName").value, password: $("authPassword").value });
    const m = $("authMsg"); if (m) m.textContent = "";
  } catch (e) { const m = $("authMsg"); if (m) m.textContent = e.message; }
});
const googleBtn = $("googleBtn");
if (googleBtn) googleBtn.addEventListener("click", async () => {
  const email = prompt("Enter your Google email:");
  if (!email) return;
  const name = prompt("Enter your name:") || email.split("@")[0];
  try {
    await postAuth("/api/auth/google", { email, name });
    const m = $("authMsg"); if (m) m.textContent = "";
  } catch (e) { const m = $("authMsg"); if (m) m.textContent = e.message; }
});
const adminQuick = $("adminQuickLoginBtn");
if (adminQuick) adminQuick.addEventListener("click", async () => {
  const em = $("authEmail"); if (em) em.value = "dr.timothysuraj@gmail.com";
  const pw = $("authPass"); if (pw) pw.value = "Loginme1";
  try {
    await postAuth("/api/auth/login", { email: "dr.timothysuraj@gmail.com", password: $("authPass")?.value || "Loginme1" });
    const m = $("authMsg"); if (m) m.textContent = "";
  } catch (e) { const m = $("authMsg"); if (m) m.textContent = e.message; }
});

// Free showcase gate
const FREE_SHOWCASE = ["ITC", "AAPL"];
function isFreeShowcase(t) { return FREE_SHOWCASE.includes(String(t).toUpperCase()); }
function requireAuthFor(ticker) {
  return false;
}

// Load ticker data
async function loadTickerData(ticker) {
  ticker = String(ticker || "").trim();
  if (!ticker) return;
  const upper = ticker.toUpperCase();
  // normalize to index ticker if possible
  const idx = getIndex() || await ensureIndex();
  let resolved = ticker;
  if (idx && idx.tickers) {
    const found = idx.tickers.find(r => String(r.ticker).toUpperCase() === upper);
    if (found) resolved = found.ticker;
  }
  if (requireAuthFor(resolved)) {
    state.pendingTicker = resolved;
    openModal("authModal");
    return;
  }
  if (state.cache[resolved]) { renderAll(state.cache[resolved]); return; }
  // embedded payload
  if (idx && idx.payloads && idx.payloads[resolved]) {
    state.cache[resolved] = idx.payloads[resolved];
    renderAll(state.cache[resolved]);
    return;
  }
  // per-ticker json
  const safeFile = (idx && idx.safe_filename && idx.safe_filename[resolved]) ? idx.safe_filename[resolved] : (resolved.replace(/\s+/g, "_") + ".json");
  for (const base of dataBases()) {
    try {
      const r = await fetch(`${base}/tickers/${safeFile}`);
      if (r.ok) {
        const d = await r.json();
        state.cache[resolved] = d;
        renderAll(d);
        return;
      }
    } catch (e) {}
  }
  // Flask fallback
  try {
    const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: resolved, market: state.market }) });
    if (r.status === 401) { state.pendingTicker = resolved; openModal("authModal"); return; }
    if (r.ok) {
      const d = await r.json();
      state.cache[resolved] = d;
      renderAll(d);
      return;
    }
  } catch (e) {}
  console.warn("Could not load ticker", resolved);
}

// ---------- Score ring / speedo (reuse) ----------
const SCORE_SEGMENTS = 23;
const SCORE_SLOT = 360 / SCORE_SEGMENTS;
const SCORE_SEG_ANG = 12.5;
function tierForIndex(i) { const n = i + 1; if (n >= 17) return "emerald"; if (n >= 12) return "amber"; return "coral"; }
function initScoreRing() {
  const svg = $("scoreRingSvg"); if (!svg) return;
  svg.innerHTML = "";
  const defs = svgEl("defs");
  const gEmerald = svgEl("linearGradient"); gEmerald.id = "gradEmerald"; gEmerald.setAttribute("x1","0%"); gEmerald.setAttribute("y1","0%"); gEmerald.setAttribute("x2","100%"); gEmerald.setAttribute("y2","100%");
  [["#30D158","0%"],["#00C7BE","100%"]].forEach(([c,o])=>{const s=svgEl("stop");s.setAttribute("offset",o);s.setAttribute("stop-color",c);gEmerald.appendChild(s);});
  const gAmber = svgEl("linearGradient"); gAmber.id = "gradAmber"; gAmber.setAttribute("x1","0%"); gAmber.setAttribute("y1","0%"); gAmber.setAttribute("x2","100%"); gAmber.setAttribute("y2","100%");
  [["#FF9F0A","0%"],["#FFD60A","100%"]].forEach(([c,o])=>{const s=svgEl("stop");s.setAttribute("offset",o);s.setAttribute("stop-color",c);gAmber.appendChild(s);});
  const gCoral = svgEl("linearGradient"); gCoral.id = "gradCoral"; gCoral.setAttribute("x1","0%"); gCoral.setAttribute("y1","0%"); gCoral.setAttribute("x2","100%"); gCoral.setAttribute("y2","100%");
  [["#FF453A","0%"],["#FF6961","100%"]].forEach(([c,o])=>{const s=svgEl("stop");s.setAttribute("offset",o);s.setAttribute("stop-color",c);gCoral.appendChild(s);});
  defs.appendChild(gEmerald); defs.appendChild(gAmber); defs.appendChild(gCoral);
  const filter = svgEl("filter"); filter.id = "glow-score"; filter.setAttribute("x","-50%"); filter.setAttribute("y","-50%"); filter.setAttribute("width","200%"); filter.setAttribute("height","200%");
  const fe = svgEl("feGaussianBlur"); fe.setAttribute("stdDeviation","3"); fe.setAttribute("result","coloredBlur");
  const feMerge = svgEl("feMerge"); const n1 = svgEl("feMergeNode"); n1.setAttribute("in","coloredBlur"); const n2 = svgEl("feMergeNode"); n2.setAttribute("in","SourceGraphic"); feMerge.appendChild(n1); feMerge.appendChild(n2);
  filter.appendChild(fe); filter.appendChild(feMerge); defs.appendChild(filter);
  svg.appendChild(defs);
  const g = svgEl("g");
  for (let i = 0; i < SCORE_SEGMENTS; i++) {
    const start = -90 + i * SCORE_SLOT;
    const end = start + SCORE_SEG_ANG;
    const path = svgEl("path");
    path.setAttribute("d", arcPath(140, 140, 104, start, end));
    path.setAttribute("fill", "none");
    path.classList.add("jewel-seg");
    path.dataset.index = i;
    path.dataset.tier = tierForIndex(i);
    path.style.transitionDelay = `${i * 28}ms`;
    g.appendChild(path);
  }
  svg.appendChild(g);
}
function updateScoreRing(earned) {
  const svg = $("scoreRingSvg"); if (!svg) return;
  svg.querySelectorAll(".jewel-seg").forEach((seg, i) => {
    if (i < earned) {
      const tier = seg.getAttribute("data-tier");
      const grad = tier === "emerald" ? "url(#gradEmerald)" : tier === "amber" ? "url(#gradAmber)" : "url(#gradCoral)";
      seg.setAttribute("stroke", grad);
      seg.setAttribute("filter", "url(#glow-score)");
      seg.classList.add("lit");
    } else {
      seg.setAttribute("stroke", "rgba(148,163,184,0.28)");
      seg.classList.remove("lit");
      seg.setAttribute("filter", "none");
    }
    seg.style.transitionDelay = `${i * 28}ms`;
  });
  const sv = $("scoreValue"); if (sv) sv.textContent = isAdminUser() ? `${earned} / 23` : `${Math.round(earned / 23 * 100)} / 100`;
  document.querySelectorAll("#scorePills .tier-pill").forEach(pill => {
    const range = pill.dataset.range;
    let active = false;
    if (range === "0-11") active = earned <= 11;
    else if (range === "12-16") active = earned >= 12 && earned <= 16;
    else if (range === "17-23") active = earned >= 17;
    pill.classList.toggle("active", active);
  });
  const band = earned >= 17 ? "High Historical Consistency" : earned >= 12 ? "Moderate Historical Consistency" : "Developing Consistency";
  const sb = $("scoreBand"); if (sb) sb.textContent = band;
  const se = $("scoreExplain"); if (se) se.textContent = isAdminUser() ? (earned >= 17 ? `This company passed ${earned} out of our 23 strict 10-year financial durability tests.` : earned >= 12 ? `A mixed record: strong in ${earned} of 23 years.` : `Fragile: only ${earned} strong years out of 23.`) : (earned >= 17 ? "Demonstrates elite multi-year earnings durability, capital efficiency, and balance-sheet resilience." : earned >= 12 ? "Demonstrates moderate multi-cycle consistency with selective operating variability." : "Exhibits elevated cyclicality or structural earnings variability across market cycles.");
}

const ZONES = [
  { name: "Extreme Fear", color: "#FF3B30", start: -180, end: -136.5, range: [0, 25] },
  { name: "Fear", color: "#FF9500", start: -133.5, end: -100.5, range: [25, 45] },
  { name: "Neutral", color: "#FFCC00", start: -97.5, end: -82.5, range: [45, 55] },
  { name: "Greed", color: "#34C759", start: -79.5, end: -46.5, range: [55, 75] },
  { name: "Extreme Greed", color: "#00C7BE", start: -43.5, end: 0, range: [75, 100] },
];
function zoneForScore(score) {
  if (score <= 24) return "Extreme Fear";
  if (score <= 44) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 75) return "Greed";
  return "Extreme Greed";
}
function initSpeedo() {
  const svg = $("speedoSvg"); if (!svg) return;
  svg.innerHTML = "";
  const defs = svgEl("defs");
  const ng = svgEl("linearGradient"); ng.id = "needleGrad"; ng.setAttribute("x1","0%"); ng.setAttribute("y1","0%"); ng.setAttribute("x2","0%"); ng.setAttribute("y2","100%");
  [["#e8ecf4","0%"],["#8a93a6","100%"]].forEach(([c,o])=>{const s=svgEl("stop");s.setAttribute("offset",o);s.setAttribute("stop-color",c);ng.appendChild(s);});
  defs.appendChild(ng);
  const hg = svgEl("radialGradient"); hg.id = "hubGrad"; hg.setAttribute("cx","50%"); hg.setAttribute("cy","40%");
  [["#e8ecf4","0%"],["#4a5160","100%"]].forEach(([c,o])=>{const s=svgEl("stop");s.setAttribute("offset",o);s.setAttribute("stop-color",c);hg.appendChild(s);});
  defs.appendChild(hg);
  const filter = svgEl("filter"); filter.id = "glow-speedo"; filter.setAttribute("x","-50%"); filter.setAttribute("y","-50%"); filter.setAttribute("width","200%"); filter.setAttribute("height","200%");
  const fe = svgEl("feGaussianBlur"); fe.setAttribute("stdDeviation","4"); fe.setAttribute("result","b");
  const m = svgEl("feMerge"); const n1=svgEl("feMergeNode"); n1.setAttribute("in","b"); const n2=svgEl("feMergeNode"); n2.setAttribute("in","SourceGraphic"); m.appendChild(n1); m.appendChild(n2);
  filter.appendChild(fe); filter.appendChild(m); defs.appendChild(filter);
  svg.appendChild(defs);
  ZONES.forEach(z => {
    const path = svgEl("path");
    path.setAttribute("d", arcPath(180, 170, 122, z.start, z.end));
    path.setAttribute("fill", "none"); path.setAttribute("stroke", z.color);
    path.classList.add("zone-arc"); path.dataset.zone = z.name;
    svg.appendChild(path);
  });
  const glow = svgEl("path"); glow.id = "speedoActiveGlow"; glow.setAttribute("fill", "none"); glow.classList.add("speedo-active-glow"); svg.appendChild(glow);
  [0,25,45,55,75,100].forEach(s => {
    const ang = -180 + (s/100)*180;
    const [x1,y1] = polar(180,170,108,ang);
    const [x2,y2] = polar(180,170,136,ang);
    const line = svgEl("line"); line.setAttribute("x1",x1); line.setAttribute("y1",y1); line.setAttribute("x2",x2); line.setAttribute("y2",y2); line.classList.add("speedo-tick"); svg.appendChild(line);
    const [lx,ly] = polar(180,170,148,ang);
    const text = svgEl("text"); text.setAttribute("x",lx); text.setAttribute("y",ly+4); text.classList.add("speedo-tick-label"); text.textContent = s; svg.appendChild(text);
  });
  ZONES.forEach(z => {
    const mid = (z.start + z.end) / 2;
    const [x,y] = polar(180,170,95,mid);
    const text = svgEl("text"); text.setAttribute("x",x); text.setAttribute("y",y); text.setAttribute("transform", `rotate(${mid+90}, ${x}, ${y})`); text.classList.add("speedo-zone-label"); text.textContent = z.name.toUpperCase(); svg.appendChild(text);
  });
  const g = svgEl("g"); g.id = "speedoNeedleGroup"; g.setAttribute("transform", "rotate(-90 180 170)");
  const tail = svgEl("polygon"); tail.setAttribute("points", "178,170 182,170 181,188 179,188"); tail.classList.add("needle-tail"); g.appendChild(tail);
  const body = svgEl("polygon"); body.setAttribute("points", "174,170 186,170 181.5,56 178.5,56"); body.classList.add("needle-body"); g.appendChild(body);
  const tip = svgEl("circle"); tip.setAttribute("cx","180"); tip.setAttribute("cy","56"); tip.setAttribute("r","3.5"); tip.classList.add("needle-tip"); g.appendChild(tip);
  const hubOuter = svgEl("circle"); hubOuter.setAttribute("cx","180"); hubOuter.setAttribute("cy","170"); hubOuter.setAttribute("r","16"); hubOuter.classList.add("hub-outer"); g.appendChild(hubOuter);
  const hubInner = svgEl("circle"); hubInner.setAttribute("cx","180"); hubInner.setAttribute("cy","170"); hubInner.setAttribute("r","7"); hubInner.classList.add("hub-inner"); g.appendChild(hubInner);
  svg.appendChild(g);
}
function updateSpeedo(score) {
  const ng = $("speedoNeedleGroup"); if (ng) ng.setAttribute("transform", `rotate(${-90 + (score / 100) * 180} 180 170)`);
  const zoneName = zoneForScore(score);
  const zone = ZONES.find(z => z.name === zoneName);
  const glow = $("speedoActiveGlow");
  if (zone && glow) { glow.setAttribute("d", arcPath(180, 170, 122, zone.start, zone.end)); glow.setAttribute("stroke", zone.color); }
  const mv = $("moodValue"); if (mv) mv.textContent = score;
  const mz = $("moodZone"); if (mz) mz.textContent = zoneName + " Zone";
  document.querySelectorAll("#zonePills .zone-pill").forEach(pill => { pill.classList.toggle("active", pill.dataset.zone === zoneName); });
  const me = $("moodExplain"); if (me) me.textContent = score <= 24 ? "Extreme fear." : score <= 44 ? "Fear dominates." : score <= 55 ? "Neutral." : score <= 75 ? "Greed creeping in." : "Extreme greed.";
}

function slicePriceHistory(ph, tf) {
  tf = tf || "Max";
  if (!Array.isArray(ph) || ph.length === 0) return [];
  const last = ph[ph.length - 1];
  const lastDate = new Date(String(last.d).slice(0, 10) + "T00:00:00");
  let cutoff = null;
  if (tf === "1M") cutoff = new Date(lastDate.getTime() - 30 * 86400000);
  else if (tf === "6M") cutoff = new Date(lastDate.getTime() - 183 * 86400000);
  else if (tf === "YTD") cutoff = new Date(lastDate.getFullYear(), 0, 1);
  else if (tf === "1Y") cutoff = new Date(lastDate.getTime() - 365 * 86400000);
  else if (tf === "5Y") cutoff = new Date(lastDate.getTime() - 5 * 365 * 86400000);
  else cutoff = null;
  let out = ph;
  if (cutoff) {
    out = ph.filter(pt => {
      const dt = new Date(String(pt.d).slice(0, 10) + "T00:00:00");
      return !isNaN(dt.getTime()) && dt >= cutoff;
    });
  }
  if (out.length < 2) {
    // fallback to point counts
    const n = ph.length;
    let cnt = n;
    if (tf === "1M") cnt = Math.min(n, 22);
    else if (tf === "6M") cnt = Math.min(n, 126);
    else if (tf === "1Y") cnt = Math.min(n, 252);
    else if (tf === "5Y") cnt = Math.min(n, n);
    out = ph.slice(n - cnt);
  }
  return out.slice();
}

function gfFormatDate(dstr, longSpan) {
  const dt = new Date(String(dstr).slice(0, 10) + "T00:00:00");
  if (isNaN(dt.getTime())) return String(dstr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (longSpan) return String(dt.getFullYear());
  return months[dt.getMonth()] + " " + dt.getDate();
}

function renderGfChartInto(svg, container, d, tf) {
  const _gb = document.getElementById('gfReturnBadge'); if (_gb) _gb.textContent = '';

  tf = tf || "Max";
  if (!svg) return;
  container = container || svg.parentElement;
  let ph = (d && d.hev && Array.isArray(d.hev.price_history)) ? d.hev.price_history
            : (Array.isArray(d) ? d : []);
  if (!ph || ph.length < 2) {
    const ps = (d && Array.isArray(d.price_series)) ? d.price_series : [];
    if (ps && ps.length) {
      const now = new Date();
      ph = ps.map((v, i) => {
        const dt = new Date(now.getFullYear(), now.getMonth() - (ps.length - 1 - i), 1);
        const val = (typeof v === 'object' && v !== null) ? (v.value ?? v.close ?? v.price ?? 0) : v;
        return { p: val, d: dt.toISOString().slice(0,10) };
      });
    }
  }
  const series = slicePriceHistory(ph, tf);
  svg.innerHTML = "";
  if (!series || series.length < 2) return;

  const w = 720, h = 220, padL = 46, padR = 12, padT = 16, padB = 30;
  const prices = series.map(p => Number(p.p));
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const spanP = (maxP - minP) || 1;
  const n = series.length;
  const first = prices[0], last = prices[prices.length - 1];
  const up = last >= first;
  const stroke = up ? "#16a34a" : "#dc2626";
  const fillStart = up ? "rgba(22,163,74,0.22)" : "rgba(220,38,38,0.20)";
  const fillEnd = up ? "rgba(22,163,74,0.0)" : "rgba(220,38,38,0.0)";
  const gradId = "gfAreaGrad_" + (up ? "up" : "down");

  const pts = series.map((pt, i) => ({
    x: padL + (i / (n - 1)) * (w - padL - padR),
    y: padT + (h - padT - padB) - ((Number(pt.p) - minP) / spanP) * (h - padT - padB),
    p: Number(pt.p), d: pt.d
  }));

  // defs gradient
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient"); grad.id = gradId; grad.setAttribute("x1","0%"); grad.setAttribute("y1","0%"); grad.setAttribute("x2","0%"); grad.setAttribute("y2","100%");
  const s1 = svgEl("stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color", fillStart); s1.setAttribute("stop-opacity","1");
  const s2 = svgEl("stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color", fillEnd); s2.setAttribute("stop-opacity","1");
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

  // gridlines (4)
  for (let i = 0; i < 4; i++) {
    const frac = i / 3;
    const y = padT + (h - padT - padB) * (1 - frac);
    const val = minP + spanP * frac;
    const line = svgEl("line"); line.setAttribute("x1", padL); line.setAttribute("x2", w - padR); line.setAttribute("y1", y.toFixed(1)); line.setAttribute("y2", y.toFixed(1));
    line.setAttribute("stroke", "rgba(127,127,127,0.25)"); line.setAttribute("stroke-width", "1"); line.setAttribute("stroke-dasharray", "3 3");
    svg.appendChild(line);
    const lbl = svgEl("text"); lbl.setAttribute("x", 8); lbl.setAttribute("y", (y + 4).toFixed(1)); lbl.setAttribute("font-size", "10"); lbl.setAttribute("fill", "var(--muted)");
    lbl.textContent = Number(val).toFixed(0);
    svg.appendChild(lbl);
  }

  // area + line
  const lineD = pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaD = `M ${pts[0].x.toFixed(1)},${(h - padB).toFixed(1)} ` + pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + ` L ${pts[pts.length-1].x.toFixed(1)},${(h-padB).toFixed(1)} Z`;
  const areaPath = svgEl("path"); areaPath.setAttribute("d", areaD); areaPath.setAttribute("fill", "url(#" + gradId + ")"); svg.appendChild(areaPath);
  const linePath = svgEl("path"); linePath.setAttribute("d", lineD); linePath.setAttribute("fill", "none"); linePath.setAttribute("stroke", stroke); linePath.setAttribute("stroke-width", "2.2"); linePath.setAttribute("stroke-linecap", "round"); linePath.setAttribute("stroke-linejoin", "round"); svg.appendChild(linePath);

  // bottom date labels (4-5)
  const longSpan = (new Date(String(series[series.length-1].d).slice(0,10)) - new Date(String(series[0].d).slice(0,10))) > 365*86400000;
  const idxs = [0, Math.floor(n*0.25), Math.floor(n*0.5), Math.floor(n*0.75), n-1];
  const seen = new Set();
  idxs.forEach(i => {
    if (i < 0 || i >= n || seen.has(i)) return; seen.add(i);
    const p = pts[i];
    const t = svgEl("text"); t.setAttribute("x", p.x.toFixed(1)); t.setAttribute("y", (h - 6).toFixed(1)); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "10"); t.setAttribute("fill", "var(--muted)");
    t.textContent = gfFormatDate(series[i].d, longSpan);
    svg.appendChild(t);
  });

  // crosshair elements
  const cross = svgEl("line"); cross.setAttribute("class", "gf-crosshair"); cross.setAttribute("x1", "0"); cross.setAttribute("x2", "0"); cross.setAttribute("y1", String(padT)); cross.setAttribute("y2", String(h - padB)); cross.setAttribute("stroke", "rgba(127,127,127,0.6)"); cross.setAttribute("stroke-width", "1"); cross.setAttribute("stroke-dasharray", "4 3"); cross.style.display = "none"; svg.appendChild(cross);
  const dot = svgEl("circle"); dot.setAttribute("class", "gf-dot"); dot.setAttribute("r", "4"); dot.setAttribute("fill", stroke); dot.style.display = "none"; svg.appendChild(dot);

  // floating pill (div sibling)
  if (!container) { /* noop */ }
  let pill = container ? container.querySelector(".gf-pill") : null;
  if (!pill && container) { pill = document.createElement("div"); pill.className = "gf-pill"; pill.style.cssText = "position:absolute;pointer-events:none;display:none;padding:4px 8px;border-radius:6px;background:rgba(20,24,36,0.92);color:#fff;font-size:11px;"; container.style.position = container.style.position || "relative"; container.appendChild(pill); }
  const cur = d && d.currency ? d.currency : "INR";

  function showAt(clientX) {
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const rel = (x - padL) / (w - padL - padR);
    const idx = Math.round(rel * (n - 1));
    if (idx < 0 || idx >= n) { cross.style.display = "none"; dot.style.display = "none"; if (pill) pill.style.display = "none"; return; }
    const p = pts[idx];
    cross.setAttribute("x1", p.x.toFixed(1)); cross.setAttribute("x2", p.x.toFixed(1)); cross.style.display = "";
    dot.setAttribute("cx", p.x.toFixed(1)); dot.setAttribute("cy", p.y.toFixed(1)); dot.style.display = "";
    const retPct = ((prices[idx] - first) / first * 100).toFixed(1);
    const sign = prices[idx] >= first ? "+" : "";
    if (pill) {
      pill.textContent = `${Number(prices[idx]).toFixed(2)} ${cur} • ${gfFormatDate(series[idx].d, false)}   ${sign}${retPct}% (${tf})`;
      pill.style.display = "block";
      pill.style.left = Math.min(rect.width - 120, Math.max(0, x + 10)) + "px";
      pill.style.top = "4px";
    }
  }
  svg.addEventListener("mousemove", (e) => showAt(e.clientX));
  svg.addEventListener("mouseleave", () => { cross.style.display = "none"; dot.style.display = "none"; if (pill) pill.style.display = "none"; });

  // return badge in header (stripPrice append)
  const badge = document.getElementById("gfReturnBadge");
  const retTotal = ((last - first) / first * 100).toFixed(1);
  const signT = last >= first ? "+" : "";
  if (badge) badge.textContent = `${signT}${retTotal}% (${tf})`;
}

// ---------- Chart renderer for 23 charts ----------
function makeSvg(w, h) {
  const svg = svgEl("svg"); svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); return svg;
}
function renderChartCard(chart) {
  const card = document.createElement("div");
  card.className = "chart-card glass";
  card.dataset.chartId = chart.id;
  card.innerHTML = `<h4>${esc(chart.title)}</h4>`;
  if (chart.id === "c23_trailing_pe") {
    card.classList.add("gf-chart-card");
    const bar = document.createElement("div");
    bar.className = "gf-timeframe-bar";
    ["1M","6M","YTD","1Y","5Y","Max"].forEach((tf, i) => {
      const b = document.createElement("button");
      b.className = "gf-tf-btn timeframe-btn" + (tf === "Max" ? " active" : "");
      b.setAttribute("data-tf", tf);
      b.textContent = tf;
      b.addEventListener("click", function() {
        bar.querySelectorAll(".gf-tf-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        if (state.currentData) renderGfChartInto(svg, card, state.currentData, tf);
      });
      bar.appendChild(b);
    });
    card.appendChild(bar);
    const svg = makeSvg(720, 220);
    svg.classList.add("gf-area");
    svg.setAttribute("viewBox", "0 0 720 220");
    card.appendChild(svg);
    const pill = document.createElement("div");
    pill.className = "gf-pill";
    pill.style.cssText = "position:relative;";
    card.appendChild(pill);
    // initial
    if (state.currentData) renderGfChartInto(svg, card, state.currentData, "Max");
    return card;
  }
  const svg = makeSvg(400, 200);
  const labels = chart.labels || [];
  const series = chart.series || {};
  const type = chart.type;
  const seriesKeys = Object.keys(series);
  const CHART_PALETTE = ["#0071e3", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#6366f1"];
  const colors = seriesKeys.map((sk, i) => CHART_PALETTE[i % CHART_PALETTE.length]);
  function tip(el, label, val) { el.setAttribute("data-tip", `${label}: ${fmt(val, 1)}`); }

  if (type === "pie" || type === "donut") {
    const vals = series[seriesKeys[0]] || [];
    const total = vals.reduce((a, b) => a + (b || 0), 0) || 1;
    let ang = -90;
    const cx = 100, cy = 100, r = 80;
    vals.forEach((v, i) => {
      const slice = (v / total) * 360;
      const path = svgEl("path");
      const [x1, y1] = polar(cx, cy, r, ang);
      const [x2, y2] = polar(cx, cy, r, ang + slice);
      const large = slice > 180 ? 1 : 0;
      path.setAttribute("d", `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`);
      const col = CHART_PALETTE[i % CHART_PALETTE.length];
      path.setAttribute("fill", col); path.setAttribute("stroke", "var(--bg)"); path.setAttribute("stroke-width", "1");
      tip(path, labels[i] || ("Slice " + (i + 1)), v);
      svg.appendChild(path);
      ang += slice;
    });
    if (type === "donut") {
      const hole = svgEl("circle"); hole.setAttribute("cx", cx); hole.setAttribute("cy", cy); hole.setAttribute("r", 45); hole.setAttribute("fill", "var(--bg)"); svg.appendChild(hole);
    }
    labels.forEach((lab, i) => {
      const vals2 = series[seriesKeys[0]] || [];
      const total2 = vals2.reduce((a, b) => a + (b || 0), 0) || 1;
      const pct = (vals2[i] / total2) * 100;
      const sw = svgEl("rect"); sw.setAttribute("x", 198); sw.setAttribute("y", 12 + i * 14); sw.setAttribute("width", 8); sw.setAttribute("height", 8); sw.setAttribute("fill", CHART_PALETTE[i % CHART_PALETTE.length]); sw.setAttribute("rx", "2"); svg.appendChild(sw);
      const t = svgEl("text"); t.setAttribute("x", 210); t.setAttribute("y", 20 + i * 14); t.setAttribute("font-size", "10"); t.setAttribute("fill", "var(--muted)");
      t.textContent = `${lab}: ${fmt(pct, 1)}%`;
      t.setAttribute("data-tip", `${lab}: ${fmt(pct, 1)}%`);
      svg.appendChild(t);
    });
  } else if (type === "heatmap") {
    const rows = seriesKeys;
    const cols = labels;
    const cellW = 360 / cols.length;
    const cellH = 160 / rows.length;
    const allVals = rows.flatMap(k => series[k]);
    const min = Math.min(...allVals), max = Math.max(...allVals);
    rows.forEach((rk, ri) => {
      cols.forEach((cl, ci) => {
        const v = series[rk][ci];
        const t = (v - min) / (max - min || 1);
        const rect = svgEl("rect");
        rect.setAttribute("x", 20 + ci * cellW);
        rect.setAttribute("y", 20 + ri * cellH);
        rect.setAttribute("width", cellW - 2);
        rect.setAttribute("height", cellH - 2);
        rect.setAttribute("fill", `rgba(77,163,255,${0.2 + t * 0.7})`);
        rect.setAttribute("rx", "4");
        tip(rect, rk + " / " + cl, v);
        svg.appendChild(rect);
        const txt = svgEl("text"); txt.setAttribute("x", 20 + ci * cellW + cellW / 2); txt.setAttribute("y", 20 + ri * cellH + cellH / 2 + 4);
        txt.setAttribute("text-anchor", "middle"); txt.setAttribute("font-size", "9"); txt.setAttribute("fill", "var(--text)");
        txt.textContent = typeof v === "number" ? v.toFixed(0) : v;
        svg.appendChild(txt);
      });
    });
    cols.forEach((cl, ci) => {
      const t = svgEl("text"); t.setAttribute("x", 20 + ci * cellW + cellW / 2); t.setAttribute("y", 195);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "8"); t.setAttribute("fill", "var(--muted)");
      t.textContent = String(cl).slice(0, 16);
      t.setAttribute("data-tip", String(cl));
      svg.appendChild(t);
    });
    rows.forEach((rk, ri) => {
      const t = svgEl("text"); t.setAttribute("x", 10); t.setAttribute("y", 20 + ri * cellH + cellH / 2 + 4);
      t.setAttribute("font-size", "8"); t.setAttribute("fill", "var(--muted)");
      t.textContent = String(rk).slice(0, 16);
      t.setAttribute("data-tip", String(rk));
      svg.appendChild(t);
    });
  } else if (type === "treemap") {
    const vals = series[seriesKeys[0]] || [];
    const total = vals.reduce((a, b) => a + (b || 0), 0) || 1;
    let cy = 10;
    vals.forEach((v, i) => {
      const area = (v / total) * (380 * 180);
      const bh = Math.max(12, area / 380);
      const rect = svgEl("rect");
      rect.setAttribute("x", 10); rect.setAttribute("y", cy);
      rect.setAttribute("width", 380); rect.setAttribute("height", bh);
      rect.setAttribute("fill", `hsl(${i * 60 + 200}, 55%, 50%)`);
      rect.setAttribute("stroke", "var(--bg)"); rect.setAttribute("stroke-width", "2");
      tip(rect, labels[i] || ("Block " + (i + 1)), v);
      svg.appendChild(rect);
      const t = svgEl("text"); t.setAttribute("x", 16); t.setAttribute("y", cy + 14);
      t.setAttribute("font-size", "10"); t.setAttribute("fill", "#fff");
      t.textContent = `${labels[i]} (${v}%)`;
      t.setAttribute("data-tip", `${labels[i]}: ${v}%`);
      svg.appendChild(t);
      cy += bh;
    });
  } else if (type === "radar") {
    const vals = series[seriesKeys[0]] || [];
    const n = vals.length;
    const cx = 100, cy = 100, r = 80;
    for (let lvl = 1; lvl <= 4; lvl++) {
      const rr = (r * lvl) / 4;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const ang = -90 + (i / n) * 360;
        pts.push(polar(cx, cy, rr, ang));
      }
      const poly = svgEl("polygon");
      poly.setAttribute("points", pts.map(p => p.join(",")).join(" "));
      poly.setAttribute("fill", "none"); poly.setAttribute("stroke", "rgba(148,163,184,0.3)"); poly.setAttribute("stroke-width", "1");
      svg.appendChild(poly);
    }
    const pts = [];
    vals.forEach((v, i) => {
      const rr = r * ((v || 0) / 100);
      const ang = -90 + (i / n) * 360;
      pts.push(polar(cx, cy, rr, ang));
    });
    const poly = svgEl("polygon");
    poly.setAttribute("points", pts.map(p => p.join(",")).join(" "));
    poly.setAttribute("fill", "rgba(77,163,255,0.25)"); poly.setAttribute("stroke", "#4da3ff"); poly.setAttribute("stroke-width", "2");
    svg.appendChild(poly);
    pts.forEach((p, i) => {
      const c = svgEl("circle"); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", "3"); c.setAttribute("fill", "#4da3ff");
      tip(c, labels[i] || ("Axis " + (i + 1)), vals[i]);
      svg.appendChild(c);
    });
    labels.forEach((lab, i) => {
      const ang = -90 + (i / n) * 360;
      const [x, y] = polar(cx, cy, r + 12, ang);
      const t = svgEl("text"); t.setAttribute("x", x); t.setAttribute("y", y + 3);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "8"); t.setAttribute("fill", "var(--muted)");
      t.textContent = String(lab).slice(0, 16);
      t.setAttribute("data-tip", String(lab));
      svg.appendChild(t);
    });
  } else if (type === "waterfall") {
    const vals = series[seriesKeys[0]] || [];
    const max = Math.max(...vals.map(v => Math.abs(v))) || 1;
    const barW = 360 / vals.length;
    let cum = 0;
    // gridlines
    [0,0.5,1].forEach(f=>{
      const y=170 - f*150;
      const line=svgEl("line"); line.setAttribute("x1",20); line.setAttribute("y1",y); line.setAttribute("x2",380); line.setAttribute("y2",y); line.setAttribute("stroke","rgba(148,163,184,0.25)"); svg.appendChild(line);
    });
    vals.forEach((v, i) => {
      const hBar = (Math.abs(v) / (max || 1)) * 150;
      const rect = svgEl("rect");
      rect.setAttribute("x", 20 + i * barW + 4);
      rect.setAttribute("y", v >= 0 ? 170 - cum - hBar : 170 - cum);
      rect.setAttribute("width", barW - 8);
      rect.setAttribute("height", hBar);
      rect.setAttribute("fill", v >= 0 ? "#30d158" : "#ff453a");
      rect.setAttribute("rx", "4");
      tip(rect, labels[i] || ("Step " + (i + 1)), v);
      svg.appendChild(rect);
      const vt=svgEl("text"); vt.setAttribute("x",20+i*barW+barW/2); vt.setAttribute("y",(v>=0?170-cum-hBar:170-cum)-2); vt.setAttribute("text-anchor","middle"); vt.setAttribute("font-size","8"); vt.setAttribute("fill","var(--text)"); vt.textContent=fmt(v,1); svg.appendChild(vt);
      cum += v;
    });
    labels.forEach((lab, i) => {
      const t = svgEl("text"); t.setAttribute("x", 20 + i * barW + barW / 2); t.setAttribute("y", 195);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "8"); t.setAttribute("fill", "var(--muted)");
      t.textContent = String(lab).slice(0, 16);
      t.setAttribute("data-tip", String(lab));
      svg.appendChild(t);
    });
  } else {
    const isBar = type.includes("bar");
    const isLine = type.includes("line");
    const allVals = seriesKeys.flatMap(k => (type === "bar_line" && String(k).endsWith("_pct")) ? [] : (series[k] || [])).map(v => Math.abs(v || 0));
    const max = Math.max(...allVals) || 1;
    const min = Math.min(...allVals) || 0;
    [0,0.5,1].forEach(f=>{
      const y=170 - f*150;
      const line=svgEl("line"); line.setAttribute("x1",20); line.setAttribute("y1",y); line.setAttribute("x2",380); line.setAttribute("y2",y); line.setAttribute("stroke","rgba(148,163,184,0.25)"); svg.appendChild(line);
      const tl=svgEl("text"); tl.setAttribute("x",10); tl.setAttribute("y",y+4); tl.setAttribute("font-size","8"); tl.setAttribute("fill","var(--muted)"); tl.setAttribute("text-anchor","end"); tl.textContent=fmt(min+(max-min)*f,1); svg.appendChild(tl);
    });
    if (isBar) {
      const nSeries = seriesKeys.length;
      const groupW = 360 / labels.length;
      const barW = groupW / (nSeries + 1);
      seriesKeys.forEach((sk, si) => {
        if (type === "bar_line" && String(sk).endsWith("_pct")) return;
        const vals = series[sk] || [];
        vals.forEach((v, i) => {
          const hBar = (Math.abs(v || 0) / max) * 150;
          const rect = svgEl("rect");
          rect.setAttribute("x", 20 + i * groupW + si * barW);
          rect.setAttribute("y", 170 - hBar);
          rect.setAttribute("width", Math.max(2, barW - 2));
          rect.setAttribute("height", hBar);
          rect.setAttribute("fill", CHART_PALETTE[si % CHART_PALETTE.length]);
          rect.setAttribute("rx", "2");
          tip(rect, (labels[i] || "") + " • " + humanSeriesLabel(sk), v);
          svg.appendChild(rect);
          const vt=svgEl("text"); vt.setAttribute("x",20+i*groupW+si*barW+barW/2); vt.setAttribute("y",170-hBar-2); vt.setAttribute("text-anchor","middle"); vt.setAttribute("font-size","8"); vt.setAttribute("fill","var(--text)"); vt.textContent=fmt(v,1); svg.appendChild(vt);
        });
      });
    }
         if (isLine || type === "bar_line") {
       seriesKeys.forEach((sk, si) => {
         if (isBar && type !== "bar_line" && !type.includes("line")) return;
         const vals = series[sk] || [];
         const isPct = (type === "bar_line" && String(sk).endsWith("_pct"));
         let pctMin = 0, pctMax = 1;
         if (isPct) {
           const nums = vals.map(v => (v == null ? 0 : v));
           pctMin = Math.min(...nums);
           pctMax = Math.max(...nums);
         }
         const pts = vals.map((v, i) => {
           const x = 20 + (i / (vals.length - 1 || 1)) * 360;
           let y;
           if (isPct) {
             const range = Math.max(pctMax - pctMin, 1);
             y = 30 + (1 - (((v == null ? 0 : v) - pctMin) / range)) * 130;
           } else {
             y = 170 - ((v || 0) / max) * 150;
           }
           return [x, y];
         });
         if (pts.length > 1) {
           const poly = svgEl("polyline");
           poly.setAttribute("points", pts.map(p => p.join(",")).join(" "));
           poly.setAttribute("fill", "none");
           const col = CHART_PALETTE[si % CHART_PALETTE.length];
           poly.setAttribute("stroke", col);
           poly.setAttribute("stroke-width", "2");
           svg.appendChild(poly);
           pts.forEach((p, i) => {
             const c = svgEl("circle"); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", "3"); c.setAttribute("fill", col);
             tip(c, (labels[i] || "") + " • " + humanSeriesLabel(sk), vals[i]);
             svg.appendChild(c);
             if (isPct) {
               const labt = svgEl("text"); labt.setAttribute("x", p[0]); labt.setAttribute("y", p[1] - 6); labt.setAttribute("text-anchor", "middle"); labt.setAttribute("font-size", "8"); labt.setAttribute("fill", "var(--text)");
               labt.textContent = fmt(vals[i], 1) + "%";
               svg.appendChild(labt);
             }
           });
         }
       });
     }
    labels.forEach((lab, i) => {
      if (i % Math.ceil(labels.length / 6) !== 0) return;
      const t = svgEl("text"); t.setAttribute("x", 20 + (i / (labels.length - 1 || 1)) * 360);
      t.setAttribute("y", 195); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "8"); t.setAttribute("fill", "var(--muted)");
      t.textContent = String(lab).slice(0, 16);
      t.setAttribute("data-tip", String(lab));
      svg.appendChild(t);
    });
  }

  card.appendChild(svg);
  if (type !== "pie" && type !== "donut") {
    const legend = document.createElement("div");
    legend.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:10px;color:var(--muted);";
    seriesKeys.forEach((sk, i) => {
      const span = document.createElement("span");
      span.className = "chart-legend-item";
      const col = CHART_PALETTE[i % CHART_PALETTE.length];
      span.innerHTML = `<i style="background:${col};margin-right:4px"></i>${esc(humanSeriesLabel(sk))}`;
      legend.appendChild(span);
    });
    card.appendChild(legend);
  }
  if (chart.note) {
    const note = document.createElement("div");
    note.className = "chart-note";
    note.style.cssText = "margin-top:8px;font-size:11px;color:var(--muted);";
    note.textContent = chart.note;
    card.appendChild(note);
  }
  return card;
}


// Floating chart tooltip
function ensureFloatingTip(){ if(document.getElementById("chartFloatingTip")) return; const tip=document.createElement("div"); tip.id="chartFloatingTip"; tip.style.cssText="position:fixed;pointer-events:none;display:none;padding:6px 10px;border-radius:8px;background:rgba(20,24,36,0.92);color:#fff;font-size:12px;z-index:9999;max-width:260px;"; (document.body || document.documentElement).appendChild(tip); }
ensureFloatingTip();
document.addEventListener("mouseover", function(e){ const el=e.target; const t=el && el.getAttribute ? el.getAttribute("data-tip") : null; const tip=document.getElementById("chartFloatingTip"); if(tip){ if(t){ tip.textContent=t; tip.style.display="block"; } } });
document.addEventListener("mousemove", function(e){ const tip=document.getElementById("chartFloatingTip"); if(tip && tip.style.display==="block"){ tip.style.left=(e.clientX+12)+"px"; tip.style.top=(e.clientY+12)+"px"; } });
document.addEventListener("mouseout", function(e){ const tip=document.getElementById("chartFloatingTip"); if(tip) tip.style.display="none"; });

// Timeframe button delegation
document.addEventListener("click", function(e) {
  const btn = e.target && e.target.closest ? e.target.closest(".gf-tf-btn") : null;
  if (!btn) return;
  const tf = btn.getAttribute("data-tf");
  if (!tf) return;
  const bar = btn.parentElement;
  if (bar) bar.querySelectorAll(".gf-tf-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (bar && bar.id === "overviewTimeframes") {
    if (state.currentData) renderAreaChart(state.currentData, tf);
  }
  // c23 dashboard card buttons handle their own clicks via listeners
});

function renderAreaChart(d, tf) {
  const svg = $("areaChart");
  if (!svg) return;
  renderGfChartInto(svg, svg.parentElement, d, tf || "Max");
}

// ---------- Render all ----------
function renderAll(d) {
  state.selectedTicker = d.ticker || state.selectedTicker;
  state.currentData = d;
  renderHero(d);
  renderOverview(d);
  renderExecSummary(d);
  renderDashboard(d);
  renderReport(d);
  renderForensic(d);
}

function renderHero(d) {
  const t = d.ticker || state.selectedTicker;
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set("heroCompany", d.company || t);
  set("heroTicker", t);
  set("heroBadge", `${d.market || ""} · ${d.sector || ""}`.trim());
  set("heroQuarter", "2026-Q4");
  set("heroPrice", money(d.currency, d.current_price));
  set("heroLow", money(d.currency, d.low_52w));
  set("heroHigh", money(d.currency, d.high_52w));
  const hev = d.hev || {};
  const val = hev.valuation || {};
  const target = val.triangulated_target_price || d.triangulated_target_price;
  const upside = val.upside_pct !== undefined ? val.upside_pct : d.upside_pct;
  set("heroTarget", money(d.currency, target));
  const upEl = $("heroUpside");
  if (upEl) { upEl.textContent = (upside !== undefined && upside !== null) ? `${Number(upside).toFixed(2)}%` : "—"; upEl.style.color = (upside >= 0) ? "#30d158" : "#ff453a"; }
  const _earned = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
  const _total = (d.quality_score && d.quality_score.total) || 23;
  let _band = "Fair Value Band";
  if (_earned >= 17) _band = isAdminUser() ? ("High Consistency • " + _earned + "/" + _total) : "High Consistency Tier";
else if (_earned >= 12) _band = isAdminUser() ? ("Moderate Consistency • " + _earned + "/" + _total) : "Moderate Consistency Tier";
else _band = isAdminUser() ? ("Developing Consistency • " + _earned + "/" + _total) : "Developing Consistency Tier"
  set("heroRating", _band);
  // range dot
  if (d.low_52w && d.high_52w && d.current_price) {
    const range = d.high_52w - d.low_52w;
    const pos = (d.current_price - d.low_52w) / range;
    const dot = $("heroRangeDot");
    if (dot) dot.style.left = `${Math.max(0, Math.min(100, pos * 100))}%`;
  }
  // strip
  set("stripTitle", `${d.company || t} (${t})`);
  set("stripPrice", money(d.currency, d.current_price));
  set("low52", d.low_52w ? Number(d.low_52w).toLocaleString() : "—");
  set("high52", d.high_52w ? Number(d.high_52w).toLocaleString() : "—");
  if (d.low_52w && d.high_52w && d.current_price) {
    const range = d.high_52w - d.low_52w;
    const pos = (d.current_price - d.low_52w) / range;
    const rd = $("rangeDot"); if (rd) rd.style.left = `${Math.max(0, Math.min(100, pos * 100))}%`;
  }
  renderAreaChart(d, "Max");
}

function renderOverview(d) {
  const th = (d.hev || {}).technicals_hev || {};
  const ts = $('techStrip'); if (ts) { ts.textContent = isAdminUser() ? (th.summary_sentence || "") : ""; ts.style.display = isAdminUser() ? "" : "none"; }
  const me = $('moodExplain'); if (me) me.style.display = isAdminUser() ? "" : "none";

  const earned = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
  updateScoreRing(earned);
  const fg = d.fear_greed || {};
  updateSpeedo(fg.score || 0);
  // company type badge
  const cb = $("companyTypeBadge");
  if (cb) {
    const pts = d.points || [];
    const p51 = pts.find(p => p.id === "p5_1") || pts.find(p => p.id === "p5.1");
    let ct = "—";
    if (p51 && p51.value) {
      const parts = String(p51.value).split(" - ");
      ct = parts.length >= 2 ? (parts[0] + " - " + parts[1]) : parts[0];
    }
    cb.textContent = `Company Type: ${ct}`;
  }
  // tech strip (handled above)
  // HEV valuation card
  const v = (d.hev || {}).valuation || {};
  const t = (id, val) => { const e = $(id); if (e) e.textContent = (val !== undefined && val !== null) ? (typeof val === "number" ? money(d.currency, val) : val) : "—"; };
  t("hvPe", v.pe && v.pe.target_price);
  t("hvPr", v.pr && v.pr.target_price);
  t("hvDcf", v.dcf && v.dcf.target_price);
  t("hvBlended", v.triangulated_target_price);
  t("hvUpside", (v.upside_pct !== undefined ? v.upside_pct : null) !== null ? `${Number(v.upside_pct).toFixed(2)}%` : "—");
   const dcf = v.dcf || {};
   const set = (id, val) => { const e = $(id); if (e) e.textContent = val; };
   set("hvWacc", dcf.wacc != null ? fmt(dcf.wacc, 2) + "%" : "—");
   set("hvTg", dcf.terminal_growth_pct != null ? fmt(dcf.terminal_growth_pct, 1) + "%" : "—");
  const tri = v.triangulation || {};
  t("hvBv", tri.bv_intrinsic_value);
  t("hvEps", tri.eps_intrinsic_value);
  t("hvBond", tri.bond_intrinsic_value);
  // snapshot catalysts/risks
  const qual = (d.hev || {}).qualitative || {};
  const exec = (d.hev || {}).exec_summary || {};
  const cd = qual.catalysts_drivers || {};
  const cats = (exec.drivers_catalysts_box && exec.drivers_catalysts_box.length) ? exec.drivers_catalysts_box : [cd.primary_catalyst, cd.secondary_catalyst, cd.third_catalyst, cd.primary_driver, cd.secondary_driver].filter(Boolean);
   const scEl = $("snapCatalysts"); if (scEl) scEl.innerHTML = cats.slice(0, 3).map(c => '<div class="cat-item">• ' + esc(c) + '</div>').join("");
  const es = exec;
  const risks = es.top_5_risks || [];
  const rl = $("snapRisks"); if (rl) { rl.innerHTML = ""; risks.slice(0, 5).forEach((r, i) => { const li = document.createElement("li"); li.textContent = r; rl.appendChild(li); }); }
  const fa = (d.hev || {}).forensic_audit || {};
  const fs = $("forensicSummary"); if (fs) fs.textContent = `${fa.clean_count || 0} / ${fa.total || 17} PASS · ${fa.watch_count || 0} WATCH · ${fa.flag_count || 0} FLAG — ${fa.verdict_label || ""}`;
  const _e2 = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
  const _t2 = (d.quality_score && d.quality_score.total) || 23;
  let _b2 = "Fair Value Band";
  if (_e2 >= 17) _b2 = "High Consistency • " + _e2 + "/" + _t2;
  else if (_e2 >= 12) _b2 = "Moderate Consistency • " + _e2 + "/" + _t2;
  const _hvv = $("hvVerdict"); if (_hvv) _hvv.textContent = _b2;
}

function renderExecSummary(d) {
  const es = (d.hev || {}).exec_summary || {};
  const s = (d.hev || {}).settings || {};
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set("execTitleBanner", es.title_banner || "—");
  set("execMarketStrip", es.market_strip || "—");
  set("execGuidanceStrip", es.guidance_strip || "—");
  // drivers
  const dr = $("execDrivers"); if (dr) { dr.innerHTML = ""; (es.drivers_catalysts_box || []).forEach(x => { const p = document.createElement("p"); p.textContent = x; p.style.cssText = "font-size:13px;color:var(--muted);margin:6px 0;"; dr.appendChild(p); }); }
  const fi = $("execFinancials"); if (fi) { fi.textContent = es.financials_box || "—"; fi.style.cssText = "font-size:13px;color:var(--muted);line-height:1.5;"; }
  // comp
  const comp = es.comp_dist_prod_box || {};
  const cb = $("execComp"); if (cb) {
    cb.innerHTML = "";
    if (comp.moat) { const p = document.createElement("p"); p.textContent = "Moat: " + comp.moat; p.style.cssText = "font-size:13px;color:var(--muted);margin:4px 0;"; cb.appendChild(p); }
    if (comp.distribution) { const p = document.createElement("p"); p.textContent = "Distribution: " + comp.distribution; p.style.cssText = "font-size:13px;color:var(--muted);margin:4px 0;"; cb.appendChild(p); }
    if (comp.products) { const ul = document.createElement("ul"); ul.style.cssText = "font-size:12px;color:var(--muted);margin:6px 0;padding-left:18px;"; comp.products.forEach(pr => { const li = document.createElement("li"); li.textContent = pr; ul.appendChild(li); }); cb.appendChild(ul); }
  }
  // competitors mini table
  const peers = (d.hev || {}).peers || {};
  const peerRows = peers.rows || [];
  const pt = $("execPeerMini"); 
  // Top 5 peers sentence
  const ps = $("execPeersSentence"); if (ps) ps.textContent = es.top_5_peers_sentence || "";
  const pp = $("execPeParagraph"); if (pp) pp.textContent = es.pe_vs_peers_paragraph || "";
  set("execCompetitors", (s.competitors || []).slice(0, 6).map(c => '<span class="mini-pill">' + esc(c.company || c.ticker) + (c.pe ? ' • ' + fmt(c.pe, 1) + 'x' : '') + '</span>').join(""));
  if (pt) {
    pt.innerHTML = "";
    const table = document.createElement("table"); table.className = "report-table";
    const thead = document.createElement("thead"); thead.innerHTML = "<tr><th>Ticker</th><th>P/E</th><th>Margin</th><th>EPS Gr</th></tr>"; table.appendChild(thead);
    const tbody = document.createElement("tbody");
    peerRows.slice(0, 11).forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(row.ticker)}</td><td>${num(row.pe)}</td><td>${num(row.operating_margin_pct || row.margin || 0)}%</td><td>${num(row.eps_growth_pct || 0)}%</td>`;
      if (row.is_target) tr.style.fontWeight = "700";
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); pt.appendChild(table);
  }
  const mgmt = $("execManagement"); if (mgmt) { mgmt.textContent = es.management_box || "—"; mgmt.style.cssText = "font-size:13px;color:var(--muted);line-height:1.5;"; }
  const tam = $("execTam"); if (tam) { tam.textContent = es.tam_box || "—"; tam.style.cssText = "font-size:13px;color:var(--muted);line-height:1.5;"; }
  const risks = $("execRisks"); if (risks) {
    risks.innerHTML = "";
    (es.top_5_risks || []).forEach((r, i) => {
      const div = document.createElement("div"); div.className = "exec-risk-card";
      div.innerHTML = `<strong>${i + 1}.</strong> ${esc(r)}`;
      risks.appendChild(div);
    });
  }
  const bf = $("execBottomFund"); if (bf) bf.textContent = es.bottom_line_fundamentals || "—";
  const bv = $("execBottomVal"); if (bv) bv.textContent = es.bottom_line_valuation || "—";
  const bt = $("execBottomTech"); if (bt) bt.textContent = es.bottom_line_technicals || "—";
  const et = $("execTechnicals"); if (et) { et.textContent = es.technicals_sentence || "—"; et.style.cssText = "font-size:13px;color:var(--muted);line-height:1.5;"; }
}

function renderDashboard(d) {
  const hev = d.hev || {};
  const charts = hev.charts_23 || {};
  const grid = $("chartsGrid");
  if (grid) {
    grid.innerHTML = "";
    Object.keys(charts).forEach(k => {
      const card = renderChartCard(charts[k]);
      grid.appendChild(card);
    });
  }
  // sensitivity matrix
  const sens = (hev.valuation || {}).sensitivity || {};
  const sm = $("sensMatrix");
  if (sm && sens.grid) {
    const rows = sens.terminal_growth_rows || [];
    const cols = sens.wacc_columns || [];
    const gridData = sens.grid || [];
    let html = "<table class='report-table'><thead><tr><th>TG \\ WACC</th>" + cols.map(c => `<th>${c}%</th>`).join("") + "</tr></thead><tbody>";
    rows.forEach((tg, ri) => {
      html += `<tr><td><strong>${tg}%</strong></td>`;
      (gridData[ri] || []).forEach(cell => {
        const cls = cell.bucket === "bull" ? "background:rgba(48,209,88,0.15)" : cell.bucket === "bear" ? "background:rgba(255,69,58,0.15)" : "background:rgba(255,204,0,0.15)";
        html += `<td style="${cls}">${num(cell.target_price)}<br><span style="font-size:10px;color:var(--muted)">${Number(cell.upside_pct).toFixed(1)}%</span></td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    sm.innerHTML = html;
  }
  // peer table
  const peers = hev.peers || {};
  const peerRows = peers.rows || [];
  const ptab = $("peerTable");
  if (ptab) {
    let html = "<table class='report-table'><thead><tr><th>Ticker</th><th>Company</th><th>P/E</th><th>P/S</th><th>Op Margin</th><th>EPS Gr</th><th>Mkt Share</th></tr></thead><tbody>";
    peerRows.forEach(row => {
      html += `<tr ${row.is_target ? 'style="font-weight:700;background:rgba(0,113,227,0.08)"' : ""}><td>${esc(row.ticker)}</td><td>${esc(row.company)}</td><td>${num(row.pe)}</td><td>${num(row.ps)}</td><td>${num(row.operating_margin_pct)}%</td><td>${num(row.eps_growth_pct)}%</td><td>${num(row.market_share_pct)}%</td></tr>`;
    });
    html += "</tbody></table>";
    ptab.innerHTML = html;
  }
  const CHART_GROUPS = {
    market: new Set(["c1_market_share","c13_tam_bar","c14_geo_donut","c15_sector_treemap","c16_cost_waterfall","c17_customer_concentration","c18_shareholder_mix","c19_unit_economics"]),
    financials: new Set(["c2_revenue_trend","c3_margin_trend","c4_eps_trend","c5_roe_roce","c6_fcf_trend","c10_dcf_bridge"]),
    valuation: new Set(["c7_pe_band","c8_peer_pe_bar","c9_peer_margin_bar","c11_sensitivity_heatmap","c12_target_price_bar"]),
    forensic: new Set(["c20_forensic_radar","c21_rsi_obv","c22_price_vs_dma","c23_trailing_pe"]),
  };
  function applyChartFilter() {
    document.querySelectorAll("#chartsGrid .chart-card").forEach(card => {
      const id = card.dataset.chartId;
      if (state.chartFilter === "all") { card.style.display = ""; return; }
      const grp = CHART_GROUPS[state.chartFilter];
      card.style.display = (grp && grp.has(id)) ? "" : "none";
    });
  }
  document.querySelectorAll("#chartFilters .filter-pill").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#chartFilters .filter-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.chartFilter = btn.dataset.filter;
      applyChartFilter();
    };
  });
  applyChartFilter();
}

function renderReport(d) {
  const hev = d.hev || {};
  const chapters = hev.report_chapters || [];
  const admin = isAdminUser();
  const list = $("chapterList");
  if (list) {
    list.innerHTML = "";
    chapters.forEach((ch, i) => {
      const item = document.createElement("div");
      item.className = "chapter-item" + (i === 0 ? " active" : "");
      item.dataset.id = ch.id;
      item.innerHTML = `<div>${esc(ch.num)}. ${esc(ch.title)}</div><div class="chapter-range">${esc(ch.subtitle || "")}</div>`;
      item.addEventListener("click", () => {
        document.querySelectorAll(".chapter-item").forEach(x => x.classList.remove("active"));
        item.classList.add("active");
        const el = document.getElementById("ch-" + ch.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.appendChild(item);
    });
  }
  const canvas = $("reportCanvas");
  if (canvas) {
    canvas.innerHTML = "";
    chapters.forEach(ch => {
      const sec = document.createElement("section");
      sec.className = "report-chapter";
      sec.id = "ch-" + ch.id;
      let html = `<h3>${esc(ch.num)}. ${esc(ch.title)}</h3><div class="ch-sub">${esc(ch.subtitle || "")}</div>`;
      if (ch.kpis && ch.kpis.length) {
        html += `<div class="ch-kpis">${ch.kpis.map(k => '<span class="kpi-chip"><strong>' + esc(k.label || "") + ':</strong> ' + esc(k.value || "") + (k.unit ? ' ' + esc(k.unit) : '') + '</span>').join("")}</div>`;
      }
      (ch.sections || []).forEach(s => {
        html += `<div class="report-section"><h4>${esc(s.heading)}</h4>`;
        (s.paragraphs || []).forEach(p => { html += `<p>${esc(p)}</p>`; });
        if (s.table) {
          const isCh10 = (ch.num === 10 || ch.id === "ch10");
          const isQualityTable = Array.isArray(s.table.rows) && s.table.rows.length >= 20;
          if (isCh10 && isQualityTable) {
            if (!admin) {
              const pts = (typeof d.points !== "undefined") ? (d.points || []) : [];
              const earned = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
              html += "<div class='lojikx-prose-card'><div class='lojikx-prose-title'>LojikX™ Proprietary Quality Synthesis</div><p class='lojikx-prose-body'>" + esc(d.company || "") + " posts a LojikX™ consistency score of " + (Math.round(earned / 23 * 100) / 100) + " (" + earned + " of 23 institutional checkpoints), reflecting multi-year earnings and margin durability, ROE/ROCE capital-allocation efficiency, free-cash-flow conversion, and balance-sheet resilience. The full 23 individual checkpoints, formulas and calculated values are available to authorised institutional users.</p></div>";
            } else {
              html += "<table class='report-table'><thead><tr>" + s.table.columns.map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>";
              s.table.rows.forEach(row => { html += "<tr>" + row.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>"; });
              html += "</tbody></table>";
            }
          } else if (isCh10) {
            // Render compact risk register as cards (no <tr>) to keep ch10 focused on the quality audit.
            html += "<div class='risk-register'>";
            s.table.rows.forEach(row => {
              html += "<div class='risk-row'><strong>" + esc(row[0] || "") + "</strong> — " + esc(row.slice(1).join(" / ")) + "</div>";
            });
            html += "</div>";
          } else {
            html += "<table class='report-table'><thead><tr>" + s.table.columns.map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>";
            s.table.rows.forEach(row => { html += "<tr>" + row.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>"; });
            html += "</tbody></table>";
          }
        }
        if (s.chart_ref && hev.charts_23 && hev.charts_23[s.chart_ref]) {
          const c = hev.charts_23[s.chart_ref];
          const card = renderChartCard(c);
          html += `<div style="margin:10px 0">${card.outerHTML}</div>`;
        }
        html += "</div>";
      });
      sec.innerHTML = html;
      canvas.appendChild(sec);
    });
    // Strategic frameworks card (append to ch4 or end)
    const fw = (d.hev || {}).qualitative && (d.hev.qualitative.frameworks);
    if (fw) {
      const fsec = document.createElement("section");
      fsec.className = "report-chapter";
      fsec.innerHTML = `<h3>Strategic Frameworks</h3>`;
      // Porter
      const porter = fw.porter_5f || {};
      let porterHtml = `<div class="fw-card"><h5>Porter's 5 Forces</h5>`;
      Object.keys(porter).forEach(k => {
        const v = porter[k];
        const score = (v.score_1_to_5 || 0) * 20;
        porterHtml += `<div class="fw-bar"><span style="width:160px">${esc(k.replace(/_/g, " "))}</span><div class="bar"><div style="width:${score}%"></div></div><span>${esc(v.rating || "")} (${v.score_1_to_5}/5)</span></div><p style="font-size:11px;color:var(--muted);margin:2px 0 8px">${esc(v.analysis || "")}</p>`;
      });
      porterHtml += `</div>`;
      // SWOT
      const swot = fw.swot || {};
      let swotHtml = `<div class="fw-card"><h5>SWOT Matrix</h5><div class="swot-grid">`;
      ["strengths", "weaknesses", "opportunities", "threats"].forEach(key => {
        const items = swot[key] || [];
        swotHtml += `<div class="swot-cell"><strong>${esc(key)}</strong>${items.map(i => `<div style="margin:4px 0">• ${esc(i)}</div>`).join("")}</div>`;
      });
      swotHtml += `</div></div>`;
      // BCG
      const bcg = fw.bcg_matrix || {};
      let bcgHtml = `<div class="fw-card"><h5>BCG Matrix</h5><div class="bcg-grid">`;
      Object.keys(bcg).forEach(key => {
        const items = bcg[key] || [];
        bcgHtml += `<div class="bcg-cell"><strong>${esc(key.replace(/_/g, " "))}</strong>${(Array.isArray(items) ? items : [items]).map(i => `<div>• ${esc(i)}</div>`).join("")}</div>`;
      });
      bcgHtml += `</div></div>`;
      // PLC
      const plc = fw.plc_stage || {};
      let plcHtml = `<div class="fw-card"><h5>Product Life Cycle</h5><p><strong>${esc(plc.stage || "")}</strong> — ${esc(plc.rationale || "")}</p></div>`;
      // HEV 15C
      const hev15 = fw.hev_15c || {};
      let hevHtml = `<div class="fw-card"><h5>LojikX™ 8-Dimension Commercial Execution</h5>`;
      Object.keys(hev15).forEach(k => {
        const v = hev15[k];
        hevHtml += `<div class="fw-bar"><span style="width:160px">${esc(k.replace(/_/g, " "))}</span><div class="bar"><div style="width:${(v.score_1_to_10 || 0) * 10}%"></div></div><span>${v.score_1_to_10}/10</span></div>`;
      });
      hevHtml += `</div>`;
      // Culture
      const cult = fw.culture_scorecard || {};
      let cultHtml = `<div class="fw-card"><h5>6-Dimension Culture Scorecard</h5>`;
      Object.keys(cult).forEach(k => {
        const v = cult[k];
        cultHtml += `<div class="fw-bar"><span style="width:160px">${esc(k.replace(/_/g, " "))}</span><div class="bar"><div style="width:${(v.score_1_to_10 || 0) * 10}%"></div></div><span>${v.score_1_to_10}/10</span></div>`;
      });
      cultHtml += `</div>`;
      fsec.innerHTML += porterHtml + swotHtml + bcgHtml + plcHtml + hevHtml + cultHtml;
      canvas.appendChild(fsec);
    }
  }

  // search filter
  const rs = $("reportSearch");
  if (rs) {
    rs.oninput = () => {
      const q = rs.value.toLowerCase();
      document.querySelectorAll(".report-chapter").forEach(ch => {
        ch.style.display = ch.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    };
  }
  const expandBtn = $("expandAllChapters");
  if (expandBtn) expandBtn.onclick = () => { document.querySelectorAll(".report-chapter").forEach(c => c.style.display = ""); };
  const printFull = $("printFullReport");
  if (printFull) printFull.onclick = () => window.print();
}

function renderForensic(d) {
  const hev = d.hev || {};
  const fa = hev.forensic_audit || {};
  const banner = $("forensicBanner");
  if (banner) banner.textContent = `${fa.clean_count || 0} / ${fa.total || 17} PASS — ${fa.watch_count || 0} WATCH — ${fa.flag_count || 0} FLAG — ${fa.verdict_label || ""}`;
  const checks = fa.checks || [];
  const container = $("forensicChecks");
  if (container) {
    container.innerHTML = "";
    checks.forEach(c => {
      const div = document.createElement("div");
      div.className = "forensic-check";
      div.innerHTML = `
        <div class="fc-id">#${esc(c.id)}</div>
        <div>
          <div class="fc-title">${esc(c.title)}</div>
          <div class="fc-metric">${esc(c.metric_value)}</div>
          <div class="fc-expl">${esc(c.explanation)}</div>
        </div>
        <div class="fc-badge ${esc(c.status)}">${esc(c.status)}</div>
      `;
      container.appendChild(div);
    });
  }
  // LojikX points
  const pts = d.points || [];
  const bp = $("buffettPoints");
  if (bp) {
    bp.innerHTML = "";
    const admin = isAdminUser();
    if (admin) {
      if (pts.length) {
        pts.forEach(p => {
          const badge = (p.verdict === "YES" || p.score === 1) ? "YES" : "NO";
          const div = document.createElement("div");
          div.className = "point-card";
          const calc = (p.calc || []).map(c => `${esc(c.label)}: ${esc(c.value)} ${esc(c.unit || "")}`).join(" — ");
          div.innerHTML = `
            <div class="point-head">
              <div class="point-title">${esc(p.num)}. ${esc(p.title)}</div>
              <div class="point-badge ${badge}">${badge}</div>
            </div>
            <div class="point-q">${esc(p.question || p.principle || "")}</div>
            <div class="point-calc">${esc(calc)}</div>
            <div class="point-value">${esc(p.value || "")}</div>
          `;
          bp.appendChild(div);
        });
      } else {
        const ch = (hev.report_chapters && hev.report_chapters[9]) || {};
        const st = hev.settings || {};
        const card = document.createElement("div");
        card.className = "point-card";
        let html = `<div class="point-head"><div class="point-title">Index Benchmark Summary</div><div class="point-badge YES">INDEX</div></div>`;
        html += `<div class="point-q">${esc(ch.title || (d.company || "Broad Market Index"))}</div>`;
        if (ch.kpis && ch.kpis.length) {
          html += `<div class="point-calc">${ch.kpis.map(k => esc(k.label) + ": " + esc(k.value) + esc(k.unit || "")).join(" — ")}</div>`;
        }
        html += `<div class="point-value">${esc(st.company || d.company || "")} — P/E ${num(st.pe)} — ROE ${num(st.roe_pct)}% — Quality ${st.quality_earned || 0}/${st.quality_total || 23}</div>`;
        (ch.sections || []).forEach(sec => {
          (sec.paragraphs || []).slice(0, 3).forEach(p => { html += `<p style="font-size:12px;color:var(--muted);margin:4px 0">${esc(p)}</p>`; });
        });
        card.innerHTML = html;
        bp.appendChild(card);
      }
    } else {
      const earned = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
      const card = document.createElement("div");
      card.className = "lojikx-prose-card";
      card.innerHTML = `<div class="lojikx-prose-title">LojikX™ Proprietary Quality Synthesis</div><p class="lojikx-prose-body">${esc(d.company || "")} posts a LojikX™ consistency score of ${Math.round(earned / 23 * 100) / 100} (${earned} of 23 institutional checkpoints), reflecting multi-year earnings and margin durability, ROE/ROCE capital-allocation efficiency, free-cash-flow conversion, and balance-sheet resilience. The full 23 individual checkpoints, formulas and calculated values are available to authorised institutional users.</p>`;
      bp.appendChild(card);
    }
  }
  // when to sell
  const wts = d.when_to_sell || {};
  const w = $("whenToSell");
  if (w) {
    w.innerHTML = "";
    const admin = isAdminUser();
    if (admin) {
      const hasWts = (wts && ((wts.current_price !== undefined && wts.current_price !== null) || wts.winner));
      if (hasWts) {
        const card = document.createElement("div");
        card.className = "wts-card";
        let html = `<h4 style="margin-bottom:8px">10-Year Equity vs. T-Bond Comparison</h4>`;
        const rows = [
          ["Current Price", money(d.currency, wts.current_price)],
          ["Years", wts.years],
          ["T-Bond Rate %", wts.tbond_rate_pct],
          ["EPS CAGR %", wts.eps_cagr_pct],
          ["Cumulative EPS 10Y", money(d.currency, wts.cumulative_eps_10y)],
          ["Bond Value 10Y", money(d.currency, wts.bond_value_10y)],
          ["Equity Yield %", wts.equity_yield_pct],
          ["Bond Total Return %", wts.bond_total_return_pct],
          ["Winner", wts.winner],
          ["Winner Yield", wts.winner_yield],
        ];
        rows.forEach(([k, v]) => { html += `<div class="wts-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`; });
        if (wts.conditions) { html += `<div style="margin-top:10px;font-size:12px;color:var(--muted)">${wts.conditions.map(c => `<div>${esc(c)}</div>`).join("")}</div>`; }
        if (wts.note) { html += `<p style="margin-top:8px;font-size:12px;color:var(--muted)">${esc(wts.note)}</p>`; }
        card.innerHTML = html;
        w.appendChild(card);
      } else {
        const ch = (hev.report_chapters && hev.report_chapters[9]) || {};
        const st = hev.settings || {};
        const card = document.createElement("div");
        card.className = "wts-card";
        let html = `<h4 style="margin-bottom:8px">Index Benchmark Summary</h4>`;
        html += `<div class="wts-row"><span>Index</span><strong>${esc(st.company || d.company || "")}</strong></div>`;
        html += `<div class="wts-row"><span>Current Price</span><strong>${money(d.currency, st.current_price)}</strong></div>`;
        html += `<div class="wts-row"><span>P/E</span><strong>${num(st.pe)}</strong></div>`;
        html += `<div class="wts-row"><span>ROE %</span><strong>${num(st.roe_pct)}</strong></div>`;
        html += `<div class="wts-row"><span>ROCE %</span><strong>${num(st.roce_pct)}</strong></div>`;
        html += `<div class="wts-row"><span>Quality</span><strong>${st.quality_earned || 0}/${st.quality_total || 23}</strong></div>`;
        html += `<div class="wts-row"><span>Forensic Verdict</span><strong>${esc((hev.forensic_audit || {}).verdict_label || "")}</strong></div>`;
        const riskSec = (ch.sections || []).find(sec => /risk/i.test(sec.heading || ""));
        if (riskSec) { (riskSec.paragraphs || []).slice(0, 3).forEach(p => { html += `<p style="font-size:12px;color:var(--muted);margin:4px 0">${esc(p)}</p>`; }); }
        card.innerHTML = html;
        w.appendChild(card);
      }
    } else {
      const card = document.createElement("div");
      card.className = "wts-card";
      let html = `<h4 style="margin-bottom:8px">LojikX™ Long-Horizon Sovereign Yield Benchmark</h4>`;
      html += `<div class="wts-row"><span>Benchmark</span><strong>10-Year Sovereign Yield</strong></div>`;
      html += `<div class="wts-row"><span>Equity Compounding</span><strong>Long-horizon intrinsic value</strong></div>`;
      html += `<div class="wts-row"><span>Verdict</span><strong>${esc((hev.forensic_audit || {}).verdict_label || "Monitor")}</strong></div>`;
      html += `<p style="margin-top:8px;font-size:12px;color:var(--muted)">High-level summary for public visitors. Detailed 10-Year Equity vs. T-Bond comparison is available to authorised institutional users.</p>`;
      card.innerHTML = html;
      w.appendChild(card);
    }
  }
}
// Tabs
function switchView(v) {
  state.currentView = v;
  document.querySelectorAll(".view").forEach(el => el.style.display = "none");
  const target = $("view-" + v);
  if (target) target.style.display = "";
  document.querySelectorAll("#workspaceTabs .ws-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === v);
  });
}
document.querySelectorAll("#workspaceTabs .ws-tab").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// Print
const printBtn = $("printBtn");
if (printBtn) printBtn.addEventListener("click", () => window.print());

// Search autocomplete
let acTimer = null;
const searchInput = $("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(acTimer);
    const q = e.target.value.trim();
    if (q.length < 1) { const ac = $("autocomplete"); if (ac) ac.style.display = "none"; const sd = $("searchDropdown"); if (sd) sd.style.display = "none"; return; }
    acTimer = setTimeout(() => {
      const idx = getIndex();
      let results = [];
      if (idx && idx.tickers) {
        const ql = q.toLowerCase();
        results = idx.tickers.filter(r => (r.ticker || "").toLowerCase().includes(ql) || (r.company || "").toLowerCase().includes(ql)).slice(0, 12);
      }
      const box = $("autocomplete");
      if (box) {
        box.innerHTML = "";
        results.forEach(item => {
          const div = document.createElement("div");
          div.className = "ac-item";
          div.textContent = `${item.ticker} — ${item.company || ""}`;
          div.addEventListener("click", () => {
            searchInput.value = item.ticker;
            box.style.display = "none";
            handleTickerSelection(item.ticker);
          });
          box.appendChild(div);
        });
        box.style.display = results.length ? "block" : "none";
      }
      const sd = $("searchDropdown");
      if (sd && box) { sd.innerHTML = box.innerHTML; sd.style.display = box.style.display; }
    }, 150);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const ac = $("autocomplete"); if (ac) ac.style.display = "none";
      handleTickerSelection(searchInput.value.trim());
    }
  });
}
function handleTickerSelection(ticker) {
  if (!ticker) return;
  if (requireAuthFor(ticker)) {
    state.pendingTicker = ticker;
    openModal("authModal");
    return;
  }
  loadTickerData(ticker);
}

// Quick picks
function renderQuickPicks() {
  const wrap = $("quickPicks"); if (!wrap) return;
  const idx = getIndex();
  const picks = ["ITC", "TCS", "PERSISTENT", "HDFCBANK", "TITAN", "BHEL", "AAPL", "MSFT", "NVDA", "GOOGL"];
  wrap.innerHTML = "";
  picks.forEach(sym => {
    const btn = document.createElement("button");
    btn.className = "quick-chip";
    btn.innerHTML = `<span class="chip-sym">${sym}</span>`;
    btn.addEventListener("click", () => { const inp = $("searchInput"); if (inp) inp.value = sym; handleTickerSelection(sym); });
    wrap.appendChild(btn);
  });
}

// Stock directory (from index) optional search not needed.

// Stock directory search via index tickers could be added; keep minimal.

// Init
async function init() {
  await ensureIndex();
  initScoreRing();
  initSpeedo();
  renderQuickPicks();
  const showcase = state.market === "INDIA" ? "ITC" : "AAPL";
  loadTickerData(showcase);
  refreshAuth();
}
document.addEventListener("DOMContentLoaded", init);

// Founder btn ensure
setInterval(() => {
  const fb = $("founderBtn");
  if (!fb) return;
  if (state.user && state.user.is_admin) {
    fb.style.display = "inline-flex";
    fb.href = isLocalHost() ? "/personal" : "./founder.html";
  } else {
    fb.style.display = "none";
  }
}, 2000);

// Expose
window.loadTickerData = loadTickerData;
window.state = state;