#!/usr/bin/env python3
"""Build a screener-style full statement block for a ticker.

Fetches the screener.in consolidated page, parses P&L / Quarters / Balance
Sheet / Cash Flow / Ratios / Shareholding, and writes a `statement_full`
object into data/tickers/<T>.json.

Usage: python3 tools/build_statement_full.py ITC [HDFCBANK ...]
"""
import json, os, re, sys, urllib.request
from html.parser import HTMLParser

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9'}

SECTIONS = ['quarters', 'profit-loss', 'balance-sheet', 'cash-flow', 'ratios', 'shareholding']

class TableParser(HTMLParser):
    """Extract screener tables: label row cells + number cells, top-level only."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.depth = 0          # nested-table guard
        self.rows = None
        self.row = None
        self.cell = None
        self.cell_kind = None   # 'label' | 'num'
        self.cell_italic = 0
        self.in_header = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'table':
            self.depth += 1
            if self.depth == 1:
                self.rows = []
        elif tag == 'tr' and self.depth == 1 and self.rows is not None:
            self.row = []
        elif tag == 'td' and self.depth == 1 and self.row is not None:
            self.cell = []
            cls = a.get('class', '')
            self.cell_kind = 'label' if 'text' in cls else 'num'
            self.cell_italic = ('italics' in cls)
        elif tag == 'th' and self.depth == 1 and self.rows is not None:
            self.cell = []
            cls = a.get('class', '')
            self.cell_kind = 'head' if 'text' in cls else 'headnum'
            self.cell_italic = False
            self.in_header = True
        elif tag in ('b', 'strong') and self.cell is not None:
            pass
        elif tag == 'a' and self.cell is not None:
            pass

    def handle_endtag(self, tag):
        if tag == 'th' and self.cell is not None:
            text = ''.join(self.cell).strip()
            self.row.append((self.cell_kind, text, self.cell_italic))
            self.cell = None
        if tag == 'table':
            if self.depth == 1 and self.rows is not None:
                self.tables.append(self.rows)
                self.rows = None
            self.depth = max(0, self.depth - 1)
        elif tag == 'tr' and self.row is not None and self.depth == 1:
            if any(c[1] for c in self.row):
                self.rows.append(self.row)
            self.row = None
        elif tag == 'td' and self.cell is not None:
            text = ''.join(self.cell).strip()
            self.row.append((self.cell_kind, text, self.cell_italic))
            self.cell = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

def _num(s):
    s = s.replace(',', '').replace('%', '').strip()
    if s in ('', '-', '—'):
        return None
    try:
        return float(s)
    except ValueError:
        return None

def parse_section(html, section_id):
    m = re.search(r'<section[^>]*id="%s"[^>]*>(.*?)(?=<section|\Z)' % section_id, html, re.S)
    if not m:
        return None
    body = m.group(1)
    tp = TableParser(); tp.feed(body)
    out = {}
    for rows in tp.tables:
        periods = None
        for row in rows:
            if row and row[0][0] == 'head':
                raw = [c[1] for c in row if c[0] == 'headnum']
                labels = [c[1] for c in row if c[0] == 'head']
                if raw and any(s.strip() for s in raw):
                    periods = [s.strip() for s in raw]
                elif labels:
                    periods = labels[1:]
                break
        for row in rows:
            if not row or row[0][0] != 'label':
                continue
            labels = [c[1] for c in row if c[0] == 'label']
            nums = [_num(c[1]) for c in row if c[0] == 'num']
            if not labels or not nums:
                continue
            key = labels[0]
            if periods and len(nums) != len(periods):
                nums = (nums + [None] * len(periods))[:len(periods)]
            out[key] = {'periods': periods or [None] * len(nums), 'values': nums}
        if out:
            break
    return out or None

def parse_shareholding(html):
    m = re.search(r'<section[^>]*id="shareholding"[^>]*>(.*?)(?=<section|\Z)', html, re.S)
    if not m:
        return None
    body = m.group(1)
    tp = TableParser(); tp.feed(body)
    names = ['quarterly_trends', 'yearly', 'quarterly_pattern']
    result = {}
    for i, rows in enumerate(tp.tables[:3]):
        periods = None
        parsed = []
        for row in rows:
            if row and row[0][0] == 'head' and periods is None:
                raw = [c[1] for c in row if c[0] == 'headnum']
                labels = [c[1] for c in row if c[0] == 'head']
                if raw and any(s.strip() for s in raw):
                    periods = [s.strip() for s in raw]
                elif labels:
                    periods = labels[1:]
                continue
            if not row or row[0][0] != 'label':
                continue
            labels = [c[1] for c in row if c[0] == 'label']
            nums = [_num(c[1]) for c in row if c[0] == 'num']
            if not nums:
                continue
            if periods and len(nums) != len(periods):
                nums = (nums + [None] * len(periods))[:len(periods)]
            parsed.append({'label': labels[0] if labels else '', 'values': nums})
        result[names[i] if i < len(names) else f'table{i}'] = {'periods': periods, 'rows': parsed}
    return result or None

def _fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode('utf-8', 'ignore')

def _parse(html):
    out = {}
    for sec in SECTIONS:
        if sec == 'shareholding':
            out[sec] = parse_shareholding(html)
        else:
            out[sec] = parse_section(html, sec)
    return out

def build(ticker, slug=None):
    # slug: screener.in listing slug when the ticker was renamed there (e.g.
    # TATAMOTORS -> TMPV, ZOMATO -> ETERNAL). The data file keeps the app's
    # ticker name; `url` records the page the numbers actually came from.
    sym = slug or ticker
    url = f'https://www.screener.in/company/{sym}/consolidated/'
    html = _fetch(url)
    parsed = _parse(html)
    # Consolidated pages for some companies serve the table labels with no
    # numeric cells (filled client-side on screener). If nothing parsed, fall
    # back to the standalone page, which carries the numbers server-side.
    def _has_numbers(d):
        for v in (d or {}).values():
            if not isinstance(v, dict):
                continue
            if 'values' in v and any(x is not None for x in v['values']):
                return True
            for r in v.get('rows', []):
                if r.get('values') and any(x is not None for x in r['values']):
                    return True
        return False
    if not any(_has_numbers(parsed.get(sec)) for sec in SECTIONS if sec != 'shareholding'):
        url = f'https://www.screener.in/company/{sym}/'
        html = _fetch(url)
        parsed = _parse(html)
    out = {'source': 'screener.in', 'url': url, 'consolidated': '/consolidated/' in url, 'fetched_at': __import__('datetime').date.today().isoformat()}
    out.update(parsed)
    if slug:
        out['listing_slug'] = slug
    return out

def main():
    tickers = sys.argv[1:]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for t in tickers:
        path = os.path.join(root, 'data', 'tickers', f'{t}.json')
        data = json.load(open(path, encoding='utf-8'))
        sf = build(t)
        data['statement_full'] = sf
        data['statement_full_generated_at'] = __import__('datetime').date.today().isoformat()
        json.dump(data, open(path, 'w', encoding='utf-8'), indent=1)
        secs = {k: (len(v or {})) for k, v in sf.items() if isinstance(v, dict)}
        print(t, '->', secs)

if __name__ == '__main__':
    main()
