"""Helpers for hand-built SVG figures (720x380, MoonTrade palette)."""
import random, json, os, statistics

W, H = 720, 380
MOON, VIOLET, MINT, ROSE, AMBER, INK, MUTED = '#cdbdff', '#8b5cf6', '#3fe0a0', '#ff6b8a', '#ffc85c', '#f1ecff', '#a99fcc'
FONT = 'Manrope,system-ui,sans-serif'
SRC = '/home/claude/articles/src'


def head(label):
    o = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{label}">',
         f'<rect width="{W}" height="{H}" rx="18" fill="#0b0820"/>']
    for g in range(1, 8):
        y = H * g / 8
        o.append(f'<line x1="0" x2="{W}" y1="{y:.0f}" y2="{y:.0f}" stroke="rgba(205,189,255,.06)"/>')
    return o


def text(x, y, t, color=INK, size=18, anchor='start', weight=700):
    return (f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" text-anchor="{anchor}">{t}</text>')


def tag(x, y, t, color, size=18, anchor='start'):
    """Text in a rounded box (like build_articles labels). y = vertical centre."""
    w = len(t) * size * 0.62 + 18
    h = size + 12
    if anchor == 'middle':
        x -= w / 2
    elif anchor == 'end':
        x -= w
    return (f'<rect x="{x:.1f}" y="{y-h/2:.1f}" width="{w:.1f}" height="{h}" rx="8" fill="#0d0a1f" fill-opacity=".94" '
            f'stroke="{color}" stroke-width="1.2"/>' + text(x + 9, y + size * 0.34, t, color, size))


def ohlc(closes, seed=1, wick=0.35, first_open=None):
    rnd = random.Random(seed)
    out = []
    prev = first_open if first_open is not None else closes[0] - (closes[1] - closes[0]) * 0.6
    moves = [abs(b - a) for a, b in zip(closes, closes[1:])] or [1]
    avg = sum(moves) / len(moves)
    for c in closes:
        o = prev
        out.append([o, max(o, c) + rnd.uniform(0.15, 1) * wick * avg, min(o, c) - rnd.uniform(0.15, 1) * wick * avg, c])
        prev = c
    return out


class Panel:
    def __init__(self, x0, y0, x1, y1, lo, hi, n):
        self.x0, self.y0, self.x1, self.y1, self.lo, self.hi, self.n = x0, y0, x1, y1, lo, hi, n
        self.cw = (x1 - x0) / n

    def X(self, i):
        return self.x0 + (i + 0.5) * self.cw

    def Y(self, v):
        return self.y1 - (v - self.lo) / (self.hi - self.lo) * (self.y1 - self.y0)

    def candles(self, K, bwk=0.58):
        o = []
        bw = max(3, self.cw * bwk)
        for i, (op, h, l, c) in enumerate(K):
            col = MINT if c >= op else ROSE
            x = self.X(i)
            o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{self.Y(h):.1f}" y2="{self.Y(l):.1f}" stroke="{col}" stroke-width="1.5"/>')
            yt, yb = self.Y(max(op, c)), self.Y(min(op, c))
            o.append(f'<rect x="{x-bw/2:.1f}" y="{yt:.1f}" width="{bw:.1f}" height="{max(2, yb-yt):.1f}" rx="1.5" fill="{col}"/>')
        return o

    def line(self, vals, color, width=2, start=0, dash=None, opacity=1):
        pts = ' '.join(f'{self.X(start+i):.1f},{self.Y(v):.1f}' for i, v in enumerate(vals) if v is not None)
        d = f' stroke-dasharray="{dash}"' if dash else ''
        return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" stroke-opacity="{opacity}" stroke-linejoin="round"{d}/>'

    def hline(self, v, color, dash='6 5', width=1.6, x0=None, x1=None):
        return (f'<line x1="{x0 if x0 is not None else self.x0:.1f}" x2="{x1 if x1 is not None else self.x1:.1f}" '
                f'y1="{self.Y(v):.1f}" y2="{self.Y(v):.1f}" stroke="{color}" stroke-width="{width}" stroke-dasharray="{dash}"/>')


def rsi(closes, n=14):
    out = [None] * len(closes)
    gains = [max(0, b - a) for a, b in zip(closes, closes[1:])]
    losses = [max(0, a - b) for a, b in zip(closes, closes[1:])]
    ag = sum(gains[:n]) / n
    al = sum(losses[:n]) / n
    out[n] = 100 - 100 / (1 + ag / al) if al else 100
    for i in range(n + 1, len(closes)):
        ag = (ag * (n - 1) + gains[i - 1]) / n
        al = (al * (n - 1) + losses[i - 1]) / n
        out[i] = 100 - 100 / (1 + ag / al) if al else 100
    return out


def boll(closes, n=20, k=2):
    mid, up, dn = [], [], []
    for i in range(len(closes)):
        if i < n - 1:
            mid.append(None); up.append(None); dn.append(None); continue
        w = closes[i - n + 1:i + 1]
        m = sum(w) / n
        sd = statistics.pstdev(w)
        mid.append(m); up.append(m + k * sd); dn.append(m - k * sd)
    return mid, up, dn


def save(article):
    for sec in article['sections']:
        f = sec.get('figure')
        if f and f.get('ohlc'):
            for k in f['ohlc']:
                k[1] = round(max(k), 2); k[2] = round(min(k), 2)
    p = os.path.join(SRC, article['slug'] + '.json')
    json.dump(article, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('saved', p)
