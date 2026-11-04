
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
  stocksData: null,
  rawPublicData: null,
};

// Stocks data fallback for GitHub Pages (no Flask /api/analyze endpoint)
// Lazy-loads stocks_data.json once and serves /api/analyse, /api/analyze, /api/search, /api/samples
// from it so any ticker (vogl, itchotels, itc, ...) works instantly on static hosting.
let _stocksDataLoaded = false;
async function _loadStocksData() {
  if (_stocksDataLoaded) return state.stocksData;
  _stocksDataLoaded = true;
  try {
    const r = await fetch('./stocks_data.json');
    if (r.ok) state.stocksData = await r.json();
  } catch (e) { /* ignore — static host may not have stocks_data.json */ }
  return state.stocksData;
}
function _stocksKey(t) { return String(t || '').toUpperCase().replace(/\.(NS|BO)$/i, ''); }

// Rock-solid fetch interceptor: serve /api/analyse, /api/analyze, /api/search, /api/samples
// from stocks_data.json so any ticker works on GitHub Pages without a backend.
(function installStocksFetchInterceptor() {
  try {
    if (typeof window === 'undefined') return;
    const origFetch = (typeof window.fetch === 'function') ? window.fetch.bind(window) : (typeof fetch === 'function' ? fetch.bind(typeof globalThis !== 'undefined' ? globalThis : {}) : null);
    if (!origFetch) return;
    window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url);
      if (!url) return orig(input, init);
      const isApi = /^\/api\/((personal\/)?(analyse|analyze)|search|samples)(\?|#|$)/i.test(url) || /[?&](symbol|sym|ticker|q)=/i.test(url);
      if (!isApi) return orig(input, init);
      return (async () => {
        let s = null;
        try {
          const u = new URL(url, location.href);
          s = u.searchParams.get('symbol') || u.searchParams.get('sym') || u.searchParams.get('ticker') || u.searchParams.get('q');
          if (!s) {
            const parts = url.split('/').filter(Boolean);
            const last = parts[parts.length - 1];
            if (last && !['analyse', 'analyze', 'search', 'samples', 'companies', 'personal'].includes(last)) s = last;
          }
        } catch (e) {}
        if (!s && init && init.body) {
          try { const j = JSON.parse(init.body); s = j.symbol || j.sym || j.ticker || j.q; } catch (e) {}
        }
        const data = await _loadStocksData();
        const key = s ? _stocksKey(s) : null;
        if (key && data && data[key]) {
          return new Response(JSON.stringify(data[key]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.indexOf('/api/search') !== -1 && data && s) {
          const q = s.toLowerCase();
          const res = Object.keys(data || {}).filter(k => k.toLowerCase().includes(q) || (((data || {})[k] || {}).name || '').toLowerCase().includes(q)).map(k => ({ symbol: k, name: (data || {})[k].name || k }));
          return new Response(JSON.stringify({ query: s, results: res }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      })();
    } catch (e) {}
    return origFetch ? origFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
  };
  } catch (e) {}
})();

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

// Market toggle
function wireEventListeners() {
  const tt = $("themeToggle");
  if (tt && !tt.dataset.wired) {
    tt.dataset.wired = "1";
    tt.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      setTheme(cur === "dark" ? "light" : "dark");
    });
  }

  const mp = $("marketPill");
  if (mp && !mp.dataset.wired) {
    mp.dataset.wired = "1";
    mp.addEventListener("click", () => {
      state.market = state.market === "INDIA" ? "USA" : "INDIA";
      mp.textContent = state.market === "INDIA" ? "🇮🇳 India NSE" : "🇺🇸 US Market";
      const showcase = state.market === "INDIA" ? "ITC" : "AAPL";
      if (!state.user) { loadTickerData(showcase); }
      else { if (!state.selectedTicker) loadTickerData(showcase); }
    });
  }

  document.querySelectorAll("#workspaceTabs .ws-tab").forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  const signInBtn = $("signInBtn") || $("navAuthBtn");
  if (signInBtn && !signInBtn.dataset.wired) {
    signInBtn.dataset.wired = "1";
    signInBtn.addEventListener("click", () => {
      if (state.user) { signOutUser(); if (state.currentData) renderAll(state.currentData); }
      else { openModal("authModal"); }
    });
  }

  const navAuthBtn2 = $("navAuthBtn");
  if (navAuthBtn2 && navAuthBtn2 !== signInBtn && !navAuthBtn2.dataset.wired) {
    navAuthBtn2.dataset.wired = "1";
    navAuthBtn2.addEventListener("click", () => {
      if (state.user) { signOutUser(); if (state.currentData) renderAll(state.currentData); }
      else { openModal("authModal"); }
    });
  }

  const loginBtn = $("loginBtn");
  if (loginBtn && !loginBtn.dataset.wired) {
    loginBtn.dataset.wired = "1";
    loginBtn.addEventListener("click", async () => {
      try {
        await postAuth("/api/auth/login", { email: $("authEmail") ? $("authEmail").value : "", password: $("authPassword") ? $("authPassword").value : "" });
        const m = $("authMsg"); if (m) m.textContent = "";
      } catch (e) { const m = $("authMsg"); if (m) m.textContent = e && e.message ? e.message : e; }
    });
  }
  const registerBtn = $("registerBtn");
  if (registerBtn && !registerBtn.dataset.wired) {
    registerBtn.dataset.wired = "1";
    registerBtn.addEventListener("click", async () => {
      try {
        await postAuth("/api/auth/register", { email: $("authEmail") ? $("authEmail").value : "", name: $("authName") ? $("authName").value : "", password: $("authPassword") ? $("authPassword").value : "" });
        const m = $("authMsg"); if (m) m.textContent = "";
      } catch (e) { const m = $("authMsg"); if (m) m.textContent = e && e.message ? e.message : e; }
    });
  }
  const googleBtn = $("googleBtn");
  if (googleBtn && !googleBtn.dataset.wired) {
    googleBtn.dataset.wired = "1";
    googleBtn.addEventListener("click", async () => {
      const email = prompt("Enter your Google email:");
      if (!email) return;
      const name = prompt("Enter your name:") || email.split("@")[0];
      try {
        await postAuth("/api/auth/google", { email, name });
        const m = $("authMsg"); if (m) m.textContent = "";
      } catch (e) { const m = $("authMsg"); if (m) m.textContent = e && e.message ? e.message : e; }
    });
  }
  const authSubmitBtn = $("authSubmitBtn");
  if (authSubmitBtn && !authSubmitBtn.dataset.wired) {
    authSubmitBtn.dataset.wired = "1";
    authSubmitBtn.addEventListener("click", async () => {
      const email = $("authEmail") ? $("authEmail").value : "";
      const name = $("authName") ? $("authName").value : "";
      const password = $("authPassword") ? $("authPassword").value : "";
      const mode = (authSubmitBtn.dataset && authSubmitBtn.dataset.mode) ? authSubmitBtn.dataset.mode : "login";
      try {
        await postAuth(mode === "register" ? "/api/auth/register" : "/api/auth/login", { email, name, password });
      } catch (e) { const m = $("authMsg"); if (m) m.textContent = e && e.message ? e.message : e; }
    });
  }

  const printBtn = $("printBtn");
  if (printBtn && !printBtn.dataset.wired) {
    printBtn.dataset.wired = "1";
    printBtn.addEventListener("click", () => window.print());
  }

  document.querySelectorAll(".modal-close").forEach(b => {
    if (b.dataset.wired) return;
    b.dataset.wired = "1";
    b.addEventListener("click", () => closeModal(b.dataset.close));
  });
  document.querySelectorAll(".modal").forEach(m => {
    if (m.dataset.wired) return;
    m.dataset.wired = "1";
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(m.id); });
  });
}

