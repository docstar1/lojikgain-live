(function(){let D=null;async function load(){if(D)return D;const r=await fetch('./founder_data.json');D=await r.json();return D;}function sym(input,init){try{const url=typeof input==='string'?input:(input&&input.url);if(url){const u=new URL(url,location.href);let s=u.searchParams.get('symbol')||u.searchParams.get('sym')||u.searchParams.get('ticker');if(s)return s;const parts=u.pathname.split('/').filter(Boolean);const last=parts[parts.length-1];if(last&&!['analyze','personal','search','companies'].includes(last))return last;}if(init&&init.body){try{const j=JSON.parse(init.body);return j.symbol||j.sym||j.ticker;}catch(e){}}}catch(e){}return null;}const orig=window.fetch.bind(window);window.fetch=function(input,init){try{const url=typeof input==='string'?input:(input&&input.url);if(url&&(/\/api\/(personal\/)?analyze/.test(url))){const s=sym(input,init);return load().then(d=>{const p=(s&&d[s])?d[s]:d;return new Response(JSON.stringify(p),{status:200,headers:{'Content-Type':'application/json'}});});}if(url&&url.indexOf('/api/search')!==-1){const q=(()=>{try{return new URL(url,location.href).searchParams.get('q')||'';}catch(e){return '';}})();return load().then(d=>{const res=Object.keys(d||{}).filter(k=>!q||k.toLowerCase().includes(q.toLowerCase())||((d[k].name||'').toLowerCase().includes(q.toLowerCase()))).map(k=>({symbol:k,name:d[k].name||k}));return new Response(JSON.stringify({query:q,results:res}),{status:200,headers:{'Content-Type':'application/json'}});});}if(url&&url.indexOf('/api/companies')!==-1){return load().then(d=>{const list=Object.keys(d||{}).map(k=>({symbol:k,name:d[k].name||k}));return new Response(JSON.stringify(list),{status:200,headers:{'Content-Type':'application/json'}});});}}catch(e){}return orig(input,init);};})();
/* ==========================================================================
   LojikLab — Buffettology Investment Analysis Engine
   Front-end controller. Vanilla ES6, no build step, no framework.

   JSON contract: lojiklab/API_CONTRACT.md  (POST /api/analyze)
   ========================================================================== */
