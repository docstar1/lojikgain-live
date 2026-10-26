// LojikGain Live — static GitHub Pages + Flask/Render aware
const UPI_DEFAULT = "lojikgain@upi";
let BACKEND = false;
let UPI_ID = UPI_DEFAULT;
let GOOGLE_CLIENT_ID = "";
let currentUser = null;
let STOCKS = {};          // ticker -> sanitized analysis
let selectedTicker = null;
let marketFilter = "AUTO";
let priceChart = null, fgChart = null;

const $ = (id) => document.getElementById(id);

async function detectBackend() {
  try {
    const r = await fetch("/api/config", { cache: "no-store" });
    if (r.ok) {
      const cfg = await r.json();
      BACKEND = true;
      UPI_ID = cfg.upi_id || UPI_DEFAULT;
      GOOGLE_CLIENT_ID = cfg.google_client_id || "";
    }
  } catch (e) { BACKEND = false; }
  $("upiId").textContent = UPI_ID;
}

// ---------- Auth (dual mode) ----------
function staticLoadUser() {
  try { return JSON.parse(localStorage.getItem("lojik_user") || "null"); } catch { return null; }
}
function staticSaveUser(u) { localStorage.setItem("lojik_user", JSON.stringify(u)); }
function staticTrialDaysLeft(u) {
  if (!u) return 0;
  if (u.is_paid) return 999;
  const end = new Date(u.trial_end);
  const now = new Date();
  const ms = end - now;
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86400000));
}
function staticAccessGranted(u) {
  if (!u) return false;
  if (u.is_paid) return true;
  return staticTrialDaysLeft(u) > 0;
}