// Modal helpers
function openModal(id) { const m = $(id); if (m) m.classList.add("open"); }
function closeModal(id) { const m = $(id); if (m) m.classList.remove("open"); }
wireEventListeners();

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
// Session schema version. Any `lojik_public_user` written by an older build
// (auth_v missing / different) is purged automatically on load.
const AUTH_VERSION = "20261104_v15";
const STALE_AUTH_KEYS = ["lojik_public_user", "lojik_admin_pass", "admin_email", "is_admin", "lojikgain_admin", "lojik_user"];
function purgeStaleAuthStorage() {
  try {
    STALE_AUTH_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {}
}
function isAdminEmail(email) {
  return ["dr.timothysuraj@gmail.com", "admin@lojikgain.com"].includes(String(email).toLowerCase());
}
// Admin gate: requires an authenticated user object flagged is_admin === true.
// refreshAuth() already purges any stored session lacking auth_v === AUTH_VERSION,
// so an email match alone is never sufficient here.
function isAdminUser() { return Boolean(state.user && state.user.is_admin === true); }

// ---------- Founder data vault (AES-256-GCM, password = email:pass) ----------
const FOUNDER_ENC_URL = './founder_data.enc?v=20261104_v15';
const FOUNDER_PASS_KEY = 'lojik_admin_pass';
function _b64u(s){ return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); }
async function deriveFounderKey(password, saltB64){
  const enc = new TextEncoder();
  const salt = _b64u(saltB64);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['decrypt']);
}
async function decryptFounderEnvelope(env, key){
  const iv = _b64u(env.iv);
  const ct = _b64u(env.ct);
  const dec = await crypto.subtle.decrypt({name:'AES-GCM', iv:iv}, key, ct);
  let data = new Uint8Array(dec);
  if (env.gz) {
    const ds = new DecompressionStream('gzip');
    const w = ds.writable.getWriter(); w.write(data); w.close();
    const r = ds.readable.getReader(); const chunks=[];
    while(true){ const x = await r.read(); if(x.done) break; chunks.push(x.value); }
    const total = chunks.reduce((a,c)=>a+c.length,0);
    const out = new Uint8Array(total); let off=0;
    for(const c of chunks){ out.set(c, off); off += c.length; }
    data = out;
  }
  return new TextDecoder().decode(data);
}
async function loadFounderData(email, pass){
  const res = await fetch(FOUNDER_ENC_URL);
  if (!res.ok) throw new Error('founder_data.enc fetch failed (' + res.status + ')');
  const env = await res.json();
  const key = await deriveFounderKey(String(email).trim().toLowerCase() + ':' + String(pass).trim(), env.s);
  const text = await decryptFounderEnvelope(env, key);
  window.FOUNDER_DATA = JSON.parse(text);
  return window.FOUNDER_DATA;
}
function mergeFounderDataIntoTicker(d){
  if (!d || !d.ticker) return d;
  const fd = window.FOUNDER_DATA;
  if (!fd) return d;
  const clone = JSON.parse(JSON.stringify(d));
  const key = String(clone.ticker).toUpperCase().replace(/\.(NS|BO)$/i,'');
  const e = fd[key];
  if (!e) return clone;
  if (e.points) clone.points = e.points;
  if (e.score) clone.score = e.score;
  if (e.quality_score) clone.quality_score = e.quality_score;
  if (e.when_to_sell) { clone.when_to_sell = e.when_to_sell; clone.sovereign_bench = e.when_to_sell; }
  if (e.statement) clone.statement = e.statement;
  if (e.computation) clone.computation = e.computation;
  if (e.classifications) clone.classifications = e.classifications;
  if (e.meta) clone.meta = Object.assign({}, clone.meta || {}, e.meta);
  if (e.fear_greed) clone.fear_greed = e.fear_greed;
  if (e.price_series) clone.price_series = e.price_series;
  if (e.company) clone.company = e.company;
  if (e.market) clone.market = e.market;
  if (e.currency) clone.currency = e.currency;
  if (e.current_price !== undefined) clone.current_price = e.current_price;
  if (e.years) clone.years = e.years;
  return clone;
}
async function ensureFounderData(){
  if (window.FOUNDER_DATA) return;
  if (!isAdminUser()) return;
  const email = state.user && state.user.email;
  let pass = null;
  try { pass = sessionStorage.getItem(FOUNDER_PASS_KEY) || localStorage.getItem(FOUNDER_PASS_KEY); } catch(e){}
  if (email && pass) {
    try { await loadFounderData(email, pass); } catch (err) { console.error('founder data restore failed:', err); }
  }
}
async function refreshAuth() {
  // Try Flask
  try {
    const r = await fetch("/api/auth/me");
    if (r.ok) {
      const d = await r.json();
      state.user = d.authenticated ? d.user : null;
      updateAuthUI();
      updateFounderBtn();
      if (state.user && state.user.is_admin) {
        const pass = (() => { try { return sessionStorage.getItem(FOUNDER_PASS_KEY) || localStorage.getItem(FOUNDER_PASS_KEY); } catch(e){ return null; } })();
        if (!pass) { saveUser(null); if (state.currentData) renderAll(state.currentData); return; }
      }
      return;
    }
  } catch (e) {}
  // Static fallback
  try {
    const _raw = localStorage.getItem("lojik_public_user");
    let u = null;
    try { u = _raw ? JSON.parse(_raw) : null; } catch (e) { u = null; }
    // Auto-purge stale v14 sessions: anything without the current auth_v marker
    // (including malformed JSON) is wiped so the browser starts cleanly signed out.
    if (!u || u.auth_v !== AUTH_VERSION) {
      purgeStaleAuthStorage();
      signOutUser();
      return;
    }
    state.user = u;
  } catch (e) { state.user = null; }
  updateAuthUI();
  updateFounderBtn();
  if (state.user && state.user.is_admin) {
    const pass = (() => { try { return sessionStorage.getItem(FOUNDER_PASS_KEY) || localStorage.getItem(FOUNDER_PASS_KEY); } catch(e){ return null; } })();
    if (!pass) { saveUser(null); if (state.currentData) renderAll(state.currentData); return; }
    ensureFounderData().then(() => { if (state.currentData) renderAll(state.currentData); });
  }
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

function signOutUser() {
  try {
    state.user = null;
    localStorage.removeItem("lojik_public_user");
    localStorage.removeItem(FOUNDER_PASS_KEY);
    sessionStorage.removeItem(FOUNDER_PASS_KEY);
    localStorage.removeItem("admin_email");
    sessionStorage.removeItem("admin_email");
    localStorage.removeItem("is_admin");
    sessionStorage.removeItem("is_admin");
    localStorage.removeItem("lojikgain_admin");
    localStorage.removeItem("lojik_user");
  } catch(e){}
  try { delete window.FOUNDER_DATA; window.FOUNDER_DATA = null; } catch(e){}
  updateAuthUI();
  updateFounderBtn();
  try {
    if (state.rawPublicData) {
      renderAll(JSON.parse(JSON.stringify(state.rawPublicData)));
    } else if (state.currentData) {
      const clone = JSON.parse(JSON.stringify(state.currentData));
      delete clone.points; delete clone.when_to_sell; delete clone.sovereign_bench;
      renderAll(clone);
    }
  } catch(e){}
}

function saveUser(u) {
  state.user = u;
  if (u && typeof u === "object") { try { u.auth_v = AUTH_VERSION; } catch (e) {} }
  if (u) localStorage.setItem("lojik_public_user", JSON.stringify(u));
  else {
    try {
      localStorage.removeItem("lojik_public_user");
      localStorage.removeItem(FOUNDER_PASS_KEY);
      sessionStorage.removeItem(FOUNDER_PASS_KEY);
      localStorage.removeItem("admin_email");
      sessionStorage.removeItem("admin_email");
      localStorage.removeItem("is_admin");
      sessionStorage.removeItem("is_admin");
      localStorage.removeItem("lojikgain_admin");
      localStorage.removeItem("lojik_user");
    } catch(e){}
    try { delete window.FOUNDER_DATA; window.FOUNDER_DATA = null; } catch(e){}
  }
  updateAuthUI();
  updateFounderBtn();
}

async function postAuth(path, body) {
  body = body || {};
  const emailClean = String((body && body.email) || "").trim().toLowerCase();
  const passClean = String((body && body.password) || "").trim();
  // Admin gate: proof is the Founder vault decrypting (AES-GCM auth tag),
  // so no credential digest ships in the bundle.
  let _isAdmin = false;
  if (emailClean && passClean) {
    try {
      await loadFounderData(emailClean, passClean);
      try { sessionStorage.setItem(FOUNDER_PASS_KEY, passClean); localStorage.setItem(FOUNDER_PASS_KEY, passClean); } catch(e){}
      _isAdmin = true;
    } catch (e) { _isAdmin = false; }
  }
  if (_isAdmin) {
    const adminUser = { email: body.email, name: "Founder Admin", is_admin: true, access_granted: true, auth_v: AUTH_VERSION };
    saveUser(adminUser);
    try { var m2 = document.getElementById("authModal"); if(m2) m2.classList.remove("open"); } catch(e){}
    if (state.currentData) renderAll(state.currentData);
    if (state.pendingTicker) { const t = state.pendingTicker; state.pendingTicker = null; try { loadTickerData(t); } catch(e){} }
    return adminUser;
  }
  // Try Flask
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status !== 404) {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || "Auth failed");
      state.user = d.user || d;
      if (state.user && typeof state.user === "object") state.user.auth_v = AUTH_VERSION;
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
  if (isAdminEmail(email)) {
    if (!_isAdmin) {
      throw new Error('Invalid admin credentials');
    }
  }
  const user = {
    email,
    name: body.name || (email ? email.split("@")[0] : "User"),
    is_admin: _isAdmin || false,
    is_paid: false,
    access_granted: true,
    auth_provider: path.includes("google") ? "google" : "email",
    auth_v: AUTH_VERSION,
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
const adminQuick = $("removedAdminBtn");
if (adminQuick) adminQuick.addEventListener("click", async () => {
  const em = $("authEmail"); if (em) em.value = null;
  const pw = $("authPass"); if (pw) pw.value = null;
  try {
    await postAuth("/api/auth/login", { email: null, password: $("authPass")?.value || null });
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
  if (state.cache[resolved]) { 
    try { if (!state.rawPublicData) state.rawPublicData = JSON.parse(JSON.stringify(state.cache[resolved])); } catch(e){}
    renderAll(state.cache[resolved]); 
    return; 
  }
  // embedded payload
  if (idx && idx.payloads && idx.payloads[resolved]) {
    state.cache[resolved] = idx.payloads[resolved];
    try { if (!state.rawPublicData) state.rawPublicData = JSON.parse(JSON.stringify(idx.payloads[resolved])); } catch(e){}
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
        try { if (!state.rawPublicData) state.rawPublicData = JSON.parse(JSON.stringify(d)); } catch(e){}
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
      try { if (!state.rawPublicData) state.rawPublicData = JSON.parse(JSON.stringify(d)); } catch(e){}
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
      seg.style.stroke = grad;
      seg.setAttribute("filter", "url(#glow-score)");
      seg.classList.add("lit");
    } else {
      seg.style.stroke = "";
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
  if (isAdminUser() && window.FOUNDER_DATA) {
    d = mergeFounderDataIntoTicker(d);
  }
  state.currentData = d;
  renderHero(d);
  renderOverview(d);
  renderExecSummary(d);
  renderDashboard(d);
  renderReport(d);
  renderForensic(d);
  renderFinancials(d);
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
    const ct = (d && d.company_type) ? d.company_type : "Company I - Durable Competitive Advantage";
    cb.textContent = `Company Type: ${ct}`;
  }
  // tech strip (handled above)
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
  const _adm2 = isAdminUser();
  let _b2 = "Fair Value Band";
  if (_e2 >= 17) _b2 = _adm2 ? ("High Consistency • " + _e2 + "/" + _t2) : "High Consistency Tier";
  else if (_e2 >= 12) _b2 = _adm2 ? ("Moderate Consistency • " + _e2 + "/" + _t2) : "Moderate Consistency Tier";
  else _b2 = _adm2 ? ("Developing Consistency • " + _e2 + "/" + _t2) : "Developing Consistency Tier";
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
        if ((ch.num === 10 || ch.id === "ch10") && /Quality|Pillar|Synthesis/i.test(s.heading || "")) {
          if (!isAdminUser()) {
            html += '<div class="lojikx-prose-card"><h4>LojikX™ Proprietary Quality Synthesis</h4><p>' + esc((s.paragraphs && s.paragraphs[0]) || "Demonstrates institutional-grade multi-cycle durability across earnings, capital efficiency, cash-flow conversion, and sovereign yield benchmarks.") + '</p></div>';
          } else {
            html += '<table><thead><tr><th>Pillar</th><th>Architecture Dimension</th><th>Assessment</th></tr></thead><tbody><tr><td>I</td><td>Earnings & Margin Durability</td><td>Verified</td></tr><tr><td>II</td><td>Capital Allocation & Compounding</td><td>Verified</td></tr><tr><td>III</td><td>Cash Flow Integrity & Leverage</td><td>Verified</td></tr><tr><td>IV</td><td>Intrinsic Yield vs Sovereign Benchmark</td><td>Verified</td></tr></tbody></table>';
          }
        }
        if (s.table) {
          const isCh10 = (ch.num === 10 || ch.id === "ch10");
          const isQualityTable = Array.isArray(s.table.rows) && s.table.rows.length >= 20;
          if (isCh10 && isQualityTable) {
            if (!admin) {
              const pts = (typeof d.points !== "undefined") ? (d.points || []) : [];
              const earned = (d.quality_score && d.quality_score.earned) || (d.score && d.score.earned) || d.quality_earned || 0;
              html += "<div class='lojikx-prose-card'><div class='lojikx-prose-title'>LojikX™ Proprietary Quality Synthesis</div><p class='lojikx-prose-body'>" + esc(d.company || "") + " posts a LojikX™ consistency score of " + (Math.round((earned / 23) * 100) / 100) + " / 100, reflecting multi-year earnings and margin durability, ROE/ROCE capital-allocation efficiency, free-cash-flow conversion, and balance-sheet resilience. Detailed proprietary quality checkpoints and valuation models are restricted to authorised institutional accounts.</p></div>";
            } else {
              html += "<table class='report-table'><thead><tr>" + s.table.columns.map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>";
              s.table.rows.forEach(row => { html += "<tr>" + row.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>"; });
              html += "</tbody></table>";
            }
          } else if (isCh10 && admin && d.points && d.points.length) {
            html += "<table class='report-table'><thead><tr><th>Point</th><th>Title</th><th>Passed</th></tr></thead><tbody>";
            d.points.forEach(function(p){
              var passed = (p && (p.verdict === "YES" || p.score === 1)) ? "YES" : "NO";
              html += "<tr><td>" + esc(p && p.num) + "</td><td>" + esc(p && p.title) + "</td><td>" + esc(passed) + "</td></tr>";
            });
            html += "</tbody></table>";
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
  // LojikX points (from the founder vault after admin unlock)
  const pts = d.points || [];
  const bp = $("lojikxQualityBox");
  if (bp) {
    bp.innerHTML = "";
    const admin = isAdminUser();
    if (admin) {
      const fsc = d.score;
      if (fsc) {
        const head = document.createElement("div");
        head.className = "point-card";
        const bd = fsc.breakdown || {};
        const realm = fsc.realm_of_confidence ? "Realm of Confidence" : "Not yet in the Realm of Confidence";
        head.innerHTML = `<div class="point-head"><div class="point-title">Buffettology Scorecard</div><div class="point-badge ${(Number(fsc.earned) || 0) / (Number(fsc.total) || 23) >= 0.7 ? "YES" : "NO"}">${(fsc.earned != null ? fsc.earned : "?")} / ${fsc.total || 23}</div></div>
          <div class="point-q">${esc(fsc.verdict || "")}</div>
          <div class="point-value" style="white-space:normal">${esc(realm)}</div>
          <div class="point-calc" style="white-space:normal">${esc((bd.passed && bd.passed.length) ? "passed: " + bd.passed.join(", ") : "")}${(bd.failed && bd.failed.length) ? " · failed: " + esc(bd.failed.join(", ")) : ""}</div>`;
        bp.appendChild(head);
      }
      const fcomp = d.computation;
      if (fcomp) {
        const cc = document.createElement("div");
        cc.className = "point-card";
        let ch = `<div class="point-head"><div class="point-title">Computation</div></div>`;
        Object.keys(fcomp).forEach(mk => {
          const mv = fcomp[mk];
          if (mv && typeof mv === "object") {
            ch += `<div class="point-q" style="margin-top:6px">${esc(mk.replace(/_/g, " "))}</div>`;
            Object.keys(mv).forEach(k => { const v2 = mv[k]; if (v2 != null) ch += `<div class="point-calc">${esc(k.replace(/_/g, " "))}: ${esc(String(v2))}</div>`; });
          } else if (mv != null) {
            ch += `<div class="point-calc">${esc(mk.replace(/_/g, " "))}: ${esc(String(mv))}</div>`;
          }
        });
        cc.innerHTML = ch;
        bp.appendChild(cc);
      }
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
      card.innerHTML = `<div class="lojikx-prose-title">LojikX™ Proprietary Quality Synthesis</div><p class="lojikx-prose-body">${esc(d.company || "")} posts a LojikX™ consistency score of ${Math.round((earned / 23) * 100) / 100} / 100, reflecting multi-year earnings and margin durability, ROE/ROCE capital-allocation efficiency, free-cash-flow conversion, and balance-sheet resilience. Detailed proprietary quality checkpoints and valuation models are restricted to authorised institutional accounts.</p>`;
      bp.appendChild(card);
    }
  }
  // sovereign benchmark
  const wts = d.sovereign_bench || {};
  const w = $("whenToSell");
  if (w) {
    w.innerHTML = "";
    const admin = isAdminUser();
    if (admin) {
      const hasWts = (wts && ((wts.current_price !== undefined && wts.current_price !== null) || wts.winner));
      if (hasWts) {
        const card = document.createElement("div");
        card.className = "wts-card";
        let html = `<h4 style="margin-bottom:8px">10-Year Equity vs. Sovereign Yield Comparison</h4>`;
        const rows = [
          ["Current Price", money(d.currency, wts.current_price)],
          ["Years", wts.years],
          ["Sovereign Yield Rate %", wts.tbond_rate_pct],
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
      html += `<p style="margin-top:8px;font-size:12px;color:var(--muted)">High-level summary for public visitors. Detailed 10-Year Equity vs. Sovereign Yield comparison is available to authorised institutional users.</p>`;
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
  await _loadStocksData();
  initScoreRing();
  initSpeedo();
  renderQuickPicks();
  const showcase = state.market === "INDIA" ? "ITC" : "AAPL";
  loadTickerData(showcase);
  refreshAuth();
  ensureFounderData().then(() => { if (state.currentData) renderAll(state.currentData); });
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
window.renderAll = renderAll;
window.state = state;
try{if(typeof window!==undefined&&typeof openModal!==undefined){window.openModal=openModal;}}catch(e){}
// ================= Financial Statements view (screener-style) =================
// Two-layer: top-level tab + sub-tabs (P&L, Balance Sheet, Cash Flows, Analysis, Competitors, Sector KPIs).
// Data comes entirely from each ticker's JSON (hev.forecasts, balance_sheet_summary, settings.competitors).
let FS_STATE = { sub: "pl" };

function fsCAGR(a) {
  if (!a || !a.length) return null;
  const s = a.filter(v => typeof v === "number" && !isNaN(v) && v > 0);
  if (s.length < 2 || s[0] <= 0) return null;
  return (Math.pow(s[s.length - 1] / s[0], 1 / (s.length - 1)) - 1) * 100;
}
function fsAvg(a) {
  if (!a || !a.length) return null;
  const s = a.filter(v => typeof v === "number" && !isNaN(v));
  if (!s.length) return null;
  return s.reduce((x, y) => x + y, 0) / s.length;
}
function fsNum(v, d) {
  d = (d == null) ? 1 : d;
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}
function fsResolve(obj, path) {
  if (!path) return null;
  let o = obj;
  const parts = path.split(".");
  for (let i = 0; i < parts.length; i++) {
    if (o == null) return null;
    o = o[parts[i]];
  }
  return (o == null || o === "") ? null : o;
}

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

function fsStrip(cells) {
  let html = `<div class="fs-strip">`;
  cells.forEach(c => { html += `<div class="cell"><div class="fs-cell-label">${esc(c[0])}</div><div class="fs-cell-val">${c[1]}</div></div>`; });
  html += `</div>`;
  return html;
}

function fsPanelPL(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, set = hev.settings || {};
  const years = f.all_10_years || [];
  const S = f.series || {};
  if (!years.length || !S.revenue) return `<div class="fs-note">No 10-year model data is stored for this company yet.</div>`;
  const nHist = (f.hist_years || years).length;
  const revH = (S.revenue || []).slice(0, nHist), npH = (S.net_profit || []).slice(0, nHist), epsH = (S.eps || []).slice(0, nHist);
  const fcfConv = [];
  const rev = S.revenue || [], np = S.net_profit || [], fcf = S.fcf || [];
  for (let i = 0; i < nHist; i++) { if (np[i] > 0 && fcf[i] != null) fcfConv.push((fcf[i] / np[i]) * 100); }
  const px = d.price_series || [];
  let html = fsStrip([
    ["Revenue CAGR (hist)", fsNum(fsCAGR(revH), 1) + "%"],
    ["Net profit CAGR (hist)", fsNum(fsCAGR(npH), 1) + "%"],
    ["EPS CAGR (hist)", fsNum(fsCAGR(epsH), 1) + "%"],
    ["Price CAGR (stored history)", fsNum(fsCAGR(px), 1) + "%"],
    ["Avg ROE (hist)", fsNum(fsAvg((S.roe_pct || []).slice(0, nHist)), 1) + "%"],
    ["FCF conversion (hist)", fsNum(fsAvg(fcfConv), 0) + "% of net profit"]
  ]);
  html += `<div class="fs-note">Figures in ${esc(set.currency_symbol || "")} ${esc(set.currency_code || "")}, as stored in the company data file. Columns from ${esc(years[nHist] || "FY+1")} onward are modelled years (FY+1 to FY+5).</div>`;
  const rows = [
    ["Revenue", S.revenue, 0], ["Revenue growth %", S.revenue_growth_pct, 1],
    ["Gross margin %", S.gross_margin_pct, 1], ["Operating margin %", S.operating_margin_pct, 1],
    ["Net margin %", S.net_margin_pct, 1], ["Operating profit", S.operating_profit, 0],
    ["Net profit", S.net_profit, 0], ["EPS", S.eps, 2], ["EPS growth %", S.eps_growth_pct, 1],
    ["Dividend / share", S.dps, 2], ["Payout ratio %", S.payout_ratio_pct, 1],
    ["Book value / share", S.book_value_ps, 2], ["ROE %", S.roe_pct, 1], ["ROCE %", S.roce_pct, 1]
  ];
  html += `<table class="report-table fs-table"><thead><tr><th>Line item</th>`;
  years.forEach((y, i) => { html += `<th class="${i >= nHist ? "fs-fc" : ""}">${esc(y)}</th>`; });
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    const arr = r[1] || [];
    html += `<tr><td class="fs-row-label">${esc(r[0])}</td>`;
    years.forEach((y, i) => { html += `<td class="${i >= nHist ? "fs-fc" : ""}">${fsNum(arr[i], r[2])}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function fsPanelBS(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, set = hev.settings || {};
  const bss = f.balance_sheet_summary || {};
  const trend = bss.trend || [];
  const S = f.series || {};
  if (!trend.length && !S.equity) return `<div class="fs-note">No balance sheet data is stored for this company yet.</div>`;
  let html = `<div class="fs-note">Asset composition and ratios as stored. The data file carries balance-sheet composition (percent of total assets) plus equity, net debt, share count and book value, not absolute line items.</div>`;
  if (bss.latest) {
    const l = bss.latest;
    html += fsStrip([
      ["Latest year", esc(l.year || "—")],
      ["Cash", fsNum(l.cash_pct, 1) + "% of assets"],
      ["Receivables", fsNum(l.receivables_pct, 1) + "% of assets"],
      ["Inventory", fsNum(l.inventory_pct, 1) + "% of assets"],
      ["Net fixed assets", fsNum(l.net_ppe_pct, 1) + "% of assets"],
      ["Debt / equity", fsNum(l.debt_to_equity, 2)],
      ["Current ratio", fsNum(l.current_ratio, 2)],
      ["Asset check", esc(l.asset_check || "—") + (l.balanced ? " (balanced)" : "")]
    ]);
  }
  if (trend.length) {
    html += `<table class="report-table fs-table"><thead><tr><th>Year</th><th>Cash %</th><th>Receivables %</th><th>Inventory %</th><th>Net PPE %</th><th>Other assets %</th><th>Debt / equity</th><th>Current ratio</th><th>Quick ratio</th></tr></thead><tbody>`;
    trend.forEach(t => {
      html += `<tr><td class="fs-row-label">${esc(t.year)}</td><td>${fsNum(t.cash_pct, 1)}</td><td>${fsNum(t.receivables_pct, 1)}</td><td>${fsNum(t.inventory_pct, 1)}</td><td>${fsNum(t.net_ppe_pct, 1)}</td><td>${fsNum(t.other_assets_pct, 1)}</td><td>${fsNum(t.debt_to_equity, 2)}</td><td>${fsNum(t.current_ratio, 2)}</td><td>${fsNum(t.quick_ratio, 2)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  if (S.equity) {
    const years = f.all_10_years || [];
    html += `<table class="report-table fs-table"><thead><tr><th>Year</th><th>Equity</th><th>Net debt</th><th>Shares</th><th>Book value / share</th></tr></thead><tbody>`;
    years.forEach((y, i) => {
      html += `<tr><td class="fs-row-label">${esc(y)}</td><td>${fsNum((S.equity || [])[i], 0)}</td><td>${fsNum((S.net_debt || [])[i], 0)}</td><td>${fsNum((S.shares || [])[i], 0)}</td><td>${fsNum((S.book_value_ps || [])[i], 2)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  return html;
}

function fsPanelCF(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, set = hev.settings || {};
  const S = f.series || {}, years = f.all_10_years || [];
  if (!S.cfo) return `<div class="fs-note">No cash flow data is stored for this company yet.</div>`;
  const nHist = (f.hist_years || years).length;
  const rev = S.revenue || [], cfo = S.cfo || [], capex = S.capex || [], fcf = S.fcf || [];
  const fcfH = fcf.slice(0, nHist), npH = (S.net_profit || []).slice(0, nHist);
  const conv = [];
  for (let i = 0; i < nHist; i++) { if (npH[i] > 0 && fcfH[i] != null) conv.push((fcfH[i] / npH[i]) * 100); }
  let html = fsStrip([
    ["Avg CFO (hist)", fsNum(fsAvg(cfo.slice(0, nHist)), 0)],
    ["Avg capex (hist)", fsNum(fsAvg(capex.slice(0, nHist)), 0)],
    ["Avg FCF (hist)", fsNum(fsAvg(fcfH), 0)],
    ["FCF conversion (hist)", fsNum(fsAvg(conv), 0) + "% of net profit"],
    ["Avg capex / revenue", fsNum(fsAvg(capex.slice(0, nHist).map((c, i) => rev[i] > 0 ? (c / rev[i]) * 100 : null)), 1) + "%"]
  ]);
  html += `<div class="fs-note">Cash flows in ${esc(set.currency_symbol || "")} ${esc(set.currency_code || "")}. The data file carries operating cash flow, capital expenditure and free cash flow; investing and financing lines are not stored.</div>`;
  html += `<table class="report-table fs-table"><thead><tr><th>Year</th><th>Cash from operations</th><th>Capex</th><th>Free cash flow</th><th>FCF margin %</th><th>Capex / revenue %</th></tr></thead><tbody>`;
  years.forEach((y, i) => {
    const fcfM = (rev[i] > 0 && fcf[i] != null) ? (fcf[i] / rev[i]) * 100 : null;
    const cxR = (rev[i] > 0 && capex[i] != null) ? (capex[i] / rev[i]) * 100 : null;
    html += `<tr><td class="fs-row-label ${i >= nHist ? "fs-fc" : ""}">${esc(y)}</td><td>${fsNum(cfo[i], 0)}</td><td>${fsNum(capex[i], 0)}</td><td>${fsNum(fcf[i], 0)}</td><td>${fsNum(fcfM, 1)}</td><td>${fsNum(cxR, 1)}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function fsPanelAN(d) {
  const hev = d.hev || {}, f = hev.forecasts || {}, set = hev.settings || {};
  const S = f.series || {}, years = f.all_10_years || [];
  const nHist = (f.hist_years || years).length;
  if (!isAdminUser()) {
    return `<div class="lojikx-prose-card"><div class="lojikx-prose-title">Analysis Notes</div><p class="lojikx-prose-body">Derived statement analysis (scissors effect, working capital reading, capex and financing analysis, leverage classification) is available to authorised accounts. The statement tables themselves are open.</p></div>`;
  }
  let html = `<div class="fs-note">Method notes quote the source texts verbatim. Sources: Financial Analysis.pdf (FIRST FINANCE INSTITUTE), cited "FA p.N"; Marc Bertoneche &amp; Rory Knight, Financial Performance, cited "BK p.N". Page numbers are PDF pages. Sentences introduced with "Read on this company's series:" are computed from the stored data, not from the books.</div>`;
  // 1. Margin structure
  const cw = (hev.charts_23 || {}).c16_cost_waterfall;
  if (cw) {
    html += `<h4>Margin structure — where each unit of revenue goes (latest modelled year)</h4>`;
    html += `<table class="report-table"><thead><tr><th>Component</th><th>% of revenue</th><th>Amount</th></tr></thead><tbody>`;
    (cw.labels || []).forEach((lab, i) => {
      html += `<tr><td>${esc(lab)}</td><td>${fsNum((cw.series.pct_of_revenue || [])[i], 2)}</td><td>${fsNum((cw.series.amount || [])[i], 0)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }
  // 2. Scissors effect
  const rg = (S.revenue_growth_pct || []).slice(1, nHist), ng = (S.eps_growth_pct || []).slice(1, nHist);
  const nm = (S.net_margin_pct || []).slice(0, nHist);
  const rgA = fsAvg(rg), ngA = fsAvg(ng);
  let verdict = "";
  if (rgA != null && ngA != null) {
    verdict = (ngA < rgA - 2)
      ? `Read on this company's series: net profit has grown slower than revenue on average (${fsNum(ngA,1)}% vs ${fsNum(rgA,1)}%); the scissors are opening.`
      : `Read on this company's series: profit growth has kept pace with or beaten revenue growth (${fsNum(ngA,1)}% vs ${fsNum(rgA,1)}%); no scissors gap is visible in the stored series.`;
  }
  html += `<h4>The scissors effect — do costs grow faster than sales?</h4>`;
  html += `<table class="report-table"><thead><tr><th>Year</th><th>Revenue growth %</th><th>Net margin %</th><th>EPS growth %</th></tr></thead><tbody>`;
  years.forEach((y, i) => {
    if (i >= nHist) return;
    html += `<tr><td>${esc(y)}</td><td>${fsNum((S.revenue_growth_pct || [])[i], 1)}</td><td>${fsNum(nm[i], 1)}</td><td>${fsNum((S.eps_growth_pct || [])[i], 1)}</td></tr>`;
  });
  html += `</tbody></table><p class="fs-note">${esc(verdict)} Historical net margin floor: ${fsNum(Math.min.apply(null, nm.filter(v => typeof v === "number")), 1)}%.</p>`;
  html += `<p class="fs-note">Framework reference: FA p.2, section "THE SCISSORS EFFECT". The source's scissors pages are image-only in the PDF, so the framework is cited by section, not quoted.</p>`;
  // 3. Working capital reading
  const bss = f.balance_sheet_summary || {}, trend = bss.trend || [];
  if (trend.length) {
    html += `<h4>Reading working capital between the lines</h4>`;
    html += `<p class="fs-note">"In finance, investment means creating either new fixed assets or working capital." (FA p.27) "The ratio: Operating working capital / Annual Sales reflects the fact that the operating cycle generates an operating working capital that includes: Capital 'frozen' in the form of inventories, representing procurement and production costs that have not yet resulted in the sale of the company's products; Funds 'frozen' in customer receivables, representing sales that customers have not yet paid for; Accounts payable that the company owes to suppliers." (FA p.27) "Working capital is two-sided. From the point of view of balance sheet value, it is liquid. From a going-concern point of view, it is permanent." (FA p.28) "Analyzing how the requirement has changed from year end to year end can shed light on whether the company's operations are improving or deteriorating." (FA p.29)</p>`;
    html += `<table class="report-table"><thead><tr><th>Year</th><th>Current ratio</th><th>Quick ratio</th><th>Receivables % of assets</th><th>Inventory % of assets</th></tr></thead><tbody>`;
    trend.forEach(t => { html += `<tr><td>${esc(t.year)}</td><td>${fsNum(t.current_ratio, 2)}</td><td>${fsNum(t.quick_ratio, 2)}</td><td>${fsNum(t.receivables_pct, 1)}</td><td>${fsNum(t.inventory_pct, 1)}</td></tr>`; });
    html += `</tbody></table>`;
    const crTrend = trend.map(t => t.current_ratio).filter(v => typeof v === "number");
    if (crTrend.length >= 2) {
      const dCR = crTrend[crTrend.length - 1] - crTrend[0];
      html += `<p class="fs-note">Read on this company's series: the current ratio moved from ${fsNum(crTrend[0], 2)} to ${fsNum(crTrend[crTrend.length - 1], 2)} over the stored years (${dCR >= 0 ? "+" : ""}${fsNum(dCR, 2)}).</p>`;
    }
  }
  // 4. Capex analysis
  if (S.capex) {
    const rev = S.revenue || [], capex = S.capex || [];
    html += `<h4>Capital expenditure analysis</h4>`;
    html += `<p class="fs-note">"Through the production process, fixed assets are used up. The annual depreciation charge is supposed to reflect this wearing out. By comparing capital expenditure with depreciation charges, you can determine whether the company is: Expanding its industrial base by increasing production capacity. In this case, capital expenditure is higher than depreciation as the company invests more than simply to compensate for the annual wearing out of fixed assets; Maintaining its industrial base, replacing production capacity as necessary. In this case, capital expenditure approximately equals depreciation as the company invests just to compensate for the annual wearing out of fixed assets; Underinvesting or divesting (capital expenditure below depreciation). This situation can only be temporary or the company's future will be in danger, unless the objective is to liquidate the company." (FA p.35) "Any investment strategy must, sooner or later, result in an increase in cash flow from operating activities. If it doesn't, then the investments are not profitable enough. The company is heading for trouble or, more likely, is already in trouble." (FA p.35)</p>`;
    html += `<table class="report-table"><thead><tr><th>Year</th><th>Capex</th><th>Capex / revenue %</th><th>Net PPE % of assets</th></tr></thead><tbody>`;
    years.forEach((y, i) => {
      if (i >= nHist) return;
      const cxR = (rev[i] > 0 && capex[i] != null) ? (capex[i] / rev[i]) * 100 : null;
      const ppe = trend.length ? (trend.find(t => String(t.year) === String(years[i])) || {}).net_ppe_pct : null;
      html += `<tr><td>${esc(y)}</td><td>${fsNum(capex[i], 0)}</td><td>${fsNum(cxR, 1)}</td><td>${fsNum(ppe, 1)}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<p class="fs-note">Read on this company's series: the stored cash flow data does not split expansion capex from replacement capex, and no depreciation series is stored, so the FA expansion/maintenance/underinvestment test above cannot be run here; judge investment policy from capex intensity against revenue and the fixed-asset share of the balance sheet.</p>`;
  }
  // 5. Financing and leverage
  const dcf = (hev.valuation || {}).dcf || {};
  const deTrend = trend.map(t => t.debt_to_equity).filter(v => typeof v === "number");
  html += `<h4>How the company is financed, and the leverage group</h4>`;
  html += `<p class="fs-note">"As an analyst, you must understand how the company finances its growth over the period in question. New equity capital? New debt? Reinvesting cash flow from operating activities? Asset disposals can contribute additional financial resources." (FA p.51) "You should focus on three items for this analysis: equity capital issues, debt policy and dividend policy." (FA p.51)</p>`;
  if (deTrend.length) {
    html += `<table class="report-table"><thead><tr><th>Year</th><th>Debt / equity</th></tr></thead><tbody>`;
    trend.forEach(t => { html += `<tr><td>${esc(t.year)}</td><td>${fsNum(t.debt_to_equity, 2)}</td></tr>`; });
    html += `</tbody></table>`;
  }
  const nd = (S.net_debt || [])[0], roceH = fsAvg((S.roce_pct || []).slice(0, nHist)), kd = dcf.kd_after_tax;
  let lev = "Leverage group could not be classified from the stored data.";
  if (nd != null && !isNaN(nd) && nd <= 0) lev = "Read on this company's series: net cash position (more cash than debt); the company funds itself internally.";
  else if (roceH != null && kd != null) lev = (kd > roceH)
    ? `Read on this company's series: after-tax cost of debt (${fsNum(kd,2)}%) exceeds average ROCE (${fsNum(roceH,1)}%).`
    : `Read on this company's series: after-tax cost of debt (${fsNum(kd,2)}%) sits below average ROCE (${fsNum(roceH,1)}%).`;
  html += `<p class="fs-note">${esc(lev)} WACC ${fsNum(dcf.wacc,2)}%, beta ${fsNum(dcf.beta,2)}, tax rate ${fsNum(dcf.tax_rate,1)}% (from the DCF block).</p>`;
  const roeS = (S.roe_pct || []).slice(0, nHist).filter(v => typeof v === "number");
  const rocS = (S.roce_pct || []).slice(0, nHist).filter(v => typeof v === "number");
  if (roeS.length >= 2 && rocS.length >= 2) {
    html += `<p class="fs-note">The source's four leverage groups, verbatim (FA pp.71-72):</p>`;
    html += `<p class="fs-note">"Group1: Has an ROE which is increasing. But ROCE is going down meaning its doing badly but doing something like an old woman using artificial make up (increasing debt) to cover the wrinkles to fool their friends. Look at ROE and ROCE at any time."</p>`;
    html += `<p class="fs-note">"Group 2: It shows a very stable ROE which is very satisfactory. ROCE is stable to0 and equal to ROE. This means there's no debt, everything is coming from operations. Not only the company is very safe but also it has a great flexibility for the future. The company can us its debt potential to face some of its temporary problems."</p>`;
    html += `<p class="fs-note">"Group 3: ROE is slightly going down. 15% to 13%, not a dramatic decrease. Look at ROCE, we notice a small increase from 20% to 21% and higher than ROE, whats going on? –Two possibilities theoretically, 1. A negative leverage. The company is borrowing at a rate higher than ROCE (or) 2. The company has a negative net financial debt i.e. more cash than debt. May be the company is investing part of its cash at other projects which gets a lower return, so the ROE is going down. This is a strong signal to the share holders who should push the management of the company either to find good investment opportunities to invest this cash or give it back to them through dividends etc,"</p>`;
    html += `<p class="fs-note">"Group 4: ROE is extremely stable and high at 40%. ROCE is good and stable at 15%. Its massively playing with debt. May be a typical LBO as we call it – Leverage Buy Out – A company with a lot of debt. In fact, 1/3 of the performance of this company is coming from operations and 2/3 from finance- the leverage. Great but risky. Group 4 is very vulnerable. Try to imagine the impact of an economic downturn."</p>`;
    html += `<p class="fs-note">Read on this company's series: ROE ${fsNum(roeS[0],1)}% to ${fsNum(roeS[roeS.length-1],1)}%, ROCE ${fsNum(rocS[0],1)}% to ${fsNum(rocS[rocS.length-1],1)}% over the stored years; judge the group from the four descriptions above.</p>`;
    html += `<p class="fs-note">"Conclusion: First, look at where the performance is coming from, operations or finance or both. Second, the risk return trade off. Thirdly, flexibility- keep flexibility for the future. Finally, understand the relationship b/w profitability and growth i.e. SSG" (FA p.72)</p>`;
  }
  // 6. Frameworks from the Financial Performance book (Bertoneche & Knight)
  html += `<h4>Frameworks from the Financial Performance book (Bertoneche &amp; Knight)</h4>`;
  const niL = (S.net_profit || [])[nHist - 1], revL = (S.revenue || [])[nHist - 1], eqL = (S.equity || [])[nHist - 1];
  if (typeof niL === "number" && typeof revL === "number" && revL > 0 && typeof eqL === "number" && eqL > 0) {
    const npm = (niL / revL) * 100, et = revL / eqL, roeD = (niL / eqL) * 100;
    const pay = (S.payout_ratio_pct || [])[nHist - 1];
    const sg = (roeD >= 0 && typeof pay === "number") ? roeD * (1 - pay / 100) : null;
    html += `<p class="fs-note">"Figure 3.3 illustrates the critical drivers of return on equity. This format, known as the duPont chart, provides a coherent framework to illustrate the interconnection among three dimensions of financial health." (BK p.100) "Thus ROI is jointly effected by both profitability (net profit %) and by efficiency (asset turnover)." (BK p.100)</p>`;
    html += `<table class="report-table"><thead><tr><th>Driver</th><th>Value</th><th>Source wording</th></tr></thead><tbody>`;
    html += `<tr><td>Net profit margin</td><td>${fsNum(npm, 2)}%</td><td>"net profit % as the proportion of profit to sales which entirely reflects the profitability of the business" (BK p.100)</td></tr>`;
    html += `<tr><td>Equity turnover</td><td>${fsNum(et, 2)}x</td><td>"Asset turnover reveals how efficiently the asset base has been worked to generate business as measured by sales. This measure is quite independent of profitability." (BK p.100)</td></tr>`;
    html += `<tr><td>ROE (margin x turnover)</td><td>${fsNum(roeD, 2)}%</td><td>the duPont chart, computed here as net profit margin x equity turnover</td></tr>`;
    if (sg != null) html += `<tr><td>Sustainable growth rate</td><td>${fsNum(sg, 2)}%</td><td>"Sustainable growth rate (sgr) = ROE × rr" (BK p.103), with rr = 1 - payout ratio (${fsNum(pay, 0)}% payout)</td></tr>`;
    html += `</tbody></table>`;
    html += `<p class="fs-note">"The mid- to long-term funding requirements of a business are fundamentally driven by the sustainable growth of the business." (BK p.102) "Clearly a business that pays out all of its earnings as dividends will not be able to sustain any growth without resorting to further financing in the form of debt or equity capital." (BK p.103)</p>`;
  }
  const roceL = (S.roce_pct || [])[nHist - 1], waccV = (dcf || {}).wacc;
  if (typeof roceL === "number" && typeof waccV === "number") {
    const spread = roceL - waccV;
    html += `<h4>Value creation - the EVA spread</h4>`;
    html += `<p class="fs-note">"EVA measures the spread between return on capital employed and cost of capital." (BK p.138) "In other words, ROCE has to be higher than cost of capital." (BK p.138)</p>`;
    html += `<p class="fs-note">Read on this company's series: ROCE ${fsNum(roceL, 1)}% against WACC ${fsNum(waccV, 2)}% gives a spread of <strong>${fsNum(spread, 1)}%</strong>.</p>`;
  }
  html += `<p class="fs-note">Cross-references: the Forensic tab holds the 17-point accounting audit; the Fraud Radar sub-tab adds the Beneish M-Score components and a Benford's Law digit audit on top.</p>`;
  return html;
}
function fsPanelPE(d) {
  const hev = d.hev || {}, set = hev.settings || {};
  const peers = set.competitors || [];
  if (!peers.length) return `<div class="fs-note">No competitor set is stored for this company.</div>`;
  const vp = (hev.valuation || {}).pe || {};
  const peerAvg = vp.peer_avg_pe;
  let html = `<div class="fs-note">${peers.length} stored competitors, compared on every metric the data file carries for each of them.</div>`;
  html += `<table class="report-table"><thead><tr><th>Company</th><th>Ticker</th><th>Market</th><th>Sector</th><th>Market cap</th><th>P/E</th><th>Quality (of 23)</th><th>P/E vs peer avg</th></tr></thead><tbody>`;
  const qSub = set.quality_earned != null ? set.quality_earned : null;
  const peSub = vp.current_pe != null ? vp.current_pe : set.pe;
  html += `<tr class="fs-subj-row"><td>${esc(set.company || "")} (this stock)</td><td>${esc(set.ticker || "")}</td><td>${esc(set.market || "")}</td><td>${esc(set.sector || "")}</td><td>${fsNum(set.market_cap, 0)}</td><td>${fsNum(peSub, 2)}</td><td>${fsNum(qSub, 0)}</td><td>${(peerAvg != null && peSub != null) ? fsNum(peSub - peerAvg, 2) : "—"}</td></tr>`;
  peers.forEach(p => {
    html += `<tr><td>${esc(p.company || "")}</td><td>${esc(p.ticker || "")}</td><td>${esc(p.market || "")}</td><td>${esc(p.sector || "")}</td><td>${fsNum(p.market_cap, 0)}</td><td>${fsNum(p.pe, 2)}</td><td>${fsNum(p.quality_score, 0)}</td><td>${(peerAvg != null && p.pe != null) ? fsNum(p.pe - peerAvg, 2) : "—"}</td></tr>`;
  });
  if (peerAvg != null) html += `<tr class="fs-avg-row"><td colspan="5">Peer average P/E</td><td>${fsNum(peerAvg, 2)}</td><td></td><td></td></tr>`;
  html += `</tbody></table>`;
  return html;
}

function fsPanelKPI(d) {
  const hev = d.hev || {}, set = hev.settings || {}, f = hev.forecasts || {};
  const S = f.series || {}, years = f.all_10_years || [];
  const nHist = (f.hist_years || years).length;
  const industry = (set.industry || "") + " " + (set.sector || "");
  let rows = [];
  FS_KPI_TEMPLATES.forEach(t => { if (t.match.test(industry)) rows = rows.concat(t.kpis); });
  const present = rows.map(r => [r[0], fsResolve(hev, r[1])]).filter(r => r[1] != null);
  let html = `<div class="fs-note">Sector-specific operating KPIs, screener-style: what needs checking for THIS kind of business. Rows render when the company data file carries the field.</div>`;
  if (present.length) {
    html += `<table class="report-table"><thead><tr><th>Operating KPI</th><th>Value</th></tr></thead><tbody>`;
    present.forEach(r => { html += `<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td></tr>`; });
    html += `</tbody></table>`;
  } else {
    html += `<div class="lojikx-prose-card"><div class="lojikx-prose-title">No sector KPI fields stored yet for ${esc(set.company || "this company")}</div><p class="lojikx-prose-body">The layer is live: add fields such as deposits (banks), wells drilled (oil), store count (retail) or headcount (IT) to the company's data file and they appear here automatically, matched to the industry.</p></div>`;
  }
  // Always-on derived KPIs from the stored series
  const revH = (S.revenue || []).slice(0, nHist), npH = (S.net_profit || []).slice(0, nHist), epsH = (S.eps || []).slice(0, nHist);
  const payout = (S.payout_ratio_pct || []).slice(0, nHist);
  const bv = (S.book_value_ps || []).slice(0, nHist);
  const px = d.price_series || [];
  const fcfH = (S.fcf || []).slice(0, nHist);
  const conv = [];
  for (let i = 0; i < nHist; i++) { if (npH[i] > 0 && fcfH[i] != null) conv.push((fcfH[i] / npH[i]) * 100); }
  html += `<h4>Derived KPIs (computed from the stored series)</h4>`;
  html += `<table class="report-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`;
  html += `<tr><td>Revenue CAGR (hist)</td><td>${fsNum(fsCAGR(revH), 1)}%</td></tr>`;
  html += `<tr><td>Net profit CAGR (hist)</td><td>${fsNum(fsCAGR(npH), 1)}%</td></tr>`;
  html += `<tr><td>EPS CAGR (hist)</td><td>${fsNum(fsCAGR(epsH), 1)}%</td></tr>`;
  html += `<tr><td>Book value CAGR (hist)</td><td>${fsNum(fsCAGR(bv), 1)}%</td></tr>`;
  html += `<tr><td>Average payout ratio (hist)</td><td>${fsNum(fsAvg(payout), 1)}%</td></tr>`;
  html += `<tr><td>FCF conversion (hist)</td><td>${fsNum(fsAvg(conv), 0)}% of net profit</td></tr>`;
  html += `<tr><td>Price CAGR (stored history)</td><td>${fsNum(fsCAGR(px), 1)}%</td></tr>`;
  html += `</tbody></table>`;
  return html;
}

function fsPanel(sub, d) {
  if (sub === "pl") return fsPanelPL(d);
  if (sub === "bs") return fsPanelBS(d);
  if (sub === "cf") return fsPanelCF(d);
  if (sub === "an") return fsPanelAN(d);
  if (sub === "pe") return fsPanelPE(d);
  if (sub === "kpi") return fsPanelKPI(d);
  if (sub === "fr") return fsPanelFR(d);
  return "";
}

function renderFinancials(d) {
  const box = $("view-financials");
  if (!box) return;
  const hev = d.hev || {}, set = hev.settings || {};
  const subs = [["pl", "Profit & Loss"], ["bs", "Balance Sheet"], ["cf", "Cash Flows"], ["an", "Analysis Notes"], ["pe", "Competitors"], ["fr", "Fraud Radar"], ["kpi", "Sector KPIs"]];
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "card glass";
  const head = document.createElement("div");
  head.innerHTML = `<div class="card-title">Financial Statements — ${esc(set.company || "")} (${esc(set.ticker || "")})</div>`
    + `<div class="fs-note">${esc(set.company || "")} · ${esc(set.industry || "")} · ${esc(set.sector || "")} · ${esc(set.market || "")}</div>`;
  wrap.appendChild(head);
  const bar = document.createElement("div");
  bar.className = "fs-subtabs";
  subs.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "fs-subtab" + (s[0] === FS_STATE.sub ? " active" : "");
    btn.dataset.sub = s[0];
    btn.textContent = s[1];
    btn.addEventListener("click", () => {
      FS_STATE.sub = s[0];
      bar.querySelectorAll(".fs-subtab").forEach(b => b.classList.toggle("active", b === btn));
      const host = $("fsPanelHost");
      if (host) host.innerHTML = fsPanel(FS_STATE.sub, d);
    });
    bar.appendChild(btn);
  });
  wrap.appendChild(bar);
  const host = document.createElement("div");
  host.id = "fsPanelHost";
  host.innerHTML = fsPanel(FS_STATE.sub, d);
  wrap.appendChild(host);
  box.appendChild(wrap);
}
// ================= end Financial Statements view =================

