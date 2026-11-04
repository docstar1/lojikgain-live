// LojikX Founder App — wired to window.FOUNDER_DATA (set by founder.html vault unlock)
// Provides analyse() + render() so the founder dashboard's Analyse button works
// on GitHub Pages without a Flask backend. window.fetch is intercepted by founder.html.

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return (typeof n === 'number' && isFinite(n)) ? n : null;
  }
  function fmt(v, d) {
    var n = num(v);
    if (n === null) return '—';
    var dec = d === undefined ? 2 : d;
    return n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function pct(v, d) {
    var n = num(v);
    if (n === null) return '—';
    return num(n).toLocaleString(undefined, { minimumFractionDigits: (d === undefined ? 2 : d), maximumFractionDigits: (d === undefined ? 2 : d) }) + '%';
  }
  function money(v, cur) {
    var n = num(v);
    if (n === null) return '—';
    var sym = cur === 'INR' ? '\u20B9' : (cur || '');
    return sym + ' ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function set(id, v) {
    var el = $(id);
    if (el) el.textContent = v !== undefined && v !== null ? v : '—';
  }

  // Normalize ticker (strip .NS / .BS, uppercase)
  function normTicker(t) {
    return String(t || '').toUpperCase().replace(/\.(NS|BO)$/i, '');
  }

  // ---------- Render: Scorecard ----------
  function renderScorecard(d, currency) {
    var meta = d.meta || {};
    var cls = d.classifications || {};
    var comp = d.computation || {};
    var score = d.score || {};

    var earned = num(score.earned);
    if (earned === null && Array.isArray(d.points)) {
      earned = d.points.reduce(function (s, p) { return s + (num(p.score) === 1 ? 1 : 0); }, 0);
    }
    var total = num(score.total) || 23;

    set('scScore', earned + ' / ' + total);
    set('scVerdict', score.verdict || (earned + ' of ' + total + ' points passed.'));
    set('scRealm', score.realm_of_confidence ? 'Realm of Confidence' : 'Not yet in the Realm of Confidence');
    set('scCompany', meta.company || d.company || '—');
    set('scTicker', meta.ticker || d.ticker || '—');
    set('scMarket', meta.market || d.market || '—');
    var sectorBits = [];
    if (meta.sector) sectorBits.push(meta.sector);
    if (meta.industry) sectorBits.push(meta.industry);
    set('scSector', sectorBits.length ? sectorBits.join(' \u00b7 ') : '—');

    var ct = cls.company_type || {};
    set('scCompanyType', ct.code !== undefined && ct.code !== null ? ('Company ' + ct.code) : (ct.label || '—'));
    set('scCompanyTypeDetail', ct.detail || ct.label || '—');
    var gr = cls.roe_roce_group || {};
    set('scRoeGroup', gr.code ? ('Group ' + gr.code) : (gr.label || '—'));
    set('scRoeGroupDetail', gr.detail || gr.label || '—');

    var price = num(meta.current_price);
    var bvm = comp.book_value_model || {};
    var egm = comp.eps_growth_model || {};
    var bcm = comp.bond_coupon_model || {};
    var m1 = num(bvm.intrinsic_value);
    var m2 = num(egm.intrinsic_value);
    var m3 = num(bcm.intrinsic_value);

    set('scPrice', price !== null ? money(price, currency) : '—');
    set('scIvModel1', m1 !== null ? money(m1, currency) : '—');
    set('scIvModel2', m2 !== null ? money(m2, currency) : '—');
    set('scIvModel3', m3 !== null ? money(m3, currency) : '—');

    var ivs = [m1, m2, m3].filter(function (v) { return v !== null; });
    var intrinsic = ivs.length ? ivs.reduce(function (a, b) { return a + b; }, 0) / ivs.length : null;
    set('scIntrinsic', intrinsic !== null ? money(intrinsic, currency) : '—');

    if (price !== null && intrinsic !== null) {
      var delta = ((intrinsic - price) / Math.abs(price)) * 100;
      set('scUpside', (delta >= 0 ? '+' : '') + pct(delta));
    } else {
      set('scUpside', '—');
    }

    var bd = score.breakdown || {};
    var bits = [];
    if (Array.isArray(bd.passed)) bits.push('passed: ' + bd.passed.join(', '));
    if (Array.isArray(bd.failed)) bits.push('failed: ' + bd.failed.join(', '));
    set('scBreakdown', bits.join(' \u00b7 '));
  }

  // ---------- Render: 23 Points ----------
  function renderPoints(d) {
    var points = Array.isArray(d.points) ? d.points : [];
    var indexEl = $('#pointIndex');
    var cardsEl = $('#pointCards');
    if (indexEl) indexEl.innerHTML = '';
    if (cardsEl) cardsEl.innerHTML = '';

    points.forEach(function (p, i) {
      var id = (p && p.id) ? p.id : 'p' + (i + 1);
      var numLabel = (p && p.num !== undefined && p.num !== null) ? String(p.num) : String(i + 1);
      var title = (p && p.title) ? p.title : 'Point ' + numLabel;
      var score = num(p.score);
      var verdict = (score === 1) ? 'YES' : (score === 0 ? 'NO' : '\u2022');

      if (indexEl) {
        var item = document.createElement('div');
        item.className = 'idx-item';
        item.innerHTML = '<span class="idx-num">' + numLabel + '</span><span class="idx-title">' + esc(title) + '</span><span class="idx-chip">' + verdict + '</span>';
        indexEl.appendChild(item);
      }
      if (cardsEl) {
        var calc = '';
        if (Array.isArray(p.calc)) {
          calc = p.calc.map(function (c) { return esc((c && c.label) ? c.label : '') + ': ' + esc((c && c.value !== undefined) ? c.value : ''); }).join(' \u2014 ');
        }
        var card = document.createElement('article');
        card.className = 'point-card';
        card.id = 'point-' + id;
        card.innerHTML =
          '<header class="point-head">' +
          '<span class="point-num">' + esc(numLabel) + '</span>' +
          '<h3 class="point-title">' + esc(title) + '</h3>' +
          '<span class="point-badge ' + (score === 1 ? 'pass' : (score === 0 ? 'fail' : 'none')) + '">' + verdict + '</span>' +
          '</header>' +
          '<div class="point-body">' +
          '<p class="question">' + esc(p.question || p.principle || '') + '</p>' +
          '<div class="formula">' + esc(p.formula || '') + '</div>' +
          '<div class="calc">' + esc(calc) + '</div>' +
          '<div class="point-value">' + esc(p.value !== undefined ? p.value : '') + '</div>' +
          '</div>';
        cardsEl.appendChild(card);
      }
    });
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Render: Statement (compact) ----------
  function renderStatement(d) {
    var stmt = d.statement || {};
    var wrap = $('#stmtTables');
    if (!wrap) return;
    wrap.innerHTML = '';
    var years = Array.isArray(stmt.years) ? stmt.years : [];
    if (!years.length) return;

    var sections = [
      { key: 'financials', title: 'Financials', rows: ['revenue', 'net_profit', 'eps', 'dps', 'book_value_ps', 'cfo', 'capex', 'fcf', 'price', 'pe'] },
      { key: 'profitability', title: 'Profitability', rows: ['gross_margin', 'operating_margin', 'net_margin', 'roe', 'roce'] },
      { key: 'growth', title: 'Growth', rows: ['revenue_yoy', 'eps_yoy'] },
    ];
    sections.forEach(function (sec) {
      var data = stmt[sec.key] || {};
      if (!data) return;
      var secEl = document.createElement('section');
      secEl.className = 'stmt-section';
      var h3 = document.createElement('h3');
      h3.className = 'sub-title';
      h3.textContent = sec.title;
      secEl.appendChild(h3);
      var table = document.createElement('table');
      table.className = 'tbl';
      var thead = document.createElement('thead');
      var tr = document.createElement('tr');
      var th1 = document.createElement('th');
      th1.textContent = 'Metric';
      tr.appendChild(th1);
      years.forEach(function (y) {
        var th = document.createElement('th');
        th.textContent = String(y);
        th.className = 'num';
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
      var tbody = document.createElement('tbody');
      sec.rows.forEach(function (k) {
        var arr = Array.isArray(data[k]) ? data[k] : [];
        var row = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.textContent = k.replace(/_/g, ' ');
        row.appendChild(td1);
        for (var i = 0; i < years.length; i++) {
          var td = document.createElement('td');
          td.className = 'num';
          td.textContent = fmt(arr[i]);
          row.appendChild(td);
        }
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      secEl.appendChild(table);
      wrap.appendChild(secEl);
    });
  }

  // ---------- Render: Forensic checks ----------
  function renderForensic(d) {
    var pts = Array.isArray(d.points) ? d.points : [];
    var wrap = $('#forensicChecks');
    if (!wrap) return;
    wrap.innerHTML = '';
    pts.forEach(function (p) {
      var score = num(p.score);
      var div = document.createElement('div');
      div.className = 'forensic-check';
      var badge = (score === 1) ? 'YES' : (score === 0 ? 'NO' : '\u2022');
      var cls = score === 1 ? 'pass' : (score === 0 ? 'fail' : 'none');
      div.innerHTML =
        '<div class="fc-id">#' + esc((p && p.num) ? p.num : '') + '</div>' +
        '<div>' +
        '<div class="fc-title">' + esc((p && p.title) ? p.title : '') + '</div>' +
        '<div class="fc-metric">' + esc((p && p.value !== undefined) ? p.value : '') + '</div>' +
        '<div class="fc-expl">' + esc((p && p.question) ? p.question : '') + '</div>' +
        '</div>' +
        '<div class="fc-badge ' + cls + '">' + badge + '</div>';
      wrap.appendChild(div);
    });
  }

  // ---------- Render: Hero strip ----------
  function renderHero(d, currency) {
    var meta = d.meta || {};
    var price = num(meta.current_price);
    set('stripTitle', (meta.company || d.company || '') + ' (' + (meta.ticker || d.ticker || '') + ')');
    set('stripPrice', price !== null ? money(price, currency) : '—');
  }

  // ---------- Top-level render ----------
  window.render = function (d) {
    if (!d) return;
    var currency = (d.meta && d.meta.currency) || (d.currency) || 'INR';
    renderScorecard(d, currency);
    renderPoints(d);
    renderStatement(d);
    renderForensic(d);
    renderHero(d, currency);
    // Show scorecard
    var sc = $('#scorecard');
    if (sc) sc.removeAttribute('hidden');
    var empty = $('#emptyState');
    if (empty) empty.setAttribute('hidden', '');
  };

  // ---------- Analyse ----------
  window.analyse = function (ticker) {
    ticker = String(ticker || '').trim();
    if (!ticker) {
      var inp = $('#tickerInput');
      if (inp) ticker = inp.value.trim();
      if (!ticker) return;
    }
    ticker = normTicker(ticker);
    var data = window.FOUNDER_DATA || {};
    var entry = data[ticker];
    if (!entry) {
      // Try case-insensitive / full match
      var keys = Object.keys(data);
      var match = keys.find(function (k) { return k.toUpperCase() === ticker; });
      if (match) entry = data[match];
    }
    if (!entry) {
      alert('No data for ticker: ' + ticker);
      return;
    }
    window.render(entry);
  };

  // ---------- Wire up UI ----------
  function init() {
    var btn = $('#analyseBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        var inp = $('#tickerInput');
        window.analyse(inp ? inp.value.trim() : '');
      });
    }
    var form = $('#searchForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('#tickerInput');
        window.analyse(inp ? inp.value.trim() : '');
      });
    }
    // Quick chips
    $$('.quick-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.getAttribute('data-ticker');
        if (!t) {
          // text like "MARUTIMaruti Suzuki" — first token is ticker
          var txt = (chip.textContent || '').trim();
          t = txt.split(/\s+/)[0];
        }
        var inp = $('#tickerInput');
        if (inp) inp.value = t;
        window.analyse(t);
      });
    });
  }

  // Wait for DOM, then init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
