#!/usr/bin/env python3
"""Build MoonTrade articles: src/<slug>.json -> moontrade-site/statti/<slug>/index.html (+ sitemap).

Article JSON:
{
 "slug": "yaponski-svichky",
 "title": "<title> for Google (<= 65 chars)",
 "h1": "page heading",
 "description": "meta description (140-160 chars)",
 "lead": "2-3 sentence direct answer",
 "lesson": "17",                      # lesson number(s) as text, for the course CTA
 "sections": [ {"h2": "...", "html": "<p>..</p>", "figure": FIG?}, ... ],
 "mistakes": ["...", ...],            # 3-5 typical beginner mistakes
 "quiz": [ {"q": "...", "a": "..."}, ... ],   # 2-3, also used as FAQ schema
 "related": ["slug", ...]             # 2-3 other article slugs
}
FIG = {"type":"chart", "caption": "...", "closes":[...], "seed":1, "ohlc":[[o,h,l,c],...]?,
       "lines":[{"y":p,"from":i,"to":j,"color":"moon|mint|rose|amber|white","dash":true,"label":"..."}],
       "zones":[{"from":i,"to":j,"y0":p,"y1":p,"color":"violet|mint|rose|amber","label":"..."}],
       "marks":[{"i":idx,"at":"high|low","label":"...","color":"..."}],
       "path":[[i,price],...], "path_color":"moon", "arrows":[{"i":idx,"dir":"up|down","color":".."}]}
    | {"type":"svg", "caption":"...", "svg":"<svg viewBox=...>...</svg>"}   # raw, palette colors only
"""
import json, os, re, random, html, glob, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = '/home/claude/moontrade-site'
BASE = 'https://moontrade.community'
TG = 'https://t.me/+qmdQe3VskkA5OTcy'
LEARN = 'https://learn.moontrade.community/'
COL = {'moon': '#cdbdff', 'mint': '#3fe0a0', 'rose': '#ff6b8a', 'amber': '#ffc85c', 'white': '#ffffff', 'violet': '#8b5cf6'}
TODAY = datetime.date.today().isoformat()

def esc(t): return html.escape(t, quote=True)

def candles_from_closes(closes, seed):
    rnd = random.Random(seed)
    out = []; prev = closes[0] - (closes[1] - closes[0]) * 0.5 if len(closes) > 1 else closes[0]
    span = (max(closes) - min(closes)) or 1
    for c in closes:
        o = prev
        w1 = rnd.uniform(0.02, 0.09) * span; w2 = rnd.uniform(0.02, 0.09) * span
        out.append([o, max(o, c) + w1, min(o, c) - w2, c]); prev = c
    return out

def text_w(t, size):
    w = sum(0.72 if ch.isupper() else (0.34 if ch in ' .,:;|!il1' else 0.58) for ch in t)
    return w * size + 18

