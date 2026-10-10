import json, os, html
F = 'font-family="Manrope,system-ui,sans-serif"'
C = dict(moon='#cdbdff', violet='#8b5cf6', mint='#3fe0a0', rose='#ff6b8a', amber='#ffc85c', white='#f1ecff', muted='#a99fcc', bg='#0b0820')
GRID = 'rgba(205,189,255,.08)'

def head(label):
    return (f'<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{html.escape(label)}">'
            f'<rect width="720" height="380" rx="18" fill="#0b0820"/>')

def t(x, y, s, fill='white', size=18, anchor='start', weight=700):
    fill = C.get(fill, fill)
    return f'<text x="{x:.1f}" y="{y:.1f}" {F} font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{html.escape(str(s))}</text>'

def line(x1, y1, x2, y2, col='muted', w=1.5, dash=None, op=1):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{C.get(col,col)}" stroke-width="{w}"{d} stroke-opacity="{op}"/>'

def rect(x, y, w, h, fill='violet', fop=.18, stroke=None, rx=10, sw=1.5, dash=None):
    s = C.get(stroke or fill, stroke or fill)
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{C.get(fill,fill)}" fill-opacity="{fop}" stroke="{s}" stroke-width="{sw}"{d}/>'

def poly(pts, col='moon', w=3):
    p = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return f'<polyline points="{p}" fill="none" stroke="{C.get(col,col)}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>'

def arrow(x1, y1, x2, y2, col='muted', w=2):
    import math
    a = math.atan2(y2 - y1, x2 - x1); L = 10
    p1 = (x2 - L * math.cos(a - .45), y2 - L * math.sin(a - .45)); p2 = (x2 - L * math.cos(a + .45), y2 - L * math.sin(a + .45))
    c = C.get(col, col)
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}"/>'
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f} L{x2:.1f} {y2:.1f} L{p2[0]:.1f} {p2[1]:.1f}" fill="none" stroke="{c}" stroke-width="{w}"/>')

def dot(x, y, col='moon', r=5):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{C.get(col,col)}"/>'

def svg(label, parts):
    return head(label) + ''.join(parts) + '</svg>'

def save(a):
    p = f'/home/claude/articles/src/{a["slug"]}.json'
    json.dump(a, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    import re
    tx = a['lead'] + ' ' + ' '.join(s['html'] for s in a['sections'])
    print(a['slug'], 'words', len(re.sub('<[^>]+>', ' ', tx).split()), 'title', len(a['title']), 'desc', len(a['description']),
          'figs', sum(1 for s in a['sections'] if s.get('figure')))