(function () {
  'use strict';

  /* ====================================================================== *
   * 0. Constants & state
   * ====================================================================== */

  var API = {
    analyze: '/api/personal/analyze',
    samples: '/api/samples',
    exportExcel: '/api/export_excel',
    search: '/api/search',
    shutdown: '/api/shutdown'
  };

  var LS_THEME = 'lojiklab.apple_theme';
  var LS_SELL = 'lojiklab.sell.conditions';

  var state = {
    data: null,
    edits: {},            // { [pointId]: { score: 1|0, value: '…', note: '…' } }
    tbondRateOverride: null,
    theme: 'light',
    uploadFile: null,
    pointById: {},
    charts: {},           // { [canvasId]: Chart }
    activePanel: 'panel-summary'
  };

  var SCORED_TOTAL = 23;

  var GROUP_COLORS = {
    'Group 1': 'var(--g1)',
    'Group 2': 'var(--g2)',
    'Group 3': 'var(--g3)',
    'Group 4': 'var(--g4)'
  };

  /* ====================================================================== *
   * 1. Tiny DOM helpers
   * ====================================================================== */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === null || val === undefined || val === false) { return; }
        if (key === 'class') { node.className = val; }
        else if (key === 'text') { node.textContent = val; }
        else if (key === 'dataset') {
          Object.keys(val).forEach(function (dk) { node.dataset[dk] = val[dk]; });
        }
        else if (key.slice(0, 2) === 'on' && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        }
        else { node.setAttribute(key, val === true ? '' : String(val)); }
      });
    }
    var list = Array.isArray(children) ? children : (children === undefined || children === null ? [] : [children]);
    list.forEach(function (child) {
      if (child === null || child === undefined || child === false) { return; }
      node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function clear(node) {
    if (!node) { return node; }
    while (node.firstChild) { node.removeChild(node.firstChild); }
    return node;
  }

  function show(node, visible) {
    if (!node) { return; }
    if (visible) { node.removeAttribute('hidden'); } else { node.setAttribute('hidden', ''); }
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments, ctx = this;
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () { timer = null; fn.apply(ctx, args); }, ms);
    };
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ====================================================================== *
   * 2. Formatters
   * ====================================================================== */

  var DASH = '—';

  function num(v) {
    if (v === null || v === undefined || v === '') { return null; }
    var n = Number(v);
    return (typeof n === 'number' && isFinite(n)) ? n : null;
  }

  function group(n, decimals, locale) {
    var opts = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    };
    return n.toLocaleString(locale === 'IN' ? 'en-IN' : 'en-US', opts);
  }

  function fmt(v, decimals) {
    var n = num(v);
    if (n === null) { return DASH; }
    var d = decimals === undefined ? 2 : decimals;
    return group(n, d);
  }

  function fmtSmart(v) {
    var n = num(v);
    if (n === null) { return DASH; }
    return group(n, Math.abs(n % 1) < 1e-9 ? 0 : 2);
  }

  function pct(v, decimals) {
    var n = num(v);
    if (n === null) { return DASH; }
    return group(n, decimals === undefined ? 2 : decimals) + '%';
  }

  function money(v, currency, decimals) {
    var n = num(v);
    if (n === null) { return DASH; }
    var d = decimals === undefined ? 2 : decimals;
    var sign = currency === 'INR' ? '₹' : '$';
    return sign + group(n, d, currency === 'INR' ? 'IN' : 'US');
  }

  function isNA(v) { return num(v) === null; }

  /* ====================================================================== *
   * 3. UI atoms
   * ====================================================================== */

  function chip(text, kind) {
    return el('span', { class: 'badge' + (kind ? ' badge-' + kind : ''), text: text });
  }

  function statBox(label, value, valueClass) {
    return el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: label }),
      el('span', { class: 'stat-v' + (valueClass ? ' ' + valueClass : ''), text: value })
    ]);
  }

  function statRow(label, value, valueClass) {
    return el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: label }),
      el('span', { class: 'stat-v' + (valueClass ? ' ' + valueClass : ''), text: value })
    ]);
  }

  function card(title, subtitle) {
    var c = el('section', { class: 'card' });
    if (title) { c.appendChild(el('h3', { class: 'card-title', text: title })); }
    if (subtitle) { c.appendChild(el('p', { class: 'card-sub', text: subtitle })); }
    return c;
  }

  function buildTable(headers, rows, opts) {
    opts = opts || {};
    var table = el('table', { class: 'tbl ' + (opts.className || '') });
    var thead = el('thead');
    var hr = el('tr');
    headers.forEach(function (h) {
      hr.appendChild(el('th', { class: h.num ? 'num' : '', scope: 'col', text: h.label }));
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      (r.cells || []).forEach(function (c, i) {
        var isHead = i === 0 && r.headerFirst;
        var attrs = { text: c.text };
        if (isHead) { attrs.scope = 'row'; } else if (c.num) { attrs.class = 'num'; }
        if (c.na) { attrs.class = (attrs.class ? attrs.class + ' ' : '') + 'na'; }
        if (c.cls) { attrs.class = (attrs.class ? attrs.class + ' ' : '') + c.cls; }
        tr.appendChild(isHead ? el('th', attrs) : el('td', attrs));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  /* Formula strip — monospace with variables highlighted. */
  var FORMULA_RE = /([A-Za-z_][A-Za-z0-9_]*\[[^\]]*\])|(\b(?:SUM|MIN|MAX|AVERAGE|GEOMEAN|EPS|DPS|ROE|ROCE|ROA|FV|PV|PMT|NPV|CBV|OBV|PE|PRICE)\b)/g;

  function formulaStrip(text) {
    var strip = el('div', { class: 'formula-strip' });
    var src = text === null || text === undefined ? '' : String(text);
    if (!src) {
      strip.appendChild(el('span', { class: 'dim', text: DASH }));
      return strip;
    }
    var last = 0, m;
    FORMULA_RE.lastIndex = 0;
    while ((m = FORMULA_RE.exec(src)) !== null) {
      if (m.index > last) { strip.appendChild(document.createTextNode(src.slice(last, m.index))); }
      strip.appendChild(el('span', { class: 'formula-var', text: m[0] }));
      last = m.index + m[0].length;
      if (m[0].length === 0) { FORMULA_RE.lastIndex++; }
    }
    if (last < src.length) { strip.appendChild(document.createTextNode(src.slice(last))); }
    return strip;
  }

  /* calc[] step table: label | expr | value | unit */
  function calcTable(calc) {
    var wrap = el('div', { class: 'tbl-wrap' });
    var rows = (Array.isArray(calc) ? calc : []).map(function (r) {
      var v = num(r ? r.value : null);
      return {
        headerFirst: true,
        cells: [
          { text: (r && r.label) ? String(r.label) : '' },
          { text: (r && r.expr) ? String(r.expr) : '', cls: 'expr' },
          { text: fmtSmart(r ? r.value : null), num: true, na: v === null },
          { text: (r && r.unit) ? String(r.unit) : '' }
        ]
      };
    });
    wrap.appendChild(buildTable(
      [{ label: 'Label' }, { label: 'Expression' }, { label: 'Value', num: true }, { label: 'Unit' }],
      rows, { className: 'tbl-calc' }
    ));
    return wrap;
  }

  /* Line / formula / value table used across the computation tab. */
  function formulaValueTable(lines) {
    var wrap = el('div', { class: 'tbl-wrap' });
    var rows = lines.map(function (ln) {
      var v = num(ln.value);
      var text = ln.format === 'pct' ? pct(ln.value)
        : ln.format === 'money' ? money(ln.value, ln.currency, ln.decimals)
          : ln.format === 'int' ? fmt(ln.value, 0)
            : fmtSmart(ln.value);
      return {
        headerFirst: true,
        cells: [
          { text: ln.label },
          { text: ln.formula || '', cls: 'f' },
          { text: text, num: true, na: v === null, cls: ln.strong ? 'strong' : '' },
          { text: ln.extra || '' }
        ]
      };
    });
    wrap.appendChild(buildTable(
      [{ label: 'Line' }, { label: 'Formula' }, { label: 'Value', num: true }, { label: 'Notes' }],
      rows, { className: 'tbl-formula' }
    ));
    return wrap;
  }

  /* ====================================================================== *
   * 4. Status / errors
   * ====================================================================== */

  function setStatus(kind, message, meta) {
    var strip = $('#statusStrip');
    if (!strip) { return; }
    strip.setAttribute('data-state', kind);
    var t = $('#statusText');
    if (t) { t.textContent = message; }
    var m = $('#statusMeta');
    if (m) { m.textContent = meta || ''; }
  }

  function showError(message) {
    var banner = $('#errorBanner');
    if (!banner) { return; }
    clear(banner);
    var dismiss = el('button', {
      type: 'button', class: 'error-dismiss', title: 'Dismiss error',
      'aria-label': 'Dismiss error', text: '✕'
    });
    dismiss.addEventListener('click', hideError);
    banner.appendChild(el('strong', { text: 'Error: ' }));
    banner.appendChild(el('span', { text: message }));
    banner.appendChild(dismiss);
    show(banner, true);
    /* single source of truth for errors — silence the status strip entirely */
    setStatus('idle', '', '');
    if (!reducedMotion()) { banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  function hideError() {
    var banner = $('#errorBanner');
    if (banner) { show(banner, false); clear(banner); }
  }

  /* ====================================================================== *
   * 5. Theme
   * ====================================================================== */

  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    try { localStorage.setItem(LS_THEME, state.theme); } catch (e) { /* ignore */ }
    var btn = $('#themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
      btn.title = state.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    }
    applyChartDefaults();
  }

  function readStoredTheme() {
    var stored = null;
    try { stored = localStorage.getItem(LS_THEME); } catch (e) { stored = null; }
    if (stored === 'light' || stored === 'dark') { return stored; }
    return 'light';
  }

  /* ====================================================================== *
   * 6. Charts
   * ====================================================================== */

  function hasChart() { return typeof window.Chart !== 'undefined'; }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = v ? v.trim() : '';
    return v ? v : fallback;
  }

  function themeColors() {
    /* palette lives in style.css tokens so charts stay in sync with the theme */
    return {
      grid: cssVar('--chart-grid', 'rgba(15,23,42,.10)'),
      text: cssVar('--chart-text', '#334155'),
      strong: cssVar('--chart-strong', '#0f172a'),
      panel: cssVar('--chart-panel', 'rgba(255,255,255,.94)'),
      border: cssVar('--chart-border', '#c2cfdf')
    };
  }

  function applyChartDefaults() {
    if (!hasChart()) { return; }
    var c = themeColors();
    window.Chart.defaults.color = c.text;
    window.Chart.defaults.borderColor = c.grid;
    window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    window.Chart.defaults.font.size = 11;
  }

  function makeChart(canvasId, config) {
    if (!hasChart()) { return null; }
    var canvas = document.getElementById(canvasId);
    if (!canvas) { return null; }
    if (state.charts[canvasId]) {
      try { state.charts[canvasId].destroy(); } catch (e) { /* ignore */ }
      delete state.charts[canvasId];
    }
    try {
      state.charts[canvasId] = new window.Chart(canvas.getContext('2d'), config);
    } catch (e) {
      state.charts[canvasId] = null;
      return null;
    }
    return state.charts[canvasId];
  }

  function baseOptions(c, extra) {
    var opts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 10,
            font: { size: 10 }
          }
        },
        tooltip: {
          backgroundColor: c.panel,
          borderColor: c.border,
          borderWidth: 1,
          titleColor: c.strong,
          bodyColor: c.text,
          padding: 9
        }
      },
      scales: {
        x: { ticks: { color: c.text, maxRotation: 0, autoSkipPadding: 12 }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { color: c.grid } }
      }
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (k === 'scales') {
          Object.keys(extra.scales).forEach(function (sk) {
            opts.scales[sk] = Object.assign({}, opts.scales[sk], extra.scales[sk]);
          });
        } else {
          opts[k] = extra[k];
        }
      });
    }
    return opts;
  }

  function rebuildCharts() {
    if (!state.data) { return; }
    buildGroupMatrixChart(state.data);
    buildStatementCharts(state.data);
    buildObvChart(state.data);
    buildFearGreedChart(state.data);
    buildRsiChart(state.data);
    buildInventoryChart(state.data);
    buildSellChart(state.data);
  }

  /* ====================================================================== *
   * 7. Request building
   * ====================================================================== */

  function normaliseTicker(raw, market) {
    var t = String(raw || '').trim();
    if (!t) { return ''; }
    t = t.toUpperCase();
    if (market === 'INDIA') {
      if (t.indexOf('.') === -1) { t = t + '.NS'; }
      return t;
    }
    if (market === 'USA') {
      return t.replace(/\.(NS|BO)$/, '');
    }
    return t;
  }

  function buildRequestBody() {
    var body = {};
    var ticker = $('#tickerInput') ? $('#tickerInput').value : '';
    var sample = $('#sampleSelect') ? $('#sampleSelect').value : '';
    var market = $('#marketSelect') ? $('#marketSelect').value : 'AUTO';

    if (state.uploadFile) {
      body.file = state.uploadFile.name;
    } else if (sample) {
      body.file = sample;
    } else if (ticker) {
      body.ticker = normaliseTicker(ticker, market);
    }

    if (market && market !== 'AUTO') { body.market = market; }

    var rate = state.tbondRateOverride;
    if (rate !== null && rate !== undefined && rate !== '' && !isNaN(Number(rate))) {
      body.tbond_rate = Number(rate);
    }

    var key = $('#aiKey') ? $('#aiKey').value.trim() : '';
    if (key) {
      body.ai_key = key;
      body.ai_provider = ($('#aiProvider') ? $('#aiProvider').value : 'auto') || 'auto';
    }
    return body;
  }

  function isUploadMode() { return !!state.uploadFile; }

  /* ====================================================================== *
   * 8. Network
   * ====================================================================== */

  function analyse() {
    var body = buildRequestBody();
    if (!body.ticker && !body.file) {
      showError('Enter a ticker or choose a sample / upload an .xlsx file first.');
      return;
    }
    hideError();
    setStatus('fetching', 'Fetching data and running the engine…');
    $('#analyseBtn').disabled = true;
    var main = $('#main');
    if (main) { main.setAttribute('aria-busy', 'true'); }

    var opts;
    if (isUploadMode()) {
      var fd = new FormData();
      fd.append('file', state.uploadFile);
      if (body.ticker) { fd.append('ticker', body.ticker); }
      if (body.market) { fd.append('market', body.market); }
      if (body.tbond_rate !== undefined) { fd.append('tbond_rate', String(body.tbond_rate)); }
      if (body.ai_key) {
        fd.append('ai_key', body.ai_key);
        fd.append('ai_provider', body.ai_provider || 'auto');
      }
      opts = { method: 'POST', body: fd };
    } else {
      opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
    }

    fetch(API.analyze, opts)
      .then(function (res) {
        return res.text().then(function (txt) {
          var json = null;
          try { json = txt ? JSON.parse(txt) : null; } catch (e) { json = null; }
          if (!res.ok) {
            var msg = (json && (json.error || json.message)) ? (json.error || json.message)
              : (txt ? txt.slice(0, 400) : ('HTTP ' + res.status));
            throw new Error(msg);
          }
          if (json && json.error) { throw new Error(json.error); }
          if (!json) { throw new Error('Empty or invalid JSON response from the engine.'); }
          return json;
        });
      })
      .then(function (data) {
        state.edits = {};
        state.pointById = {};
        render(data);
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : String(err));
      })
      .finally(function () {
        $('#analyseBtn').disabled = false;
        var m = $('#main');
        if (m) { m.removeAttribute('aria-busy'); }
      });
  }

  function exportExcel() {
    var body = buildRequestBody();
    if (!body.ticker && !body.file) {
      showError('Nothing to export — run an analysis first.');
      return;
    }
    setStatus('fetching', 'Building Excel workbook…');
    $('#exportBtn').disabled = true;

    var opts;
    if (isUploadMode()) {
      var fd = new FormData();
      fd.append('file', state.uploadFile);
      if (body.ticker) { fd.append('ticker', body.ticker); }
      if (body.tbond_rate !== undefined) { fd.append('tbond_rate', String(body.tbond_rate)); }
      opts = { method: 'POST', body: fd };
    } else {
      opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
    }

    fetch(API.exportExcel, opts)
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (txt) {
            var json = null;
            try { json = txt ? JSON.parse(txt) : null; } catch (e) { json = null; }
            throw new Error((json && (json.error || json.message)) ? (json.error || json.message)
              : (txt ? txt.slice(0, 300) : ('HTTP ' + res.status)));
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = el('a', { href: url, download: (body.ticker || body.file || 'LojikLab').replace(/[^\w.\-]+/g, '_') + '.xlsx' });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        setStatus('done', 'Excel workbook downloaded.');
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : String(err));
      })
      .finally(function () {
        $('#exportBtn').disabled = false;
      });
  }

  /* ====================================================================== *
   * 9. Render — top level
   * ====================================================================== */

  function render(data) {
    state.data = data;
    applyChartDefaults();

    var meta = data.meta || {};
    var currency = meta.currency || 'INR';

    show($('#emptyState'), false);
    show($('#scorecard'), true);
    $('#exportBtn').disabled = false;

    /* data now exists — retire the "Run an analysis first" placeholders */
    $$('.placeholder').forEach(function (ph) { show(ph, false); });

    renderScorecard(data, currency);
    renderSummary(data, currency);
    renderStatement(data, currency);
    renderComputation(data, currency);
    renderTechnicals(data, currency);
    renderSell(data, currency);

    var metaBits = [];
    if (meta.source) { metaBits.push('src: ' + meta.source); }
    if (meta.generated_at) { metaBits.push(meta.generated_at); }
    var fm = $('#footerMeta');
    if (fm) { fm.textContent = metaBits.join('  ·  '); }

    var tbond = num(meta.tbond_rate);
    setStatus('done', 'Analysis complete.', tbond !== null ? ('T-bond ' + pct(tbond) + '  ·  ') + (meta.company || meta.ticker || '') : (meta.company || meta.ticker || ''));
  }

  /* ====================================================================== *
   * 10. Scorecard
   * ====================================================================== */

  function renderScorecard(d, currency) {
    var meta = d.meta || {};
    var cls = d.classifications || {};
    var comp = d.computation || {};
    var bvm = comp.book_value_model || {};
    var init = comp.initial_return || {};
    var score = d.score || {};

    var earned = computeEarned();
    var total = num(score.total);
    $('#scScore').textContent = earned + ' / ' + (total === null ? SCORED_TOTAL : total);

    $('#scVerdict').textContent = score.verdict || (earned + ' of ' + (total === null ? SCORED_TOTAL : total) + ' points passed.');

    var realm = $('#scRealm');
    if (score.realm_of_confidence) {
      realm.textContent = 'Realm of Confidence';
      realm.className = 'badge badge-good';
    } else {
      realm.textContent = 'Not yet in the Realm of Confidence';
      realm.className = 'badge';
    }

    $('#scCompany').textContent = meta.company || '—';
    $('#scTicker').textContent = meta.ticker || '—';
    $('#scMarket').textContent = meta.market || '—';
    var sectorBits = [];
    if (meta.sector) { sectorBits.push(meta.sector); }
    if (meta.industry) { sectorBits.push(meta.industry); }
    $('#scSector').textContent = sectorBits.length ? sectorBits.join(' · ') : '—';

    var ct = cls.company_type || {};
    var ctEl = $('#scCompanyType');
    $('#scCompanyType').textContent = ct.code !== undefined && ct.code !== null
      ? ('Company ' + ct.code)
      : (ct.label || '—');
    if (ctEl) {
      ctEl.className = ct.is_type_i ? 'tile-big tile-mid val-up' : 'tile-big tile-mid';
    }
    $('#scCompanyTypeDetail').textContent = ct.detail || ct.label || '—';

    var gr = cls.roe_roce_group || {};
    $('#scRoeGroup').textContent = gr.code ? ('Group ' + gr.code) : (gr.label || '—');
    $('#scRoeGroupDetail').textContent = gr.detail || gr.label || '—';

    var price = num(bvm.current_price);
    if (price === null) { price = num(init.price); }
    if (price === null) { price = num((d.technicals || {}).current_price); }
    var eg = comp.eps_growth_model || {};
    var bc = comp.bond_coupon_model || {};
    var m1 = num(bvm.intrinsic_value);
    var m2 = num(eg.intrinsic_value);
    var m3 = num(bc.intrinsic_value);

    function modelUpside(iv) {
      if (iv === null || price === null || !price) { return null; }
      return (iv - price) / Math.abs(price) * 100;
    }
    function setModelTile(elId, iv) {
      var node = $(elId);
      if (!node) { return; }
      var up = modelUpside(iv);
      if (iv === null) {
        node.textContent = DASH + (up === null ? '' : ' (' + (up >= 0 ? '+' : '') + pct(up) + ')');
        node.className = 'v';
        return;
      }
      node.textContent = money(iv, currency)
        + (up === null ? '' : ' (' + (up >= 0 ? '+' : '') + pct(up) + ')');
      node.className = 'v ' + (up !== null && up >= 0 ? 'val-up' : 'val-down');
    }

    $('#scPrice').textContent = price === null ? DASH : money(price, currency);
    setModelTile('#scIvModel1', m1);
    setModelTile('#scIvModel2', m2);
    setModelTile('#scIvModel3', m3);

    /* Composite intrinsic value = mean of the models that produced a number */
    var ivs = [m1, m2, m3].filter(function (v) { return v !== null; });
    var intrinsic = ivs.length ? ivs.reduce(function (a, b) { return a + b; }, 0) / ivs.length : null;

    $('#scIntrinsic').textContent = intrinsic === null ? DASH : money(intrinsic, currency);

    var up = $('#scUpside');
    if (price !== null && intrinsic !== null && price !== 0) {
      var delta = (intrinsic - price) / Math.abs(price) * 100;
      up.textContent = (delta >= 0 ? '+' : '') + pct(delta);
      up.className = 'v ' + (delta >= 0 ? 'val-up' : 'val-down');
    } else {
      up.textContent = DASH;
      up.className = 'v';
    }

    show($('#scFinTile'), !!meta.is_financial);

    /* server-side breakdown of which points passed / failed */
    var bd = score.breakdown || {};
    var bdEl = $('#scBreakdown');
    if (bdEl) {
      var passedIds = Array.isArray(bd.passed) ? bd.passed : [];
      var failedIds = Array.isArray(bd.failed) ? bd.failed : [];
      var bits = [];
      if (passedIds.length) { bits.push('passed: ' + passedIds.join(', ')); }
      if (failedIds.length) { bits.push('failed: ' + failedIds.join(', ')); }
      bdEl.textContent = bits.join('  ·  ');
      bdEl.title = bdEl.textContent;
    }
  }

  /* ====================================================================== *
   * 11. Tab 1 — Analyze & Summary
   * ====================================================================== */

  function pointDomId(id) { return 'point-' + (id || 'x'); }

  function computeEarned() {
    var d = state.data;
    if (!d) { return 0; }
    if (!Array.isArray(d.points) || !d.points.length) {
      var serverEarned = num((d.score || {}).earned);
      return serverEarned === null ? 0 : serverEarned;
    }
    var total = 0;
    d.points.forEach(function (p) {
      var sc = currentScoreOf(p.id);
      if (sc === 1) { total += 1; }
    });
    return total;
  }

  function findPoint(id) {
    if (!state.data || !Array.isArray(state.data.points)) { return null; }
    for (var i = 0; i < state.data.points.length; i++) {
      if (state.data.points[i] && state.data.points[i].id === id) { return state.data.points[i]; }
    }
    return null;
  }

  function currentScoreOf(id) {
    var edit = state.edits[id];
    if (edit && edit.score !== undefined && edit.score !== null) { return Number(edit.score); }
    var p = findPoint(id);
    if (!p) { return null; }
    var s = num(p.score);
    return s === null ? null : s;
  }

  function isEdited(id) {
    var p = findPoint(id);
    var e = state.edits[id];
    if (!p || !e) { return false; }
    if (e.score !== undefined && Number(e.score) !== Number(p.score)) { return true; }
    if (e.value !== undefined && String(e.value) !== String(p.value === null || p.value === undefined ? '' : p.value)) { return true; }
    if (e.note !== undefined && String(e.note) !== String(p.note === null || p.note === undefined ? '' : p.note)) { return true; }
    return false;
  }

  function setEdit(id, patch) {
    var cur = state.edits[id] || {};
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    state.edits[id] = cur;
  }

  function updateScoreUI() {
    var d = state.data;
    if (!d) { return; }
    var score = d.score || {};
    var total = num(score.total);
    var scoreEl = $('#scScore');
    if (scoreEl) {
      scoreEl.textContent = computeEarned() + ' / ' + (total === null ? SCORED_TOTAL : total);
    }

    $$('#pointIndex .idx-chip').forEach(function (chipEl) {
      var id = chipEl.getAttribute('data-chip-for');
      var sc = currentScoreOf(id);
      chipEl.textContent = sc === 1 ? '✓' : (sc === 0 ? '✗' : '•');
      chipEl.className = 'idx-chip ' + (sc === 1 ? 'idx-pass' : (sc === 0 ? 'idx-fail' : 'idx-none'));
    });

    $$('#pointCards .score-btn').forEach(function (btn) {
      var id = btn.getAttribute('data-for');
      var sc = currentScoreOf(id);
      var on = Number(btn.getAttribute('data-score')) === sc;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    $$('#pointCards .edited-dot').forEach(function (dot) {
      var id = dot.getAttribute('data-dot-for');
      show(dot, isEdited(id));
      var cardEl = dot.closest ? dot.closest('.point-card') : null;
      if (cardEl) {
        cardEl.classList.toggle('is-edited', isEdited(id));
        var sc = currentScoreOf(id);
        cardEl.classList.toggle('is-pass', sc === 1);
        cardEl.classList.toggle('is-fail', sc === 0);
      }
    });
  }

  function scrollToPoint(id) {
    var target = document.getElementById(pointDomId(id));
    if (!target) { return; }
    target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    $$('#pointIndex .idx-item').forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-target') === pointDomId(id));
    });
  }

  function renderSummary(d, currency) {
    var points = Array.isArray(d.points) ? d.points : [];
    var index = clear($('#pointIndex'));
    var cards = clear($('#pointCards'));

    state.pointById = {};
    points.forEach(function (p) { if (p && p.id) { state.pointById[p.id] = p; } });

    show($('#summaryLayout'), true);

    points.forEach(function (p, i) {
      var id = (p && p.id) ? p.id : 'p' + (i + 1);
      var numLabel = (p && p.num !== undefined && p.num !== null) ? String(p.num) : String(i + 1);
      var title = (p && p.title) ? p.title : 'Point ' + numLabel;

      var idxItem = el('a', {
        class: 'idx-item', href: '#' + pointDomId(id), 'data-target': pointDomId(id),
        title: title
      }, [
        el('span', { class: 'idx-num', text: numLabel }),
        el('span', { class: 'idx-title', text: title }),
        el('span', { class: 'idx-chip idx-none', 'data-chip-for': id, text: '•' })
      ]);
      idxItem.addEventListener('click', function (ev) {
        ev.preventDefault();
        scrollToPoint(id);
      });
      index.appendChild(idxItem);

      cards.appendChild(buildPointCard(p, id, numLabel, title, currency));
    });

    renderAiNarrative(d);
    renderExhibitA(d, currency);
    renderGroupMatrix(d);

    updateScoreUI();
  }

  function renderAiNarrative(d) {
    var box = $('#aiNarrative');
    if (!box) { return; }
    var ai = d.ai || {};
    var narrative = ai.narrative;
    if (!narrative) { show(box, false); return; }

    var body = '';
    if (typeof narrative === 'string') {
      body = narrative;
    } else if (typeof narrative === 'object') {
      body = narrative.text || narrative.summary || narrative.content || narrative.narrative || '';
      if (!body) {
        try { body = JSON.stringify(narrative); } catch (e) { body = ''; }
      }
    }
    if (!body) { show(box, false); return; }

    clear(box);
    var title = 'AI narrative';
    if (ai.provider) { title += ' — ' + ai.provider; }
    else if (ai.used) { title += ' — generated'; }
    box.appendChild(el('h3', { class: 'card-title', text: title }));
    box.appendChild(el('p', { class: 'card-sub', text: String(body) }));
    show(box, true);
  }

  function buildPointCard(p, id, numLabel, title, currency) {
    var art = el('article', { class: 'point-card', id: pointDomId(id) });

    var head = el('header', { class: 'point-head' });
    head.appendChild(el('span', { class: 'point-num', text: numLabel }));
    head.appendChild(el('h3', { class: 'point-title', text: title }));
    head.appendChild(el('span', { class: 'edited-dot', 'data-dot-for': id, text: '●', title: 'Edited locally', hidden: true }));

    var toggle = el('div', { class: 'score-toggle', role: 'group', 'aria-label': 'Score for point ' + numLabel });
    toggle.appendChild(el('button', { type: 'button', class: 'score-btn', 'data-score': '1', 'data-for': id, 'aria-pressed': 'false', text: 'YES' }));
    toggle.appendChild(el('button', { type: 'button', class: 'score-btn', 'data-score': '0', 'data-for': id, 'aria-pressed': 'false', text: 'NO' }));
    head.appendChild(toggle);
    art.appendChild(head);

    var body = el('div', { class: 'point-body' });

    /* --- Column A: question, principle, editable fields --- */
    var colA = el('div', { class: 'pcol pcol-a' });
    colA.appendChild(el('p', { class: 'question', text: (p && p.question) ? p.question : DASH }));
    if (p && p.principle) {
      colA.appendChild(el('div', { class: 'principle', text: p.principle }));
    }
    if (p && p.editable) {
      colA.appendChild(buildEditArea(p, id, 'value', 'Analysis / value'));
      colA.appendChild(buildEditArea(p, id, 'note', 'Note'));
    }
    body.appendChild(colA);

    /* --- Column B: formula strip --- */
    var colB = el('div', { class: 'pcol pcol-b' });
    colB.appendChild(formulaStrip(p ? p.formula : ''));
    body.appendChild(colB);

    /* --- Column C: calc steps --- */
    var colC = el('div', { class: 'pcol pcol-c' });
    if (p && Array.isArray(p.calc) && p.calc.length) {
      colC.appendChild(calcTable(p.calc));
    } else {
      colC.appendChild(el('p', { class: 'note', text: 'No calculation steps returned for this point.' }));
    }
    body.appendChild(colC);

    art.appendChild(body);

    /* --- options: template vs original script --- */
    if (p && p.options && (p.options.template || p.options.script_original)) {
      var det = el('details', { class: 'opts' });
      det.appendChild(el('summary', { text: 'Original script vs Template' }));
      var grid = el('div', { class: 'opts-grid' });
      grid.appendChild(el('div', {}, [
        el('h4', { text: 'Template' }),
        el('p', { text: p.options.template || DASH })
      ]));
      grid.appendChild(el('div', {}, [
        el('h4', { text: 'Original script' }),
        el('p', { text: p.options.script_original || DASH })
      ]));
      det.appendChild(grid);
      art.appendChild(det);
    }

    /* --- footer: verdict + note --- */
    var foot = el('footer', { class: 'point-foot' });
    var verdict = (p && p.verdict) ? String(p.verdict) : '';
    var vClass = 'verdict';
    if (/^(yes|pass)/i.test(verdict)) { vClass += ' verdict-pass'; }
    else if (/^(no|fail)/i.test(verdict)) { vClass += ' verdict-fail'; }
    foot.appendChild(el('span', { class: vClass, text: verdict || DASH }));
    var noteText = (p && p.note) ? String(p.note) : '';
    var edit = state.edits[id];
    if (edit && edit.note !== undefined) { noteText = String(edit.note); }
    if (noteText) { foot.appendChild(el('span', { text: noteText })); }
    art.appendChild(foot);

    return art;
  }

  function buildEditArea(p, id, field, label) {
    var wrap = el('div', { class: 'edit-field' });
    var taId = 'edit-' + id + '-' + field;
    wrap.appendChild(el('label', { class: 'edit-label', for: taId, text: label }));
    var ta = el('textarea', { id: taId, class: 'edit-textarea', rows: '3', spellcheck: 'false' });
    var edit = state.edits[id];
    var initial = (edit && edit[field] !== undefined)
      ? edit[field]
      : (p && p[field] !== undefined && p[field] !== null ? p[field] : '');
    ta.value = initial === null ? '' : String(initial);
    var save = debounce(function () {
      setEdit(id, (function () { var o = {}; o[field] = ta.value; return o; })());
      updateScoreUI();
    }, 300);
    ta.addEventListener('input', save);
    ta.addEventListener('change', function () {
      setEdit(id, (function () { var o = {}; o[field] = ta.value; return o; })());
      updateScoreUI();
    });
    wrap.appendChild(ta);
    return wrap;
  }

  function renderExhibitA(d, currency) {
    var cls = d.classifications || {};
    var ex = cls.exhibit_a || {};
    var rows = Array.isArray(ex.rows) ? ex.rows : [];
    var wrap = $('#exhibitAWrap');
    if (!rows.length) { show(wrap, false); return; }
    show(wrap, true);

    var tableRows = rows.map(function (r) {
      return {
        headerFirst: true,
        cells: [
          { text: r && r.year !== undefined && r.year !== null ? String(r.year) : DASH },
          { text: fmtSmart(r && r.company_i), num: true, na: isNA(r && r.company_i) },
          { text: fmtSmart(r && r.company_ii), num: true, na: isNA(r && r.company_ii) },
          { text: fmtSmart(r && r.company_iii), num: true, na: isNA(r && r.company_iii) },
          { text: fmtSmart(r && r.company_iv), num: true, na: isNA(r && r.company_iv) }
        ]
      };
    });
    clear($('#exhibitATable')).appendChild(buildTable(
      [{ label: 'Year' }, { label: 'Company I', num: true }, { label: 'Company II', num: true },
      { label: 'Company III', num: true }, { label: 'Company IV', num: true }],
      tableRows
    ));

    /* the company's own series, for side-by-side comparison */
    var stmt = d.statement || {};
    var years = Array.isArray(stmt.years) ? stmt.years : (Array.isArray((d.meta || {}).years) ? d.meta.years : []);
    var fin = stmt.financials || {};
    var eps = Array.isArray(fin.eps) ? fin.eps : [];
    var dps = Array.isArray(fin.dps) ? fin.dps : [];
    var bvps = Array.isArray(fin.book_value_ps) ? fin.book_value_ps : [];

    var compWrap = clear($('#exhibitACompany'));
    if (years.length) {
      var cRows = [];
      for (var i = years.length - 1; i >= 0; i--) {
        cRows.push({
          headerFirst: true,
          cells: [
            { text: String(years[i]) },
            { text: fmtSmart(eps[i]), num: true, na: isNA(eps[i]) },
            { text: fmtSmart(dps[i]), num: true, na: isNA(dps[i]) },
            { text: money(bvps[i], currency), num: true, na: isNA(bvps[i]) }
          ]
        });
      }
      compWrap.appendChild(buildTable(
        [{ label: 'Year' }, { label: 'EPS', num: true }, { label: 'DPS', num: true }, { label: 'Book value / share', num: true }],
        cRows
      ));
    } else {
      compWrap.appendChild(el('p', { class: 'note', text: 'No company series available.' }));
    }
  }

  function renderGroupMatrix(d) {
    var cls = d.classifications || {};
    var gm = cls.group_matrix || {};
    var years = Array.isArray(gm.years) ? gm.years : [];
    var roce = gm.roce || {};
    var roe = gm.roe || {};
    var wrap = $('#groupMatrixWrap');
    if (!years.length) { show(wrap, false); return; }
    show(wrap, true);

    var groups = ['Group 1', 'Group 2', 'Group 3', 'Group 4'];
    var headers = [{ label: 'Year' }];
    groups.forEach(function (g) { headers.push({ label: 'ROCE ' + g.replace('Group ', 'G'), num: true }); });
    groups.forEach(function (g) { headers.push({ label: 'ROE ' + g.replace('Group ', 'G'), num: true }); });

    var rows = years.map(function (y, i) {
      var cells = [{ text: String(y) }];
      groups.forEach(function (g) {
        var arr = Array.isArray(roce[g]) ? roce[g] : [];
        cells.push({ text: fmtSmart(arr[i]), num: true, na: isNA(arr[i]) });
      });
      groups.forEach(function (g) {
        var arr = Array.isArray(roe[g]) ? roe[g] : [];
        cells.push({ text: fmtSmart(arr[i]), num: true, na: isNA(arr[i]) });
      });
      return { headerFirst: true, cells: cells };
    });
    clear($('#groupMatrixTable')).appendChild(buildTable(headers, rows));

    var comment = $('#groupMatrixComment');
    if (comment) {
      comment.textContent = ((cls.roe_roce_group || {}).comment) || '';
    }

    buildGroupMatrixChart(d);
  }

  function buildGroupMatrixChart(d) {
    var gm = (d.classifications || {}).group_matrix || {};
    var years = Array.isArray(gm.years) ? gm.years : [];
    if (!years.length) { return; }
    var c = themeColors();
    var groups = ['Group 1', 'Group 2', 'Group 3', 'Group 4'];
    var datasets = [];

    groups.forEach(function (g) {
      var arr = (gm.roe || {})[g];
      if (!Array.isArray(arr)) { return; }
      datasets.push({
        label: 'ROE · ' + g,
        data: arr,
        borderColor: GROUP_COLORS[g],
        backgroundColor: GROUP_COLORS[g],
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.25,
        borderDash: []
      });
    });
    groups.forEach(function (g) {
      var arr = (gm.roce || {})[g];
      if (!Array.isArray(arr)) { return; }
      datasets.push({
        label: 'ROCE · ' + g,
        data: arr,
        borderColor: GROUP_COLORS[g],
        backgroundColor: 'transparent',
        borderWidth: 1.6,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.25,
        borderDash: [5, 4]
      });
    });

    makeChart('groupMatrixChart', {
      type: 'line',
      data: { labels: years.map(String), datasets: datasets },
      options: baseOptions(c, {
        plugins: {
          legend: {
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 9, font: { size: 10 }, color: c.text }
          },
          tooltip: {
            backgroundColor: c.panel, borderColor: c.border, borderWidth: 1,
            titleColor: c.strong, bodyColor: c.text, padding: 9
          }
        },
        scales: {
          x: { ticks: { color: c.text, maxRotation: 0 }, grid: { color: c.grid } },
          y: { ticks: { color: c.text }, grid: { color: c.grid }, title: { display: true, text: '%' } }
        }
      })
    });
  }

  /* ====================================================================== *
   * 12. Tab 2 — Financial Statement
   * ====================================================================== */

  var STATEMENT_SECTIONS = [
    {
      key: 'financials', title: 'Financials', rows: [
        { k: 'revenue', label: 'Revenue', f: 'money' },
        { k: 'operating_profit', label: 'Operating Profit', f: 'money' },
        { k: 'net_profit', label: 'Net Profit', f: 'money' },
        { k: 'eps', label: 'EPS', f: 'num' },
        { k: 'dps', label: 'DPS', f: 'num' },
        { k: 'payout_ratio', label: 'Payout Ratio', f: 'pct' },
        { k: 'shares', label: 'Shares Outstanding', f: 'int' },
        { k: 'book_value_ps', label: 'Book Value / Share', f: 'money' },
        { k: 'cfo', label: 'Cash Flow from Operations', f: 'money' },
        { k: 'capex', label: 'Capex', f: 'money' },
        { k: 'fcf', label: 'Free Cash Flow', f: 'money' },
        { k: 'price', label: 'Share Price', f: 'money' },
        { k: 'pe', label: 'P/E', f: 'num' }
      ]
    },
    {
      key: 'profitability', title: 'Profitability', rows: [
        { k: 'gross_margin', label: 'Gross Margin', f: 'pct' },
        { k: 'operating_margin', label: 'Operating Margin', f: 'pct' },
        { k: 'net_margin', label: 'Net Margin', f: 'pct' },
        { k: 'tax_rate', label: 'Tax Rate', f: 'pct' },
        { k: 'asset_turnover', label: 'Asset Turnover', f: 'num' },
        { k: 'roa', label: 'ROA', f: 'pct' },
        { k: 'roce', label: 'ROCE', f: 'pct' },
        { k: 'roe', label: 'ROE', f: 'pct' },
        { k: 'interest_coverage', label: 'Interest Coverage', f: 'num' }
      ]
    },
    {
      key: 'growth', title: 'Growth', rows: [
        { k: 'revenue_yoy', label: 'Revenue YoY', f: 'pct' },
        { k: 'revenue_3y', label: 'Revenue 3Y', f: 'pct' },
        { k: 'revenue_5y', label: 'Revenue 5Y', f: 'pct' },
        { k: 'revenue_10y', label: 'Revenue 10Y', f: 'pct' },
        { k: 'op_income_yoy', label: 'Operating Income YoY', f: 'pct' },
        { k: 'op_income_3y', label: 'Operating Income 3Y', f: 'pct' },
        { k: 'op_income_5y', label: 'Operating Income 5Y', f: 'pct' },
        { k: 'op_income_10y', label: 'Operating Income 10Y', f: 'pct' },
        { k: 'net_income_yoy', label: 'Net Income YoY', f: 'pct' },
        { k: 'net_income_3y', label: 'Net Income 3Y', f: 'pct' },
        { k: 'net_income_5y', label: 'Net Income 5Y', f: 'pct' },
        { k: 'net_income_10y', label: 'Net Income 10Y', f: 'pct' },
        { k: 'eps_yoy', label: 'EPS YoY', f: 'pct' },
        { k: 'eps_3y', label: 'EPS 3Y', f: 'pct' },
        { k: 'eps_5y', label: 'EPS 5Y', f: 'pct' },
        { k: 'eps_10y', label: 'EPS 10Y', f: 'pct' }
      ]
    },
    {
      key: 'cashflow', title: 'Cash Flow Ratios', rows: [
        { k: 'ocf_growth', label: 'OCF Growth', f: 'pct' },
        { k: 'fcf_growth', label: 'FCF Growth', f: 'pct' },
        { k: 'capex_pct_sales', label: 'Capex % of Sales', f: 'pct' },
        { k: 'fcf_pct_sales', label: 'FCF % of Sales', f: 'pct' },
        { k: 'fcf_to_net_income', label: 'FCF / Net Income', f: 'num' }
      ]
    },
    {
      key: 'balance_sheet', title: 'Balance Sheet (% of assets)', rows: [
        { k: 'cash_pct', label: 'Cash', f: 'pct' },
        { k: 'receivables_pct', label: 'Receivables', f: 'pct' },
        { k: 'inventory_pct', label: 'Inventory', f: 'pct' },
        { k: 'total_current_assets_pct', label: 'Total Current Assets', f: 'pct' },
        { k: 'net_ppe_pct', label: 'Net PPE', f: 'pct' },
        { k: 'intangibles_pct', label: 'Intangibles', f: 'pct' },
        { k: 'total_assets_pct', label: 'Total Assets', f: 'pct' },
        { k: 'accounts_payable_pct', label: 'Accounts Payable', f: 'pct' },
        { k: 'short_term_debt_pct', label: 'Short Term Debt', f: 'pct' },
        { k: 'total_current_liabilities_pct', label: 'Total Current Liabilities', f: 'pct' },
        { k: 'long_term_debt_pct', label: 'Long Term Debt', f: 'pct' },
        { k: 'total_liabilities_pct', label: 'Total Liabilities', f: 'pct' },
        { k: 'equity_pct', label: 'Equity', f: 'pct' }
      ]
    },
    {
      key: 'liquidity', title: 'Liquidity', rows: [
        { k: 'current_ratio', label: 'Current Ratio', f: 'num' },
        { k: 'quick_ratio', label: 'Quick Ratio', f: 'num' },
        { k: 'financial_leverage', label: 'Financial Leverage', f: 'num' },
        { k: 'debt_to_equity', label: 'Debt / Equity', f: 'num' }
      ]
    },
    {
      key: 'efficiency', title: 'Efficiency', rows: [
        { k: 'dso', label: 'DSO (days)', f: 'num' },
        { k: 'days_inventory', label: 'Days Inventory', f: 'num' },
        { k: 'payables_period', label: 'Payables Period', f: 'num' },
        { k: 'cash_conversion_cycle', label: 'Cash Conversion Cycle', f: 'num' },
        { k: 'receivables_turnover', label: 'Receivables Turnover', f: 'num' },
        { k: 'inventory_turnover', label: 'Inventory Turnover', f: 'num' },
        { k: 'fixed_assets_turnover', label: 'Fixed Assets Turnover', f: 'num' },
        { k: 'asset_turnover', label: 'Asset Turnover', f: 'num' }
      ]
    }
  ];

  function formatStatementValue(v, kind, currency) {
    if (kind === 'pct') { return pct(v); }
    if (kind === 'money') { return money(v, currency); }
    if (kind === 'int') { return fmt(v, 0); }
    return fmt(v, 2);
  }

  function renderStatement(d, currency) {
    var stmt = d.statement || {};
    var years = Array.isArray(stmt.years) ? stmt.years : (Array.isArray((d.meta || {}).years) ? d.meta.years : []);
    var wrap = $('#stmtWrap');
    if (!years.length) { show(wrap, false); return; }
    show(wrap, true);

    var host = clear($('#stmtTables'));
    STATEMENT_SECTIONS.forEach(function (sec) {
      var data = stmt[sec.key] || {};
      var headers = [{ label: 'Metric' }];
      years.forEach(function (y) { headers.push({ label: String(y), num: true }); });

      var rows = sec.rows.map(function (r) {
        var arr = Array.isArray(data[r.k]) ? data[r.k] : [];
        var cells = [{ text: r.label }];
        for (var i = 0; i < years.length; i++) {
          var v = arr[i];
          cells.push({
            text: formatStatementValue(v, r.f, currency),
            num: true,
            na: isNA(v)
          });
        }
        return { headerFirst: true, cells: cells };
      });

      var secEl = el('section', { class: 'stmt-section' });
      secEl.appendChild(el('h3', { class: 'sub-title', text: sec.title }));
      var tw = el('div', { class: 'tbl-wrap' });
      tw.appendChild(buildTable(headers, rows));
      secEl.appendChild(tw);
      host.appendChild(secEl);
    });

    buildStatementCharts(d);
  }

  function series(d, section, key) {
    var s = (d.statement || {})[section] || {};
    return Array.isArray(s[key]) ? s[key] : [];
  }

  function buildStatementCharts(d) {
    var stmt = d.statement || {};
    var years = Array.isArray(stmt.years) ? stmt.years : (Array.isArray((d.meta || {}).years) ? d.meta.years : []);
    if (!years.length) { return; }
    var c = themeColors();
    var labels = years.map(String);

    /* 1 — EPS / DPS / BVPS */
    makeChart('chartEps', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'EPS', data: series(d, 'financials', 'eps'), borderColor: '#38bdf8', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 },
          { label: 'DPS', data: series(d, 'financials', 'dps'), borderColor: '#2fd07a', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 },
          { label: 'Book Value / Share', data: series(d, 'financials', 'book_value_ps'), borderColor: '#a78bfa', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 }
        ]
      },
      options: baseOptions(c)
    });

    /* 2 — Revenue + Net Profit bars, Net Margin line */
    makeChart('chartRevenue', {
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Revenue', data: series(d, 'financials', 'revenue'),
            backgroundColor: 'rgba(56,189,248,.45)', borderColor: '#38bdf8', borderWidth: 1, yAxisID: 'y'
          },
          {
            type: 'bar', label: 'Net Profit', data: series(d, 'financials', 'net_profit'),
            backgroundColor: 'rgba(47,208,122,.45)', borderColor: '#2fd07a', borderWidth: 1, yAxisID: 'y'
          },
          {
            type: 'line', label: 'Net Margin %', data: series(d, 'profitability', 'net_margin'),
            borderColor: '#f2c14e', backgroundColor: '#f2c14e', borderWidth: 2,
            pointRadius: 2, tension: 0.25, yAxisID: 'y1'
          }
        ]
      },
      options: baseOptions(c, {
        scales: {
          x: { ticks: { color: c.text, maxRotation: 0 }, grid: { color: c.grid } },
          y: { ticks: { color: c.text }, grid: { color: c.grid }, position: 'left' },
          y1: {
            position: 'right', grid: { drawOnChartArea: false },
            ticks: { color: c.text, callback: function (v) { return v + '%'; } }
          }
        }
      })
    });

    /* 3 — ROE / ROCE / ROA */
    makeChart('chartReturns', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'ROE %', data: series(d, 'profitability', 'roe'), borderColor: '#2fd07a', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 },
          { label: 'ROCE %', data: series(d, 'profitability', 'roce'), borderColor: '#38bdf8', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 },
          { label: 'ROA %', data: series(d, 'profitability', 'roa'), borderColor: '#f2c14e', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2, tension: 0.25 }
        ]
      },
      options: baseOptions(c, {
        scales: {
          x: { ticks: { color: c.text, maxRotation: 0 }, grid: { color: c.grid } },
          y: { ticks: { color: c.text, callback: function (v) { return v + '%'; } }, grid: { color: c.grid } }
        }
      })
    });
  }

  /* ====================================================================== *
   * 13. Tab 3 — Computation & Valuation
   * ====================================================================== */

  function renderComputation(d, currency) {
    var comp = d.computation || {};
    var wrap = $('#compWrap');
    if (!Object.keys(comp).length) { show(wrap, false); return; }
    show(wrap, true);

    /* ---- 1. Retained earnings & capital allocation (Point 4) ---- */
    var re = comp.retained_earnings || {};
    var c1 = clear($('#compRetained'));
    c1.appendChild(el('h3', { class: 'card-title', text: 'Retained Earnings & Capital Allocation (Point 4)' }));
    c1.appendChild(el('p', { class: 'card-sub', text: 'Does the company retain enough of its earnings, and does that retained capital earn more than the treasury rate?' }));
    c1.appendChild(formulaValueTable([
      { label: 'Total Earnings', formula: 'Total Earnings = SUM(EPS[0..9])', value: re.total_earnings, format: 'money', currency: currency },
      { label: 'Total Dividends', formula: 'Total Dividends = SUM(DPS[0..9])', value: re.total_dividends, format: 'money', currency: currency },
      { label: 'Retained', formula: 'Retained = Earnings − Dividends', value: re.total_retained, format: 'money', currency: currency },
      { label: 'Retention %', formula: 'Retention % = Retained ÷ Earnings × 100', value: re.retention_ratio_pct, format: 'pct' },
      { label: 'Retained Grown $', formula: 'Retained Grown $ = EPS[now] − EPS[10y ago]', value: re.retained_grown_usd, format: 'money', currency: currency },
      { label: 'Return on Retained Earnings %', formula: 'Return on Retained Earnings % = Retained Grown $ ÷ Retained × 100', value: re.retained_grown_pct, format: 'pct' },
      { label: 'TREGIP %', formula: 'TREGIP % = Return on Retained Earnings %', value: re.tregip_pct, format: 'pct' },
      { label: 'Treasury Rate', formula: 'Pass = TREGIP % > Treasury Rate %', value: re.tbond_rate, format: 'pct' }
    ]));
    var passRow = el('div', { class: 'stat-row' });
    passRow.appendChild(statBox('Result', re.passes ? 'PASS' : 'FAIL', re.passes ? 'val-up' : 'val-down'));
    passRow.appendChild(statBox('TREGIP', pct(re.tregip_pct)));
    passRow.appendChild(statBox('Treasury', pct(re.tbond_rate)));
    c1.appendChild(passRow);

    /* ---- 2. Initial rate of return & relative value (Points 13 & 13.1) ---- */
    var ir = comp.initial_return || {};
    var c2 = clear($('#compInitial'));
    c2.appendChild(el('h3', { class: 'card-title', text: 'Initial Rate of Return & Relative Value (Points 13 & 13.1)' }));
    c2.appendChild(el('p', { class: 'card-sub', text: 'What is the return on the initial investment, and how does it compare with the return on treasury bonds?' }));
    c2.appendChild(formulaValueTable([
      { label: 'EPS', formula: 'EPS = earnings per share', value: ir.eps, format: 'num' },
      { label: 'Price', formula: 'Price = current share price', value: ir.price, format: 'money', currency: currency },
      { label: 'Initial Rate of Return %', formula: 'Initial Rate of Return % = (EPS ÷ Price) × 100', value: ir.initial_rate_of_return_pct, format: 'pct' },
      { label: 'Growth Rate %', formula: 'Growth Rate % = historical EPS growth', value: ir.growth_rate_pct, format: 'pct' },
      { label: 'Treasury Rate %', formula: 'Treasury Rate % = risk-free rate', value: ir.tbond_rate, format: 'pct' },
      { label: 'Relative Value', formula: 'Relative Value = Initial Rate of Return % ÷ Treasury Rate %', value: ir.relative_value, format: 'num' }
    ]));
    var irRow = el('div', { class: 'stat-row' });
    irRow.appendChild(statBox('Beats T-bonds', ir.beats_tbonds ? 'YES' : 'NO', ir.beats_tbonds ? 'val-up' : 'val-down'));
    irRow.appendChild(statBox('Relative value ≥ 1', ir.relative_value_ok ? 'YES' : 'NO', ir.relative_value_ok ? 'val-up' : 'val-down'));
    c2.appendChild(irRow);

    /* ---- 3. Model 1 — book value compounding (Point 14) ---- */
    var bv = comp.book_value_model || {};
    var c3 = clear($('#compBookValue'));
    c3.appendChild(el('h3', { class: 'card-title', text: 'Model 1 — Book Value Compounding: Equity / Bond (Point 14)' }));
    c3.appendChild(el('p', { class: 'card-sub', text: 'Textbook Buffettology rows alongside the exact Excel `Computation` sheet cells.' }));
    c3.appendChild(el('h4', { class: 'sub-title', text: 'Textbook Buffettology' }));
    c3.appendChild(formulaValueTable([
      { label: 'Average ROE %', formula: 'ROE Avg % = average ROE over 10 years', value: bv.roe_avg_pct, format: 'pct' },
      { label: 'Average Payout %', formula: 'Payout Avg % = average payout ratio', value: bv.payout_avg_pct, format: 'pct' },
      { label: 'Book Value Growth Rate %', formula: 'BV Growth Rate % = (1 − Payout %) × ROE %', value: bv.bv_growth_rate_pct, format: 'pct' },
      { label: 'Book Value Now', formula: 'BV Now', value: bv.bv_now, format: 'money', currency: currency },
      { label: 'Book Value 10y Ago', formula: 'BV 10y Ago', value: bv.bv_10y_ago, format: 'money', currency: currency },
      { label: 'Book Value Projected 10y', formula: 'BV Projected = BV Now × (1 + BV Growth Rate %)^10', value: bv.bv_projected_10y, format: 'money', currency: currency },
      { label: 'EPS Projected 10y', formula: 'EPS Projected = EPS Now × (1 + Growth)^10', value: bv.eps_projected_10y, format: 'money', currency: currency },
      { label: 'Average P/E', formula: 'PE Avg = average P/E over 10 years', value: bv.pe_avg, format: 'num' },
      { label: 'Terminal P/E (conservative)', formula: 'Terminal P/E = min(PE Avg, (PE Avg + Current P/E) ÷ 2, 25)', value: bv.pe_terminal_used, format: 'num' },
      { label: 'Price Projected 10y', formula: 'Price Projected = EPS Projected × Terminal P/E', value: bv.price_projected_10y, format: 'money', currency: currency },
      { label: 'Current Price', formula: 'Current Price', value: bv.current_price, format: 'money', currency: currency },
      { label: 'Compounding Return %', formula: 'Compounding Return % = ((Price Projected ÷ Current Price)^(1/10) − 1) × 100', value: bv.compounding_return_pct, format: 'pct' },
      { label: 'Intrinsic Value', formula: 'Intrinsic Value = Price Projected 10y ÷ (1 + r)^10', value: bv.intrinsic_value, format: 'money', currency: currency, strong: true }
    ]));
    c3.appendChild(el('h4', { class: 'sub-title', text: 'Exact Excel `Computation` sheet cells' }));
    c3.appendChild(formulaValueTable([
      { label: 'B13', formula: 'Computation!B13', value: bv.template_b13 },
      { label: 'J5', formula: 'Computation!J5', value: bv.template_j5 },
      { label: 'J6', formula: 'Computation!J6', value: bv.template_j6 },
      { label: 'J7', formula: 'Computation!J7', value: bv.template_j7 },
      { label: 'J8', formula: 'Computation!J8', value: bv.template_j8 },
      { label: 'J11', formula: 'Computation!J11', value: bv.template_j11 },
      { label: 'J12', formula: 'Computation!J12', value: bv.template_j12 },
      { label: 'J13', formula: 'Computation!J13', value: bv.template_j13 }
    ]));

    /* ---- 4. Model 2 — historical EPS growth + average P/E (Point 15A) ---- */
    var eg = comp.eps_growth_model || {};
    var c4 = clear($('#compEpsGrowth'));
    c4.appendChild(el('h3', { class: 'card-title', text: 'Model 2 — Historical EPS Growth + Average P/E (Point 15A)' }));
    c4.appendChild(el('p', { class: 'card-sub', text: 'Project EPS forward at its historical CAGR, apply the average P/E, then compound.' }));
    c4.appendChild(formulaValueTable([
      { label: 'EPS CAGR %', formula: 'EPS CAGR % = (EPS[now] ÷ EPS[10y ago])^(1/10) − 1', value: eg.eps_cagr_pct, format: 'pct' },
      { label: 'EPS CAGR used (capped 18%/yr)', formula: 'EPS CAGR Used = min(EPS CAGR, 18)', value: eg.eps_cagr_used_pct, format: 'pct' },
      { label: 'EPS Now', formula: 'EPS Now', value: eg.eps_now, format: 'num' },
      { label: 'EPS Projected 10y', formula: 'EPS Projected = EPS Now × (1 + CAGR Used)^10', value: eg.eps_projected_10y, format: 'num' },
      { label: 'Average P/E', formula: 'PE Avg = average P/E over 10 years', value: eg.pe_avg, format: 'num' },
      { label: 'Terminal P/E (conservative)', formula: 'Terminal P/E = min(PE Avg, (PE Avg + Current P/E) ÷ 2, 25)', value: eg.pe_terminal_used, format: 'num' },
      { label: 'Price Projected 10y', formula: 'Price Projected = EPS Projected × Terminal P/E', value: eg.price_projected_10y, format: 'money', currency: currency },
      { label: 'Current Price', formula: 'Current Price', value: eg.current_price, format: 'money', currency: currency },
      { label: 'Compounding Return %', formula: 'Compounding Return % = ((Price Projected ÷ Current Price)^(1/10) − 1) × 100', value: eg.compounding_return_pct, format: 'pct' },
      { label: 'Intrinsic Value', formula: 'Intrinsic Value = Price Projected 10y ÷ (1 + r)^10', value: eg.intrinsic_value, format: 'money', currency: currency, strong: true },
      { label: 'Computation!J13', formula: 'Exact Excel cell', value: eg.template_j13 }
    ]));

    /* ---- 5. Model 3 — bond coupon + par book value (Point 15B) ---- */
    var bc = comp.bond_coupon_model || {};
    var c5 = clear($('#compBond'));
    c5.appendChild(el('h3', { class: 'card-title', text: 'Model 3 — Bond Coupon + Par Book Value (Point 15B)' }));
    c5.appendChild(el('p', { class: 'card-sub', text: 'Value the company as a bond paying a coupon at the treasury rate, plus its residual book value.' }));
    c5.appendChild(formulaValueTable([
      { label: 'CBV (Compounded Book Value)', formula: 'CBV = OBV × (1 + BV CAGR %)^years', value: bc.cbv, format: 'money', currency: currency, extra: 'script original: ' + fmtSmart(bc.cbv_script_original) },
      { label: 'OBV (Original Book Value)', formula: 'OBV = book value today', value: bc.obv, format: 'money', currency: currency },
      { label: 'BV CAGR %', formula: 'BV CAGR % = (BV[now] ÷ BV[10y ago])^(1/years) − 1', value: bc.bv_cagr_pct, format: 'pct' },
      { label: 'Coupon', formula: 'Coupon = OBV × Treasury Rate %', value: bc.coupon, format: 'money', currency: currency },
      { label: 'Par', formula: 'Par = CBV', value: bc.par, format: 'money', currency: currency },
      { label: 'r %', formula: 'r = treasury rate', value: bc.r_pct, format: 'pct' },
      { label: 'Years', formula: 'Years = projection horizon', value: bc.years, format: 'int' },
      { label: 'Intrinsic Value', formula: 'Intrinsic Value = PV of coupons + Par', value: bc.intrinsic_value, format: 'money', currency: currency, strong: true, extra: 'script original: ' + fmtSmart(bc.iv_script_original) }
    ]));

    /* ---- TI calculator: load defaults from the analysis ---- */
    tiLoadFromAnalysis(false);
  }

  /* ---------------- TI BA-35 Solar Financial Calculator ---------------- */

  function tiSetDisplay(value) {
    var disp = $('#tiDisplay');
    if (!disp) { return; }
    disp.textContent = (value === null || value === undefined || value === '') ? '0.00' : String(value);
  }

  function tiNum(id) {
    var node = document.getElementById(id);
    if (!node) { return 0; }
    var n = num(node.value);
    return n === null ? 0 : n;
  }

  function tiCompute() {
    var pv = tiNum('tiPV'), fv = tiNum('tiFV'), pmt = tiNum('tiPMT');
    var n = tiNum('tiN'), iPct = tiNum('tiI');
    var cpt = $('#tiCPT') ? $('#tiCPT').value : 'i';
    var i = iPct / 100;

    if (n <= 0) { tiSetDisplay('Error: N ≤ 0'); return; }

    var af = (Math.abs(i) < 1e-12) ? n : ((Math.pow(1 + i, n) - 1) / i);
    var out = null, target = null;

    if (cpt === 'i') {
      if (pv <= 0) { tiSetDisplay('Error: PV ≤ 0'); return; }
      out = (Math.pow(fv / pv, 1 / n) - 1) * 100;
      target = '#tiI';
    } else if (cpt === 'FV') {
      out = pv * Math.pow(1 + i, n) + pmt * af;
      target = '#tiFV';
    } else if (cpt === 'PV') {
      out = (fv - pmt * af) / Math.pow(1 + i, n);
      target = '#tiPV';
    } else if (cpt === 'NPV') {
      out = pmt * af;
      target = null;
    }

    if (out === null || !isFinite(out)) { tiSetDisplay('Error'); return; }
    if (target) {
      var node = document.querySelector(target);
      if (node) { node.value = String(Math.round(out * 1e8) / 1e8); }
    }
    tiSetDisplay(group(out, 4));
  }

  function tiLoadFromAnalysis(announce) {
    var d = state.data;
    if (!d) { return; }
    var meta = d.meta || {};
    var comp = d.computation || {};
    var stmt = d.statement || {};
    var fin = stmt.financials || {};
    var prices = Array.isArray(fin.price) ? fin.price : [];

    var oldest = null, newest = null;
    for (var i = 0; i < prices.length; i++) {
      var v = num(prices[i]);
      if (v === null) { continue; }
      if (oldest === null) { oldest = v; }
      newest = v;
    }

    var bvm = comp.book_value_model || {};
    var ir = comp.initial_return || {};
    var current = firstNum([bvm.current_price, ir.price, newest]);
    var rate = firstNum([meta.tbond_rate, (comp.retained_earnings || {}).tbond_rate, ir.tbond_rate]);

    setInput('tiPV', oldest);
    setInput('tiFV', current);
    setInput('tiPMT', 0);
    setInput('tiN', 20);
    setInput('tiI', rate);
    if ($('#tiCPT')) { $('#tiCPT').value = 'i'; }
    tiSetDisplay(current !== null ? group(current, 2) : '0.00');
    if (announce) {
      setStatus('done', 'Calculator loaded: PV = price 20y ago, FV = current price, N = 20, I% = treasury rate.');
    }
  }

  function setInput(id, value) {
    var node = document.getElementById(id);
    if (!node) { return; }
    node.value = (value === null || value === undefined) ? '' : String(value);
  }

  function firstNum(list) {
    for (var i = 0; i < list.length; i++) {
      var n = num(list[i]);
      if (n !== null) { return n; }
    }
    return null;
  }

  /* ====================================================================== *
   * 14. Tab 4 — Technicals & Money Packets
   * ====================================================================== */

  function signalKind(signal) {
    var s = String(signal || '').toUpperCase();
    if (s.indexOf('BUY') !== -1 || s.indexOf('ACCUMULATE') !== -1 || s.indexOf('POSITIVE') !== -1) { return 'good'; }
    if (s.indexOf('SELL') !== -1 || s.indexOf('EXIT') !== -1 || s.indexOf('NEGATIVE') !== -1) { return 'bad'; }
    if (s.indexOf('WAIT') !== -1 || s.indexOf('HOLD') !== -1 || s.indexOf('NEUTRAL') !== -1) { return 'warn'; }
    return '';
  }

  function renderTechnicals(d, currency) {
    var t = d.technicals || {};
    var wrap = $('#techWrap');
    if (!Object.keys(t).length) { show(wrap, false); return; }
    show(wrap, true);

    /* overall technicals verdict */
    var header = clear($('#techHeader'));
    header.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Overall signal' }),
      el('span', { class: 'stat-v' }, [chip(String(t.signal || '—').toUpperCase(), signalKind(t.signal))])
    ]));
    if (t.summary) {
      header.appendChild(el('p', { class: 'note', text: String(t.summary) }));
    }

    /* --- OBV --- */
    var obv = t.obv || {};
    var obvStats = clear($('#obvStats'));
    obvStats.appendChild(statBox('Current', fmtSmart(obv.current)));
    obvStats.appendChild(statBox('Min', fmtSmart(obv.min)));
    obvStats.appendChild(statBox('Max', fmtSmart(obv.max)));
    obvStats.appendChild(statBox('Position', pct(obv.position_pct)));
    obvStats.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Signal' }),
      el('span', { class: 'stat-v' }, [chip(String(obv.signal || '—').toUpperCase(), signalKind(obv.signal))])
    ]));
    $('#obvNote').textContent = obv.note || '';

    /* --- Fear / Greed --- */
    var fg = t.fear_greed || {};
    var fgStats = clear($('#fearGreedStats'));
    var fgType = String(fg.last_tall_bar_type || '').toUpperCase();
    fgStats.appendChild(statBox('Last tall bar', String(fg.last_tall_bar === null || fg.last_tall_bar === undefined ? DASH : fg.last_tall_bar)));
    fgStats.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Bar type' }),
      el('span', { class: 'stat-v' }, [chip(fgType || DASH, fgType === 'FEAR' ? 'bad' : (fgType === 'GREED' ? 'good' : 'warn'))])
    ]));
    fgStats.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Signal' }),
      el('span', { class: 'stat-v' }, [chip(String(fg.signal || '—').toUpperCase(), signalKind(fg.signal))])
    ]));

    /* --- RSI --- */
    var rsi = t.rsi || {};
    var rsiStats = clear($('#rsiStats'));
    rsiStats.appendChild(statBox('Current', fmtSmart(rsi.current)));
    rsiStats.appendChild(statBox('Long-term (14w)', fmtSmart(rsi.long_term_current)));
    rsiStats.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Signal' }),
      el('span', { class: 'stat-v' }, [chip(String(rsi.signal || '—').toUpperCase(), signalKind(rsi.signal))])
    ]));
    rsiStats.appendChild(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-k', text: 'Long-term signal' }),
      el('span', { class: 'stat-v' }, [chip(String(rsi.long_term_signal || '—').toUpperCase(), signalKind(rsi.long_term_signal))])
    ]));
    $('#rsiRule').textContent = rsi.rule || 'RSI SHOULD HAVE THE FINAL SAY — SELL IF IT SAYS SO NO MATTER WHAT.';

    /* --- Volume / liquidity --- */
    var vol = t.volume || {};
    var volStats = clear($('#volumeStats'));
    volStats.appendChild(statRow('Avg 20-day volume', fmtSmart(vol.avg20)));
    volStats.appendChild(statRow('Latest volume', fmtSmart(vol.latest)));
    volStats.appendChild(statRow('ADV', fmtSmart(vol.adv)));
    volStats.appendChild(statRow(currency === 'INR' ? 'Turnover (crore)' : 'Turnover ($M)', fmtSmart(vol.turnover_cr)));
    volStats.appendChild(statRow('Liquidity', vol.liquid ? 'LIQUID' : 'ILLIQUID', vol.liquid ? 'val-up' : 'val-down'));

    /* --- Inventory pile-up --- */
    var inv = t.inventory_check || {};
    var invStats = clear($('#inventoryStats'));
    invStats.appendChild(statRow('Verdict', inv.piling_up ? 'PILING UP' : 'NO PILE-UP', inv.piling_up ? 'val-down' : 'val-up'));
    var invYears = Array.isArray(inv.years) ? inv.years : [];
    var invPct = Array.isArray(inv.inventory_pct_sales) ? inv.inventory_pct_sales : [];
    var invAbs = Array.isArray(inv.inventory) ? inv.inventory : [];
    invStats.appendChild(statRow('Latest inventory % of sales', pct(invPct.length ? invPct[invPct.length - 1] : null)));
    invStats.appendChild(statRow('Latest inventory', invAbs.length ? fmtSmart(invAbs[invAbs.length - 1]) : DASH));
    invStats.appendChild(statRow('Years tracked', String(invYears.length)));
    if (inv.note) { invStats.appendChild(el('p', { class: 'note', text: inv.note })); }

    /* --- Mum's rule --- */
    var ep = t.earning_power || {};
    var mumStats = clear($('#mumsStats'));
    mumStats.appendChild(statRow('Current ratio', fmtSmart(ep.current_ratio)));
    mumStats.appendChild(statRow('ROCE', pct(ep.roce_pct)));
    mumStats.appendChild(statRow('ROE', pct(ep.roe_pct)));
    mumStats.appendChild(statRow('Interest coverage', fmtSmart(ep.interest_coverage)));
    mumStats.appendChild(statRow('Mum\'s rule', ep.mums_rule ? 'PASSED' : 'FAILED', ep.mums_rule ? 'val-up' : 'val-down'));
    if (ep.note) { mumStats.appendChild(el('p', { class: 'note', text: ep.note })); }

    /* --- Money packets --- */
    var mp = t.money_packet || {};
    var packets = num(mp.packets_allowed);
    var packetVisual = clear($('#packetVisual'));
    for (var p = 1; p <= 3; p++) {
      var cls = 'packet-dot';
      if (packets !== null && p <= packets) { cls += ' is-on'; }
      packetVisual.appendChild(el('span', { class: cls }));
    }
    var packetStats = clear($('#packetStats'));
    packetStats.appendChild(statRow('Recommendation', String(mp.recommendation || '—')));
    packetStats.appendChild(statRow('Packets allowed', packets === null ? DASH : String(packets)));
    $('#packetDetail').textContent = mp.detail || '';

    buildObvChart(d);
    buildFearGreedChart(d);
    buildRsiChart(d);
    buildInventoryChart(d);
  }

  function buildObvChart(d) {
    var obv = (d.technicals || {}).obv || {};
    var dates = Array.isArray(obv.dates) ? obv.dates : [];
    var values = Array.isArray(obv.values) ? obv.values : [];
    if (!dates.length || !values.length) { return; }
    var c = themeColors();

    var min = num(obv.min), max = num(obv.max);
    if (min === null || max === null) {
      var vals = values.map(num).filter(function (v) { return v !== null; });
      if (vals.length) { min = Math.min.apply(null, vals); max = Math.max.apply(null, vals); }
    }
    if (min === null || max === null) { return; }
    var mid = min + (max - min) / 2;

    var flatMid = [], flatMin = [];
    for (var i = 0; i < dates.length; i++) { flatMid.push(mid); flatMin.push(min); }

    makeChart('chartObv', {
      type: 'line',
      data: {
        labels: dates.map(String),
        datasets: [
          {
            label: 'OBV', data: values, borderColor: '#38bdf8', backgroundColor: 'transparent',
            borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, tension: 0.2, order: 3
          },
          {
            label: '50% band', data: flatMid, borderColor: '#f2c14e', borderWidth: 1.2,
            borderDash: [5, 4], pointRadius: 0, fill: false, order: 2
          },
          {
            label: '', data: flatMin, borderColor: 'transparent', borderWidth: 0,
            pointRadius: 0, backgroundColor: 'rgba(242,193,78,.10)', fill: '-1', order: 1
          }
        ]
      },
      options: baseOptions(c, {
        plugins: {
          legend: {
            labels: {
              usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 9, font: { size: 10 }, color: c.text,
              filter: function (item) { return item.text !== ''; }
            }
          },
          tooltip: {
            backgroundColor: c.panel, borderColor: c.border, borderWidth: 1,
            titleColor: c.strong, bodyColor: c.text, padding: 9,
            filter: function (item) { return item.dataset.label !== ''; }
          }
        }
      })
    });
  }

  function findBinIndex(bins, key) {
    if (!Array.isArray(bins) || !bins.length) { return -1; }
    if (key === null || key === undefined) { return -1; }
    var ks = String(key).trim().toLowerCase();
    for (var i = 0; i < bins.length; i++) {
      var p = bins[i] ? bins[i].price : null;
      if (p === null || p === undefined) { continue; }
      if (String(p).trim().toLowerCase() === ks) { return i; }
      var np = num(p), nk = num(ks);
      if (np !== null && nk !== null && Math.abs(np - nk) < 1e-6) { return i; }
    }
    /* fallback — the tallest bar */
    var best = -1, bestVal = -Infinity;
    bins.forEach(function (b, idx) {
      var v = num(b ? b.volume : null);
      if (v !== null && v > bestVal) { bestVal = v; best = idx; }
    });
    return best;
  }

  function buildFearGreedChart(d) {
    var fg = (d.technicals || {}).fear_greed || {};
    var bins = Array.isArray(fg.bins) ? fg.bins : [];
    if (!bins.length) { return; }
    var c = themeColors();
    var type = String(fg.last_tall_bar_type || '').toUpperCase();
    var hotIdx = findBinIndex(bins, fg.last_tall_bar);
    var hotColor = type === 'GREED' ? 'rgba(47,208,122,.85)' : (type === 'FEAR' ? 'rgba(242,85,90,.85)' : 'rgba(242,193,78,.85)');

    var labels = bins.map(function (b) {
      return (b && b.price !== undefined && b.price !== null) ? String(b.price) : DASH;
    });
    var data = bins.map(function (b) { return num(b ? b.volume : null); });
    var colors = bins.map(function (b, i) {
      return i === hotIdx ? hotColor : 'rgba(56,189,248,.42)';
    });

    makeChart('chartFearGreed', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Volume by price', data: data, backgroundColor: colors,
          borderColor: bins.map(function (b, i) { return i === hotIdx ? hotColor : 'rgba(56,189,248,.7)'; }),
          borderWidth: 1
        }]
      },
      options: baseOptions(c, {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.panel, borderColor: c.border, borderWidth: 1,
            titleColor: c.strong, bodyColor: c.text, padding: 9
          }
        },
        scales: {
          x: { ticks: { color: c.text }, grid: { color: c.grid }, title: { display: true, text: 'Volume' } },
          y: { ticks: { color: c.text, autoSkip: true }, grid: { color: c.grid }, title: { display: true, text: 'Price' } }
        }
      })
    });
  }

  function buildRsiChart(d) {
    var rsi = (d.technicals || {}).rsi || {};
    var dates = Array.isArray(rsi.dates) ? rsi.dates : [];
    var values = Array.isArray(rsi.values) ? rsi.values : [];
    if (!dates.length || !values.length) { return; }
    var c = themeColors();

    var over = [], under = [];
    for (var i = 0; i < dates.length; i++) { over.push(70); under.push(30); }

    makeChart('chartRsi', {
      type: 'line',
      data: {
        labels: dates.map(String),
        datasets: [
          {
            label: 'RSI', data: values, borderColor: '#a78bfa', backgroundColor: 'transparent',
            borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, tension: 0.2
          },
          {
            label: 'Overbought 70', data: over, borderColor: 'rgba(242,85,90,.7)', borderWidth: 1.2,
            borderDash: [5, 4], pointRadius: 0, fill: false
          },
          {
            label: 'Oversold 30', data: under, borderColor: 'rgba(47,208,122,.7)', borderWidth: 1.2,
            borderDash: [5, 4], pointRadius: 0, fill: false
          }
        ]
      },
      options: baseOptions(c, {
        scales: {
          x: { ticks: { color: c.text, maxRotation: 0, autoSkipPadding: 12 }, grid: { color: c.grid } },
          y: {
            min: 0, max: 100,
            ticks: { color: c.text, stepSize: 20 }, grid: { color: c.grid }
          }
        }
      })
    });
  }

  function buildInventoryChart(d) {
    var inv = (d.technicals || {}).inventory_check || {};
    var years = Array.isArray(inv.years) ? inv.years : [];
    var seriesPct = Array.isArray(inv.inventory_pct_sales) ? inv.inventory_pct_sales : [];
    if (!years.length || !seriesPct.length) { return; }
    var c = themeColors();
    var piling = !!inv.piling_up;
    makeChart('chartInventory', {
      type: 'bar',
      data: {
        labels: years.map(String),
        datasets: [{
          label: 'Inventory % of sales',
          data: seriesPct,
          backgroundColor: piling ? 'rgba(242,85,90,.55)' : 'rgba(47,208,122,.5)',
          borderColor: piling ? 'rgba(242,85,90,.9)' : 'rgba(47,208,122,.85)',
          borderWidth: 1
        }]
      },
      options: baseOptions(c, {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: c.text, maxRotation: 0 }, grid: { color: c.grid } },
          y: { ticks: { color: c.text, callback: function (v) { return v + '%'; } }, grid: { color: c.grid } }
        }
      })
    });
  }

  /* ====================================================================== *
   * 15. Tab 5 — When To Sell
   * ====================================================================== */

  function loadSellChecks() {
    try {
      var raw = localStorage.getItem(LS_SELL);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveSellChecks(obj) {
    try { localStorage.setItem(LS_SELL, JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  function renderSell(d, currency) {
    var w = d.when_to_sell || {};
    var wrap = $('#sellWrap');
    if (!Object.keys(w).length) { show(wrap, false); return; }
    show(wrap, true);

    var years = num(w.years);
    var price = num(w.current_price);
    var rate = num(w.tbond_rate_pct);
    var eps10 = num(w.cumulative_eps_10y);
    var bond10 = num(w.bond_value_10y);
    var winner = String(w.winner || '').toUpperCase();
    var diff = num(w.difference);
    var eqYield = num(w.equity_yield_pct);
    var bondRet = num(w.bond_total_return_pct);
    var winnerYield = String(w.winner_yield || '').toUpperCase();

    var rows = [
      {
        headerFirst: true,
        cells: [
          { text: 'Hold the stock' },
          { text: 'Cumulative expected per-share earnings over ' + (years === null ? '10' : years) + ' years', cls: 'expr' },
          { text: eps10 === null ? DASH : money(eps10, currency), num: true, na: eps10 === null }
        ]
      },
      {
        headerFirst: true,
        cells: [
          { text: 'Sell & put proceeds in bonds' },
          { text: 'Current Price × (1 + r)^' + (years === null ? '10' : years) + ', r = ' + pct(rate), cls: 'expr' },
          { text: bond10 === null ? DASH : money(bond10, currency), num: true, na: bond10 === null }
        ]
      },
      {
        headerFirst: true,
        cells: [
          { text: 'Winner' },
          { text: 'Difference', cls: 'expr' },
          { text: diff === null ? DASH : money(diff, currency), num: true, na: diff === null, cls: winner === 'BONDS' ? 'val-down' : 'val-up' }
        ]
      },
      {
        headerFirst: true,
        cells: [
          { text: 'Equity vs Bond — yield over ' + (years === null ? '10' : years) + ' years', cls: 'expr' },
          { text: 'Equity yield = cumulative EPS ÷ current price  vs  Bond return = (1+r)^n − 1', cls: 'expr' },
          { text: (eqYield === null || bondRet === null) ? DASH : pct(eqYield) + '  vs  ' + pct(bondRet),
            num: true, na: eqYield === null || bondRet === null,
            cls: winnerYield === 'STOCK' ? 'val-up' : (winnerYield === 'BONDS' ? 'val-down' : '') }
        ]
      }
    ];
    clear($('#sellTable')).appendChild(buildTable(
      [{ label: 'Scenario' }, { label: 'Basis' }, { label: 'Value', num: true }],
      rows
    ));

    var chipRow = clear($('#sellVerdict'));
    if (chipRow) {
      chipRow.appendChild(el('div', { class: 'stat' }, [
        el('span', { class: 'stat-k', text: 'Verdict' }),
        el('span', { class: 'stat-v' }, [chip(winner || '—', winner === 'STOCK' ? 'good' : (winner === 'BONDS' ? 'warn' : ''))])
      ]));
      chipRow.appendChild(statBox('Current price', price === null ? DASH : money(price, currency)));
      chipRow.appendChild(statBox('T-bond rate', pct(rate)));
      chipRow.appendChild(statBox('Years', years === null ? DASH : String(years)));
      chipRow.appendChild(statBox('Difference', diff === null ? DASH : money(diff, currency), winner === 'BONDS' ? 'val-down' : 'val-up'));
      if (winnerYield) {
        chipRow.appendChild(el('div', { class: 'stat' }, [
          el('span', { class: 'stat-k', text: 'Equity vs Bond' }),
          el('span', { class: 'stat-v' }, [chip(winnerYield, winnerYield === 'STOCK' ? 'good' : 'warn')])
        ]));
      }
    }

    /* conditions checklist */
    var conds = Array.isArray(w.conditions) ? w.conditions : [];
    var list = clear($('#sellConditions'));
    var saved = loadSellChecks();
    conds.forEach(function (cond, idx) {
      var key = 'c' + idx;
      var li = el('li');
      var label = el('label');
      var cb = el('input', { type: 'checkbox', 'data-key': key });
      cb.checked = !!saved[key];
      var span = el('span', { text: cond });
      if (cb.checked) { span.className = 'is-done'; }
      cb.addEventListener('change', function () {
        span.className = cb.checked ? 'is-done' : '';
        var cur = loadSellChecks();
        cur[key] = cb.checked;
        saveSellChecks(cur);
      });
      label.appendChild(cb);
      label.appendChild(span);
      li.appendChild(label);
      list.appendChild(li);
    });

    buildSellChart(d);
  }

  function buildSellChart(d) {
    var w = d.when_to_sell || {};
    var eps10 = num(w.cumulative_eps_10y);
    var bond10 = num(w.bond_value_10y);
    if (eps10 === null && bond10 === null) { return; }
    var c = themeColors();
    makeChart('chartSell', {
      type: 'bar',
      data: {
        labels: ['Hold the stock (cumulative EPS)', 'Sell & put proceeds in bonds'],
        datasets: [{
          label: '10-year value',
          data: [eps10, bond10],
          backgroundColor: ['rgba(47,208,122,.6)', 'rgba(56,189,248,.55)'],
          borderColor: ['#2fd07a', '#38bdf8'],
          borderWidth: 1
        }]
      },
      options: baseOptions(c, {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: c.text, autoSkip: false }, grid: { color: c.grid } },
          y: { ticks: { color: c.text }, grid: { color: c.grid } }
        }
      })
    });
  }

  /* ====================================================================== *
   * 16. Tabs
   * ====================================================================== */

  function activateTab(panelId, focusTab) {
    var tabs = $$('.tab');
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-panel') === panelId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active && focusTab) { tab.focus(); }
    });
    $$('.tabpanel').forEach(function (panel) {
      show(panel, panel.id === panelId);
    });
    state.activePanel = panelId;
  }

  function wireTabs() {
    var tabs = $$('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateTab(tab.getAttribute('data-panel'), false);
      });
      tab.addEventListener('keydown', function (ev) {
        var idx = tabs.indexOf(tab);
        var next = null;
        if (ev.key === 'ArrowRight') { next = (idx + 1) % tabs.length; }
        else if (ev.key === 'ArrowLeft') { next = (idx - 1 + tabs.length) % tabs.length; }
        else if (ev.key === 'Home') { next = 0; }
        else if (ev.key === 'End') { next = tabs.length - 1; }
        if (next !== null) {
          ev.preventDefault();
          activateTab(tabs[next].getAttribute('data-panel'), true);
        }
      });
    });
  }

  /* ====================================================================== *
   * 17. Reset
   * ====================================================================== */

  function resetAll() {
    state.data = null;
    state.edits = {};
    state.pointById = {};
    state.uploadFile = null;

    Object.keys(state.charts).forEach(function (id) {
      if (state.charts[id]) { try { state.charts[id].destroy(); } catch (e) { /* ignore */ } }
      delete state.charts[id];
    });

    ['#tickerInput', '#tbondRate', '#aiKey'].forEach(function (sel) {
      var n = $(sel); if (n) { n.value = ''; }
    });
    if ($('#marketSelect')) { $('#marketSelect').value = 'AUTO'; }
    marketSegUI();
    hideSuggest();
    if ($('#sampleSelect')) { $('#sampleSelect').value = ''; }
    if ($('#fileInput')) { $('#fileInput').value = ''; }
    if ($('#fileName')) { $('#fileName').textContent = '—'; }
    if ($('#aiProvider')) { $('#aiProvider').value = 'auto'; }

    state.tbondRateOverride = null;
    updateTbondHint();

    hideError();
    show($('#emptyState'), true);
    show($('#scorecard'), false);
    $('#exportBtn').disabled = true;

    ['#summaryLayout', '#exhibitAWrap', '#groupMatrixWrap', '#stmtWrap', '#compWrap', '#techWrap', '#sellWrap']
      .forEach(function (sel) { show($(sel), false); });

    $$('.placeholder').forEach(function (ph) { show(ph, true); });

    clear($('#pointIndex'));
    clear($('#pointCards'));
    clear($('#stmtTables'));
    clear($('#sellTable'));
    var fm = $('#footerMeta');
    if (fm) { fm.textContent = ''; }

    setStatus('idle', 'Idle — enter a ticker or choose a sample file.');
    activateTab('panel-summary', false);
  }

  /* ====================================================================== *
   * 18. T-bond override
   * ====================================================================== */

  function updateTbondHint() {
    var hint = $('#tbondHint');
    if (!hint) { return; }
    if (state.tbondRateOverride === null) {
      hint.textContent = 'auto — resolved by the engine';
    } else {
      hint.textContent = 'override — ' + pct(state.tbondRateOverride) + ' (⟳ to clear)';
    }
  }

  /* ====================================================================== *
   * 19. Samples
   * ====================================================================== */

  function loadSamples() {
    if (typeof fetch !== 'function') { return; }
    fetch(API.samples)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (list) {
        if (!Array.isArray(list)) { return; }
        var select = $('#sampleSelect');
        if (!select) { return; }
        var current = select.value;
        clear(select);
        select.appendChild(el('option', { value: '', text: '— none —' }));
        list.forEach(function (item) {
          var name = typeof item === 'string' ? item : (item && (item.name || item.filename)) ;
          if (!name) { return; }
          select.appendChild(el('option', { value: name, text: name }));
        });
        if (current) { select.value = current; }
      })
      .catch(function () {
        var select = $('#sampleSelect');
        if (!select) { return; }
        var opt = el('option', { value: '', text: '— none —' });
        clear(select);
        select.appendChild(opt);
      });
  }

  /* ====================================================================== *
   * 19b. Spotlight search · market segments · quick picks · stop server
   * ====================================================================== */

  function hideSuggest() {
    var dd = $('#searchDropdown');
    if (dd) { show(dd, false); clear(dd); }
  }

  function marketSegUI() {
    var cur = $('#marketSelect') ? $('#marketSelect').value : 'AUTO';
    $$('#marketSeg .seg-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-market') === cur;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setMarket(code) {
    var sel = $('#marketSelect');
    if (sel && code) { sel.value = code; }
    marketSegUI();
  }

  function fallbackSuggest(q) {
    q = String(q || '').trim().toLowerCase();
    var out = [];
    if (!q) { return out; }
    $$('.quick-chip[data-ticker]').forEach(function (chipEl) {
      var sym = chipEl.getAttribute('data-ticker') || '';
      var name = (chipEl.querySelector('.chip-name') || {}).textContent || '';
      if (sym.toLowerCase().indexOf(q) === 0 || name.toLowerCase().indexOf(q) !== -1) {
        out.push({ symbol: sym, name: name, market: chipEl.getAttribute('data-market') || 'AUTO' });
      }
    });
    return out;
  }

  function initMarketSeg() {
    $$('#marketSeg .seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMarket(btn.getAttribute('data-market'));
      });
    });
    marketSegUI();
  }

  function initSearch() {
    var input = $('#tickerInput');
    var dd = $('#searchDropdown');
    if (!input || !dd) { return; }
    var items = [], hi = -1;

    function render(list) {
      clear(dd);
      items = Array.isArray(list) ? list : [];
      hi = -1;
      if (!items.length) {
        dd.appendChild(el('p', {
          class: 'search-note',
          text: 'No quick matches — press Analyse to query the live sources anyway (any symbol works).'
        }));
      } else {
        items.forEach(function (itm, i) {
          var row = el('div', { class: 'search-item', role: 'option', 'data-idx': String(i) }, [
            el('span', { class: 'search-sym', text: itm.symbol || '?' }),
            el('span', { class: 'search-name', text: itm.name || '' }),
            el('span', { class: 'search-meta', text: itm.exchange || itm.market || '' })
          ]);
          row.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            choose(itm);
          });
          dd.appendChild(row);
        });
      }
      show(dd, true);
    }

    function markActive() {
      $$('.search-item', dd).forEach(function (row) {
        row.classList.toggle('is-active', Number(row.getAttribute('data-idx')) === hi);
      });
    }

    function choose(itm) {
      if (!itm) { return; }
      input.value = itm.symbol || '';
      setMarket(itm.market || 'AUTO');
      hideSuggest();
      items = []; hi = -1;
      analyse();
    }

    function refresh() {
      var q = input.value.trim();
      if (!q) { hideSuggest(); items = []; hi = -1; return; }
      if (typeof fetch !== 'function') { render(fallbackSuggest(q)); return; }
      fetch(API.search + '?q=' + encodeURIComponent(q) + '&limit=9')
        .then(function (res) {
          if (!res.ok) { throw new Error('HTTP ' + res.status); }
          return res.json();
        })
        .then(function (json) {
          render(json && Array.isArray(json.results) ? json.results : fallbackSuggest(q));
        })
        .catch(function () { render(fallbackSuggest(q)); });
    }
    var refreshDeb = debounce(refresh, 170);

    input.addEventListener('input', refreshDeb);
    input.addEventListener('focus', function () { if (input.value.trim()) { refresh(); } });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (dd.hasAttribute('hidden') === false && items.length && hi >= 0) { choose(items[hi]); }
        else { hideSuggest(); analyse(); }
        return;
      }
      if (dd.hasAttribute('hidden') || !items.length) { return; }
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        hi = (hi + 1) % items.length;
        markActive();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        hi = (hi - 1 + items.length) % items.length;
        markActive();
      } else if (ev.key === 'Escape') {
        hideSuggest(); items = []; hi = -1;
      }
    });

    document.addEventListener('click', function (ev) {
      if (ev.target === input || dd.contains(ev.target)) { return; }
      hideSuggest();
    });
  }

  function ensureSampleOption(name) {
    var sel = $('#sampleSelect');
    if (!sel || !name) { return; }
    var exists = false;
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value === name) { exists = true; }
    });
    if (!exists) { sel.appendChild(el('option', { value: name, text: name })); }
  }

  function initQuickPicks() {
    $$('.quick-chip').forEach(function (chipEl) {
      chipEl.addEventListener('click', function () {
        hideError();
        var ticker = chipEl.getAttribute('data-ticker');
        var sample = chipEl.getAttribute('data-sample');
        if (ticker) {
          if ($('#tickerInput')) { $('#tickerInput').value = ticker; }
          setMarket(chipEl.getAttribute('data-market') || 'AUTO');
          state.uploadFile = null;
        } else if (sample) {
          ensureSampleOption(sample);
          if ($('#sampleSelect')) { $('#sampleSelect').value = sample; }
          if ($('#fileInput')) { $('#fileInput').value = ''; }
          if ($('#fileName')) { $('#fileName').textContent = '—'; }
          state.uploadFile = null;
        }
        analyse();
      });
    });
  }

  function initStopServer() {
    var btn = $('#stopServerBtn');
    if (!btn) { return; }
    var armed = false, timer = null;

    function disarm() {
      armed = false;
      btn.classList.remove('is-armed');
    }

    btn.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        btn.classList.add('is-armed');
        timer = setTimeout(disarm, 5000);
        return;
      }
      clearTimeout(timer);
      disarm();
      fetch(API.shutdown, { method: 'POST' }).catch(function () {
        /* network error — the process likely exited before responding */
      }).finally(function () {
        var overlay = $('#shutdownOverlay');
        if (overlay) {
          overlay.hidden = false;
          overlay.style.display = 'grid';
        }
      });
    });

    var retry = $('#shutdownRetryBtn');
    if (retry) {
      retry.addEventListener('click', function () { location.reload(); });
    }
  }

  /* ====================================================================== *
   * 20. Wiring
   * ====================================================================== */

  function wire() {
    $('#analyseBtn').addEventListener('click', analyse);
    $('#exportBtn').addEventListener('click', exportExcel);
    $('#printBtn').addEventListener('click', function () { window.print(); });
    $('#resetBtn').addEventListener('click', resetAll);

    $('#themeToggle').addEventListener('click', function () {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
      rebuildCharts();
    });

    $('#tbondRate').addEventListener('input', function (ev) {
      var v = num(ev.target.value);
      state.tbondRateOverride = (v === null) ? null : v;
      updateTbondHint();
    });

    $('#tbondReset').addEventListener('click', function () {
      state.tbondRateOverride = null;
      $('#tbondRate').value = '';
      updateTbondHint();
    });

    $('#sampleSelect').addEventListener('change', function () {
      if ($('#sampleSelect').value) {
        state.uploadFile = null;
        $('#fileInput').value = '';
        $('#fileName').textContent = '—';
      }
    });

    $('#fileInput').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      state.uploadFile = f || null;
      $('#fileName').textContent = f ? f.name : '—';
      if (f) { $('#sampleSelect').value = ''; }
    });

    /* score toggles inside point cards (delegated) */
    $('#pointCards').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.score-btn') : null;
      if (!btn) { return; }
      var id = btn.getAttribute('data-for');
      var want = Number(btn.getAttribute('data-score'));
      var current = currentScoreOf(id);
      var next = (current === want) ? (want === 1 ? 0 : 1) : want;
      setEdit(id, { score: next });
      updateScoreUI();
    });

    /* TI calculator */
    $('#tiCPTBtn').addEventListener('click', tiCompute);
    $('#tiLoad').addEventListener('click', function () { tiLoadFromAnalysis(true); });
    $('#tiClear').addEventListener('click', function () {
      ['tiPV', 'tiFV', 'tiPMT', 'tiN', 'tiI'].forEach(function (id) { setInput(id, ''); });
      tiSetDisplay('0.00');
    });
    $('#tiCEC').addEventListener('click', function () {
      var active = document.activeElement;
      var fields = ['tiPV', 'tiFV', 'tiPMT', 'tiN', 'tiI'];
      if (active && fields.indexOf(active.id) !== -1) {
        active.value = '';
      } else {
        ['tiPV', 'tiFV', 'tiPMT', 'tiN', 'tiI'].forEach(function (id) { setInput(id, ''); });
      }
    });
    $('#tiOnOff').addEventListener('click', function () {
      var card = $('#tiCalc');
      if (!card) { return; }
      card.classList.toggle('is-off');
      if (card.classList.contains('is-off')) { tiSetDisplay('0.00'); }
    });
    $('#tiRight').addEventListener('click', function () {
      var fields = ['tiPV', 'tiFV', 'tiPMT', 'tiN', 'tiI'];
      var active = document.activeElement;
      var idx = active ? fields.indexOf(active.id) : -1;
      var next = fields[(idx + 1) % fields.length];
      var node = document.getElementById(next);
      if (node) { node.focus(); node.select && node.select(); }
    });
    $('#tiCPT').addEventListener('change', tiCompute);

    initSearch();
    initMarketSeg();
    initQuickPicks();
    initStopServer();

    wireTabs();
  }

  function init() {
    /* safety: the "Server Stopped" overlay must NEVER be visible on a fresh load */
    var stoppedOverlay = $('#shutdownOverlay');
    if (stoppedOverlay) {
      stoppedOverlay.hidden = true;
      stoppedOverlay.style.display = 'none';
    }
    applyTheme(readStoredTheme());
    wire();
    updateTbondHint();
    loadSamples();
    setStatus('idle', 'Idle — enter a ticker or choose a sample file.');
    activateTab('panel-summary', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

document.addEventListener('DOMContentLoaded',function(){const overlay=document.getElementById('adminGateOverlay');if(!overlay)return;let user=null;try{user=JSON.parse(localStorage.getItem('lojikgain_user')||'null');}catch(e){}if(user&&user.is_admin){overlay.style.display='none';return;}const form=overlay.querySelector('form');if(form){form.addEventListener('submit',function(e){e.preventDefault();const email=(form.querySelector('[name="email"]')||{}).value||'';const pass=(form.querySelector('[name="password"]')||{}).value||'';if(email==='admin@lojikgain.com'&&pass==='LojikAdmin@2026'){overlay.style.display='none';try{localStorage.setItem('lojikgain_user',JSON.stringify({email:email,is_admin:true}));}catch(err){}}else{alert('Invalid credentials');}});}});