def chart_svg(f):
    W, H = 720, 380
    K = f.get('ohlc') or candles_from_closes(f['closes'], f.get('seed', 1))
    n = len(K)
    lo = min(k[2] for k in K); hi = max(k[1] for k in K)
    for l in f.get('lines', []): lo = min(lo, l['y']); hi = max(hi, l['y'])
    for z in f.get('zones', []): lo = min(lo, z['y0'], z['y1']); hi = max(hi, z['y0'], z['y1'])
    pad = (hi - lo) * 0.16; lo -= pad; hi += pad
    L, R, T, B = 20, W - 110, 24, H - 28
    cw = (R - L) / n
    X = lambda i: L + (i + 0.5) * cw
    Y = lambda v: B - (v - lo) / (hi - lo) * (B - T)
    o = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{esc(f.get("caption",""))}" xmlns="http://www.w3.org/2000/svg">',
         f'<rect width="{W}" height="{H}" rx="18" fill="#0b0820"/>']
    for g in range(1, 8): o.append(f'<line x1="0" x2="{W}" y1="{T+(B-T)*g/8:.1f}" y2="{T+(B-T)*g/8:.1f}" stroke="rgba(205,189,255,.06)"/>')
    for g in range(1, 12): o.append(f'<line y1="0" y2="{H}" x1="{W*g/12:.1f}" x2="{W*g/12:.1f}" stroke="rgba(205,189,255,.05)"/>')
    labels = []
    for z in f.get('zones', []):
        c = COL.get(z.get('color', 'violet'), '#8b5cf6')
        x0, x1 = X(z['from']) - cw / 2, X(z['to']) + cw / 2
        y0, y1 = Y(max(z['y0'], z['y1'])), Y(min(z['y0'], z['y1']))
        o.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1-x0:.1f}" height="{y1-y0:.1f}" fill="{c}" fill-opacity=".16" stroke="{c}" stroke-opacity=".6" stroke-dasharray="5 4"/>')
        if z.get('label'): labels.append((z['label'], x0 + 4, y1 + 18, c, 'l'))
    if f.get('path'):
        c = COL.get(f.get('path_color', 'moon'))
        pts = ' '.join(f'{X(i):.1f},{Y(p):.1f}' for i, p in f['path'])
        o.append(f'<polyline points="{pts}" fill="none" stroke="{c}" stroke-width="2" stroke-opacity=".75" stroke-linejoin="round"/>')
    bw = max(4, cw * 0.56)
    boxes = []
    for i, (op, h, l, c) in enumerate(K):
        up = c >= op; col = '#3fe0a0' if up else '#ff6b8a'
        x = X(i); y1 = Y(max(op, c)); y2 = Y(min(op, c))
        o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{Y(h):.1f}" y2="{Y(l):.1f}" stroke="{col}" stroke-width="1.6"/>')
        o.append(f'<rect x="{x-bw/2:.1f}" y="{y1:.1f}" width="{bw:.1f}" height="{max(2,y2-y1):.1f}" rx="1.5" fill="{col}"/>')
        boxes.append((x - bw / 2 - 2, Y(h) - 2, bw + 4, Y(l) - Y(h) + 4))
    for l in f.get('lines', []):
        c = COL.get(l.get('color', 'moon'))
        x0 = X(l.get('from', 0)) - cw / 2; x1 = X(l.get('to', n - 1)) + cw / 2
        dash = ' stroke-dasharray="6 5"' if l.get('dash') else ''
        o.append(f'<line x1="{x0:.1f}" x2="{x1:.1f}" y1="{Y(l["y"]):.1f}" y2="{Y(l["y"]):.1f}" stroke="{c}" stroke-width="1.8"{dash}/>')
        if l.get('label'): labels.append((l['label'], x1 + 8, Y(l['y']), c, 'l'))
    for a in f.get('arrows', []):
        c = COL.get(a.get('color', 'white')); x = X(a['i']); k = K[a['i']]
        if a['dir'] == 'up':
            y = Y(k[2]) + 10; o.append(f'<path d="M{x:.1f} {y+26:.1f} V{y:.1f} M{x-6:.1f} {y+8:.1f} L{x:.1f} {y:.1f} L{x+6:.1f} {y+8:.1f}" stroke="{c}" stroke-width="2.2" fill="none"/>')
        else:
            y = Y(k[1]) - 10; o.append(f'<path d="M{x:.1f} {y-26:.1f} V{y:.1f} M{x-6:.1f} {y-8:.1f} L{x:.1f} {y:.1f} L{x+6:.1f} {y-8:.1f}" stroke="{c}" stroke-width="2.2" fill="none"/>')
    for m in f.get('marks', []):
        c = COL.get(m.get('color', 'moon')); k = K[m['i']]; x = X(m['i'])
        if m.get('at', 'high') == 'high':
            y = Y(k[1]); o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="none" stroke="{c}" stroke-width="2"/>'); ly = y - 22
        else:
            y = Y(k[2]); o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="none" stroke="{c}" stroke-width="2"/>'); ly = y + 22
        if m.get('label'): labels.append((m['label'], x, ly, c, 'c'))
    # labels with simple collision avoidance
    placed = []
    def hit(a, b): return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]
    for t, x, y, c, al in labels:
        w = text_w(t, 16); h = 30
        if al == 'c': x -= w / 2
        x = max(6, min(W - w - 6, x))
        best = y
        for off in [0, 14, -14, 28, -28, 42, -42, 60, -60, 80, -80]:
            r = (x - 2, y + off - h / 2 - 2, w + 4, h + 4)
            if r[1] < 4 or r[1] + r[3] > H - 4: continue
            if not any(hit(r, b) for b in placed) and not any(hit(r, b) for b in boxes): best = y + off; break
        placed.append((x - 2, best - h / 2 - 2, w + 4, h + 4))
        o.append(f'<rect x="{x:.1f}" y="{best-h/2:.1f}" width="{w:.1f}" height="{h}" rx="8" fill="#0d0a1f" fill-opacity=".94" stroke="{c}" stroke-width="1.2"/>')
        o.append(f'<text x="{x+9:.1f}" y="{best+5.5:.1f}" fill="{c}" font-family="Manrope,system-ui,sans-serif" font-size="16" font-weight="700">{esc(t)}</text>')
    o.append('</svg>')
    return '\n'.join(o)

def figure(f):
    svg = chart_svg(f) if f.get('type', 'chart') == 'chart' else f['svg']
    cap = f'<figcaption>{esc(f["caption"])}</figcaption>' if f.get('caption') else ''
    return f'<figure class="fig">{svg}{cap}</figure>'

CSS = open(os.path.join(ROOT, 'article.css'), encoding='utf-8').read()

