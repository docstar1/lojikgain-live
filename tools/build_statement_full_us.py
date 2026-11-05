#!/usr/bin/env python3
"""Full statements for US tickers, from stockanalysis.com (screener.in has no US listings).

Builds the same `statement_full` block shape as build_statement_full.py:
  profit-loss, balance-sheet, cash-flow, ratios   (quarters left empty for now)
All tables on each page are annual (Fiscal Year headers); tables are routed to a
section by their first row label and merged when their column count matches the
section's dominant layout, so every row stays positionally aligned.
Values are floats; percentages become plain numbers (15.06 for 15.06%).
"""
import json, os, re, sys, time, datetime, urllib.request, html as htmllib

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
# Dedicated statement pages first: their fuller tables define each section's
# layout, and the overview page (financials/) only fills gaps afterwards.
PAGES = {
    'balance-sheet': 'financials/balance-sheet/',
    'cash-flow': 'financials/cash-flow-statement/',
    'ratios': 'financials/ratios/',
    'profit-loss': 'financials/',
}

def slug(ticker):
    s = ticker.upper()
    if s.endswith('-B'):
        return s[:-2].lower() + '.b'
    return s.lower()

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')

def num(v):
    s = str(v).replace(',', '').replace('%', '').strip()
    if s in ('', '-', '\u2014', '\u2013', 'nan'): return None
    neg = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    try:
        f = float(s)
    except ValueError:
        return None
    return -f if neg else f

def _text(html):
    t = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).strip()
    t = htmllib.unescape(t)
    # period cells repeat the short label and the full date: keep "Sep '26", drop "Sep 26, 2026"
    if re.match(r"^[A-Za-z]{3} '\d{2} \1? ", t) or ' 20' in t:
        t = re.split(r'\s{1,2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, 20\d{2}$', t)[0].strip()
    return t

def parse_page(html):
    """Return a list of (periods, {label: [values...]}) groups, one per table."""
    tables = re.findall(r'<table[^>]*>(.*?)</table>', html, re.S)
    groups = []
    for tbl in tables:
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbl, re.S)
        periods, data = [], {}
        for r in rows:
            cells = re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S)
            if not cells: continue
            head = _text(cells[0])
            if re.match(r'(Fiscal Year|Quarter Ended|Period Ending)', head, re.I):
                periods = [p for p in (_text(c) for c in cells[1:]) if p]
                continue
            lm = re.search(r'class="[^"]*\btruncate\b[^"]*"[^>]*>(.*?)</div>', cells[0], re.S)
            label = _text(lm.group(1)) if lm else None
            if not label: continue
            vals = [num(_text(c)) for c in cells[1:]]
            if not vals: continue
            data[label] = vals
        if periods and data:
            groups.append((periods, data))
    return groups

def route_table(labels, page):
    L = [l.lower() for l in labels]
    if page in ('balance-sheet', 'cash-flow', 'ratios'):
        return page
    first = L[0] if L else ''
    if first.startswith(('revenue', 'gross margin', 'operating margin', 'dividend')):
        return 'profit-loss'
    if first.startswith('operating cash flow'):
        return 'cash-flow'
    if first.startswith(('cash & investments', 'total debt')):
        return 'balance-sheet'
    if first.startswith('pe ratio'):
        return 'ratios'
    return None  # segments and anything unmapped

def build(ticker):
    s = slug(ticker)
    out = {'source': 'stockanalysis.com', 'consolidated': False,
           'fetched_at': datetime.date.today().isoformat(), 'units': 'USD millions',
           'url': 'https://stockanalysis.com/stocks/' + s + '/'}
    blocks = {k: {} for k in PAGES}
    seen_period_len = {}  # (section, page) -> column count, so each page merges on its own layout
    seen_lengths = {}
    for page, path in PAGES.items():
        try:
            html = fetch('https://stockanalysis.com/stocks/' + s + '/' + path)
        except Exception as e:
            print('  %s %s: fetch failed %s' % (ticker, page, e), file=sys.stderr)
            continue
        for periods, data in parse_page(html):
            sec = route_table(list(data.keys()), page)
            if sec is None: continue
            pl = len(periods)
            key = (sec, page)
            if key not in seen_period_len:
                seen_period_len[key] = pl
            if pl != seen_period_len.get(key) or (sec in seen_lengths and seen_lengths[sec] not in (None, pl)):
                continue
            seen_lengths[sec] = pl
            for label, vals in data.items():
                if vals and label not in blocks[sec]:
                    blocks[sec][label] = {'periods': periods, 'values': vals}
        time.sleep(1.5)
    for sec in PAGES:
        out[sec] = blocks.get(sec, {})
    return out

def main():
    tickers = sys.argv[1:]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for t in tickers:
        p = os.path.join(root, 'data', 'tickers', t + '.json')
        d = json.load(open(p, encoding='utf-8'))
        if 'statement_full' in d: continue
        sf = build(t)
        if not sf.get('profit-loss'):
            print(t + ': no data parsed, skipped'); continue
        d['statement_full'] = sf
        d['statement_full_generated_at'] = sf['fetched_at']
        json.dump(d, open(p, 'w', encoding='utf-8'), indent=1)
        print('OK %s pl=%d bs=%d cf=%d ra=%d' % (t, len(sf['profit-loss']), len(sf['balance-sheet']), len(sf['cash-flow']), len(sf['ratios'])))

if __name__ == '__main__':
    main()