async function authRegister(email, name, password, provider) {
  if (BACKEND) {
    const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "register failed");
    return data;
  }
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 86400000);
  const u = { id: Date.now(), email: email.toLowerCase().trim(), name: name || email.split("@")[0],
    auth_provider: provider, created_at: now.toISOString(), trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(), is_paid: false, utr: null };
  staticSaveUser(u);
  return { authenticated: true, user: { ...u, trial_days_left: 7, trial_expired: false, access_granted: true, plan_type: null } };
}
async function authLogin(email, password) {
  if (BACKEND) {
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "login failed");
    return data;
  }
  const u = staticLoadUser();
  if (!u || u.email !== email.toLowerCase().trim()) throw new Error("No account found. Register first.");
  // password not strictly checked in static demo
  return { authenticated: true, user: { ...u, trial_days_left: staticTrialDaysLeft(u), trial_expired: !staticAccessGranted(u) && !u.is_paid, access_granted: staticAccessGranted(u), plan_type: u.is_paid ? "pro" : null } };
}
async function authGoogle(email, name) {
  if (BACKEND) {
    const r = await fetch("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, credential: "" }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "google failed");
    return data;
  }
  const existing = staticLoadUser();
  if (existing && existing.email === email.toLowerCase().trim()) {
    return { authenticated: true, user: { ...existing, trial_days_left: staticTrialDaysLeft(existing), trial_expired: !staticAccessGranted(existing) && !existing.is_paid, access_granted: staticAccessGranted(existing), plan_type: existing.is_paid ? "pro" : null } };
  }
  return authRegister(email, name, "", "google");
}
async function authMe() {
  if (BACKEND) {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch {}
    return { authenticated: false, user: null };
  }
  const u = staticLoadUser();
  if (!u) return { authenticated: false, user: null };
  return { authenticated: true, user: { ...u, trial_days_left: staticTrialDaysLeft(u), trial_expired: !staticAccessGranted(u) && !u.is_paid, access_granted: staticAccessGranted(u), plan_type: u.is_paid ? "pro" : null } };
}
async function authLogout() {
  if (BACKEND) { try { await fetch("/api/auth/logout", { method: "POST" }); } catch {} }
  localStorage.removeItem("lojik_user");
  currentUser = null;
}
async function simulateExpiry(expired) {
  if (BACKEND) {
    const r = await fetch("/api/auth/simulate-expiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expired }) });
    return r.json();
  }
  const u = staticLoadUser();
  if (!u) return null;
  if (expired) u.trial_end = new Date(Date.now() - 86400000).toISOString();
  else u.trial_end = new Date(Date.now() + 7 * 86400000).toISOString();
  staticSaveUser(u);
  return { authenticated: true, user: { ...u, trial_days_left: staticTrialDaysLeft(u), trial_expired: !staticAccessGranted(u) && !u.is_paid, access_granted: staticAccessGranted(u), plan_type: u.is_paid ? "pro" : null } };
}
async function verifyUtr(utr) {
  if (BACKEND) {
    const r = await fetch("/api/pay/verify-upi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ utr }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "verify failed");
    return data;
  }
  if (!/^\d{12}$/.test(utr)) throw new Error("UTR must be a 12-digit number.");
  const u = staticLoadUser();
  if (!u) throw new Error("Not logged in.");
  // uniqueness check via localStorage list
  const used = JSON.parse(localStorage.getItem("lojik_used_utrs") || "[]");
  if (used.includes(utr)) throw new Error("This UTR has already been used.");
  u.is_paid = true; u.utr = utr; u.plan_type = "pro"; u.paid_at = new Date().toISOString();
  staticSaveUser(u);
  used.push(utr); localStorage.setItem("lojik_used_utrs", JSON.stringify(used));
  return { ok: true, message: "Unlocked", status: { authenticated: true, user: { ...u, trial_days_left: 999, trial_expired: false, access_granted: true, plan_type: "pro" } } };
}

// ---------- Data ----------
async function loadStocks() {
  try {
    const r = await fetch("stocks_data.json", { cache: "no-store" });
    if (r.ok) STOCKS = await r.json();
  } catch (e) { STOCKS = {}; }
}

function findStock(key) {
  if (!key) return null;
  const k = key.trim().toUpperCase();
  if (STOCKS[k]) return STOCKS[k];
  // try fuzzy: keys may have spaces
  for (const kk of Object.keys(STOCKS)) {
    if (kk.toUpperCase() === k) return STOCKS[kk];
  }
  return null;
}

async function liveFallback(ticker, market) {
  // best-effort Yahoo chart via allorigins
  const sym = market === "INDIA" ? ticker + ".NS" : ticker;
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?range=1y&interval=1mo";
  const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  try {
    const r = await fetch(proxy);
    if (!r.ok) throw new Error("fetch fail");
    const j = await r.json();
    const res = j.chart && j.chart.result && j.chart.result[0];
    if (!res) throw new Error("no data");
    const q = res.indicators.quote[0];
    const closes = (q.close || []).filter(v => v != null);
    const meta = res.meta || {};
    return {
      company: meta.longName || ticker,
      ticker: ticker,
      market: market,
      currency: meta.currency || "USD",
      sector: "—", industry: "—",
      current_price: meta.regularMarketPrice || closes[closes.length-1],
      high_52w: meta.fiftyTwoWeekHigh || Math.max(...closes),
      low_52w: meta.fiftyTwoWeekLow || Math.min(...closes),
      quality_score: { earned: 0, total: 23, pct: 0, band_label: "Live fallback (unscored)", tier: "low" },
      fear_greed: { score: 50, zone_label: "Neutral Zone", tier: "neutral" },
      price_series: closes.slice(-36),
    };
  } catch (e) {
    return null;
  }
}

async function runAnalysis(ticker, market) {
  // backend mode
  if (BACKEND) {
    const user = currentUser;
    if (!user || !user.access_granted) { openAuth(); return; }
    const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, market }) });
    const data = await r.json();
    if (!r.ok) { $("statusLine").textContent = data.message || data.error || "error"; return; }
    showDetail(data);
    return;
  }
  // static mode
  const u = currentUser;
  if (!u || !u.access_granted) { openAuth(); $("statusLine").textContent = "Please sign in to analyse."; return; }
  $("statusLine").textContent = "Analysing " + ticker + "…";
  let data = findStock(ticker);
  if (!data) {
    const m = market === "AUTO" ? (ticker.match(/^[A-Z&-]+$/) && ["ITC","TCS"].includes(ticker) ? "INDIA" : "USA") : market;
    // heuristic: if in india list
    const indiaList = ["ITC","TCS","INFY","HDFCBANK","ASIANPAINT","TITAN","MARUTI","TATASTEEL","ONGC","NTPC","PIDILITIND","PAGEIND","PERSISTENT","VOLTAS","EIHOTEL","ASHOKLEY","BHEL","SAIL","IDEA","YESBANK","NIFTY 50"];
    const mm = indiaList.includes(ticker.toUpperCase()) ? "INDIA" : (m === "AUTO" ? "USA" : m);
    data = await liveFallback(ticker, mm);
    if (!data) { $("statusLine").textContent = "No data for " + ticker; return; }
  }
  showDetail(data);
  $("statusLine").textContent = "Loaded " + (data.company || ticker);
}