def page(a, all_meta):
    url = f'{BASE}/statti/{a["slug"]}/'
    secs = []
    toc = []
    for i, s in enumerate(a['sections']):
        sid = f's{i+1}'
        toc.append(f'<li><a href="#{sid}">{esc(s["h2"])}</a></li>')
        fig = figure(s['figure']) if s.get('figure') else ''
        secs.append(f'<section id="{sid}"><h2>{esc(s["h2"])}</h2>{s["html"]}{fig}</section>')
    mist = ''.join(f'<li>{m}</li>' for m in a.get('mistakes', []))
    quiz = ''.join(f'<details><summary>{esc(q["q"])}</summary><p>{q["a"]}</p></details>' for q in a.get('quiz', []))
    rel = ''.join(f'<a class="rel" href="/statti/{r}/"><b>{esc(all_meta[r]["h1"])}</b><span>{esc(all_meta[r]["description"][:110])}…</span></a>' for r in a.get('related', []) if r in all_meta)
    faq = [{"@type": "Question", "name": q['q'], "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', q['a'])}} for q in a.get('quiz', [])]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": a['h1'], "description": a['description'], "inLanguage": "uk", "mainEntityOfPage": url,
         "datePublished": a.get('date', TODAY), "dateModified": TODAY,
         "author": {"@type": "Organization", "name": "MoonTrade", "url": BASE + '/'},
         "publisher": {"@type": "Organization", "name": "MoonTrade", "logo": {"@type": "ImageObject", "url": BASE + '/assets/logo.jpg'}},
         "image": BASE + '/assets/og.jpg'},
        {"@type": "FAQPage", "mainEntity": faq},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "MoonTrade", "item": BASE + '/'},
            {"@type": "ListItem", "position": 2, "name": a['h1'], "item": url}]}]}
    lesson = a.get('lesson', '')
    return f'''<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(a["title"])}</title>
<meta name="description" content="{esc(a["description"])}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta name="theme-color" content="#0d0a1f">
<meta property="og:type" content="article">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="MoonTrade">
<meta property="og:title" content="{esc(a["h1"])}">
<meta property="og:description" content="{esc(a["description"])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700&display=swap">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="/"><img src="/assets/logo.jpg" alt="" width="32" height="32">MoonTrade</a>
<a class="btn btn-primary btn-sm" href="{TG}" target="_blank" rel="noopener">Долучитися</a></div></header>
<main class="wrap art">
<nav class="crumbs" aria-label="Навігація"><a href="/">MoonTrade</a> <span>/</span> <span>Статті</span></nav>
<h1>{esc(a["h1"])}</h1>
<p class="lead">{a["lead"]}</p>
<nav class="toc" aria-label="Зміст"><b>У статті</b><ol>{''.join(toc)}<li><a href="#mistakes">Типові помилки</a></li><li><a href="#quiz">Перевір себе</a></li></ol></nav>
{''.join(secs)}
<section id="mistakes"><h2>Типові помилки новачків</h2><ul class="mist">{mist}</ul></section>
<section id="quiz"><h2>Перевір себе</h2><div class="quiz">{quiz}</div></section>
<aside class="cta">
<div><h2>Хочеш розібратися глибше?</h2><p>Цю тему ми детально розбираємо в безкоштовному навчанні «Трейдинг з нуля»{(" — урок " + esc(lesson)) if lesson else ""}. А в Telegram-спільноті — розбори на живому ринку й відповіді на питання.</p></div>
<div class="cta-b"><a class="btn btn-primary" href="{LEARN}">Безкоштовне навчання</a><a class="btn btn-ghost" href="{TG}" target="_blank" rel="noopener">Telegram-спільнота</a></div>
</aside>
{('<section class="related"><h2>Далі за темою</h2><div class="rels">' + rel + '</div></section>') if rel else ''}
<p class="risk">Матеріал має освітній характер і не є інвестиційною порадою. Торгівля на фінансових ринках пов’язана з високим ризиком втрати коштів. Приклади на схемах навчальні.</p>
</main>
<footer class="wrap foot"><a class="brand" href="/"><img src="/assets/logo.jpg" alt="" width="28" height="28">MoonTrade</a><span>© 2026 MoonTrade</span></footer>
<script defer type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "9b325ebbe6dd4bb7acda78a19dff78ff"}}'></script>
</body>
</html>
'''

def main():
    arts = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'src', '*.json'))):
        a = json.load(open(p, encoding='utf-8')); arts.append(a)
    meta = {a['slug']: a for a in arts}
    for a in arts:
        d = os.path.join(SITE, 'statti', a['slug']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page(a, meta))
    # sitemap: keep base pages, add articles
    base = [(BASE + '/', TODAY), ('https://learn.moontrade.community/', TODAY), (BASE + '/risk.html', TODAY), (BASE + '/privacy.html', TODAY)]
    urls = base + [(f'{BASE}/statti/{a["slug"]}/', TODAY) for a in arts]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
         ''.join(f'<url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n' for u, d in urls) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    print('built', len(arts), [a['slug'] for a in arts])

if __name__ == '__main__':
    main()