function showDetail(d) {
  $("emptyState").classList.add("hidden");
  $("detail").classList.remove("hidden");
  $("dCompany").textContent = d.company || "—";
  $("dTicker").textContent = d.ticker || "—";
  $("dMarket").textContent = d.market || "—";
  $("dSector").textContent = d.sector || "—";
  $("dIndustry").textContent = d.industry || "—";
  $("dPrice").textContent = (d.current_price != null ? Number(d.current_price).toLocaleString() : "—") + " " + (d.currency || "");
  $("dHigh").textContent = d.high_52w != null ? Number(d.high_52w).toLocaleString() : "—";
  $("dLow").textContent = d.low_52w != null ? Number(d.low_52w).toLocaleString() : "—";
  $("dCurrency").textContent = d.currency || "—";
  const qs = d.quality_score || {};
  $("dScore").textContent = (qs.earned ?? "—") + " / " + (qs.total ?? 23);
  $("dTier").textContent = qs.band_label || qs.tier || "—";
  const fg = d.fear_greed || {};
  $("dFG").textContent = (fg.score ?? "—") + " · " + (fg.zone_label || "");
  $("fgScore").textContent = fg.score ?? "—";
  $("fgZone").textContent = fg.zone_label || "—";
  $("fgTier").textContent = fg.tier || "—";
  // price chart
  const series = d.price_series || [];
  if (priceChart) priceChart.destroy();
  priceChart = new Chart($("priceChart"), {
    type: "line",
    data: { labels: series.map((_,i)=>i+1), datasets: [{ label: "Price", data: series, borderColor: "#3b82f6", tension: .3, pointRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  if (fgChart) fgChart.destroy();
  fgChart = new Chart($("fgChart"), {
    type: "doughnut",
    data: { labels: ["Score","Rest"], datasets: [{ data: [fg.score || 0, 100 - (fg.score || 0)], backgroundColor: ["#3b82f6","#334155"] }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "70%" }
  });
}

// ---------- UI wiring ----------
function renderQuickPicks() {
  const wrap = $("quickPicks");
  wrap.innerHTML = "";
  const keys = Object.keys(STOCKS);
  keys.forEach(k => {
    const d = STOCKS[k];
    const btn = document.createElement("button");
    btn.className = "quick-chip";
    btn.innerHTML = `<span class="chip-sym">${d.ticker || k}</span><span class="chip-name">${d.company || ""}</span>`;
    btn.onclick = () => runAnalysis(d.ticker || k, d.market || "AUTO");
    wrap.appendChild(btn);
  });
}

function updateTrialBar() {
  const bar = $("trialBar");
  if (!currentUser) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  const u = currentUser.user || currentUser;
  const days = u.trial_days_left ?? 0;
  const access = u.access_granted ? "Granted" : "Expired";
  bar.innerHTML = `<span>Signed in as <b>${u.email || u.name || ""}</b></span><span>Trial days left: <b>${u.is_paid ? "∞ (Paid)" : days}</b> · Access: <b>${access}</b></span>`;
}

function openAuth() {
  $("authModal").classList.remove("hidden");
  refreshAuthUI();
}
function closeAuth() { $("authModal").classList.add("hidden"); }

async function refreshAuthUI() {
  const me = await authMe();
  currentUser = me.authenticated ? me : null;
  const status = $("authStatus");
  if (me.authenticated) {
    const u = me.user;
    status.textContent = "Signed in as " + (u.email || u.name);
    $("authForms").classList.add("hidden");
    $("trialSection").classList.remove("hidden");
    $("upiSection").classList.toggle("hidden", !!u.access_granted);
    $("trialDays").textContent = u.is_paid ? "∞ (Paid)" : u.trial_days_left;
    $("accessStatus").textContent = u.access_granted ? "Granted" : "Expired";
    updateTrialBar();
    // update UPI QR
    const upiStr = `upi://pay?pa=${UPI_ID}&pn=LojikGain&am=10&cu=INR`;
    $("upiQr").src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(upiStr);
  } else {
    status.textContent = "Not signed in.";
    $("authForms").classList.remove("hidden");
    $("trialSection").classList.add("hidden");
    $("upiSection").classList.add("hidden");
    updateTrialBar();
  }
}

// ---------- Event listeners ----------
document.addEventListener("DOMContentLoaded", async () => {
  await detectBackend();
  await loadStocks();
  $("statusLine").textContent = `Loaded ${Object.keys(STOCKS).length} stocks from stocks_data.json.`;
  renderQuickPicks();
  await refreshAuthUI();

  // market seg
  document.querySelectorAll(".seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("is-on"));
      b.classList.add("is-on");
      marketFilter = b.dataset.market;
    });
  });

  $("analyseBtn").addEventListener("click", () => {
    const t = $("tickerInput").value.trim();
    if (!t) return;
    runAnalysis(t, marketFilter);
  });
  $("tickerInput").addEventListener("keydown", e => { if (e.key === "Enter") $("analyseBtn").click(); });

  $("authBtn").addEventListener("click", openAuth);
  $("closeAuthBtn").addEventListener("click", closeAuth);

  $("loginBtn").addEventListener("click", async () => {
    try {
      const data = await authLogin($("authEmail").value, $("authPassword").value);
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("registerBtn").addEventListener("click", async () => {
    try {
      const data = await authRegister($("authEmail").value, $("authName").value, $("authPassword").value, "email");
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("googleBtn").addEventListener("click", async () => {
    const email = $("authEmail").value || prompt("Enter your Google email:");
    if (!email) return;
    try {
      const data = await authGoogle(email, $("authName").value);
      currentUser = data;
      await refreshAuthUI();
    } catch (e) { $("authStatus").textContent = e.message; $("authStatus").className = "err"; }
  });
  $("logoutBtn").addEventListener("click", async () => { await authLogout(); currentUser = null; await refreshAuthUI(); });
  $("testExpiryBtn").addEventListener("click", async () => {
    const data = await simulateExpiry(true);
    if (data) { currentUser = data; await refreshAuthUI(); }
  });
  $("resetTrialBtn").addEventListener("click", async () => {
    const data = await simulateExpiry(false);
    if (data) { currentUser = data; await refreshAuthUI(); }
  });
  $("verifyUtrBtn").addEventListener("click", async () => {
    const utr = $("utrInput").value.trim();
    const msg = $("upiMsg");
    try {
      const data = await verifyUtr(utr);
      msg.textContent = data.message || "Unlocked!";
      msg.className = "ok";
      // refresh user
      const me = await authMe();
      currentUser = me.authenticated ? me : null;
      await refreshAuthUI();
    } catch (e) { msg.textContent = e.message; msg.className = "err"; }
  });

  $("themeToggle").addEventListener("click", () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark";
  });
});