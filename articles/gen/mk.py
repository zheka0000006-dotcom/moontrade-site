import json, os
SRC = '/home/claude/articles/src'

def K(start, specs):
    """specs: list of close | (close, hi, lo) | (open, close, hi, lo) with explicit open."""
    out = []; prev = start
    for i, s in enumerate(specs):
        if isinstance(s, (int, float)):
            o, c = prev, s
            w = 0.18 + 0.12 * (i % 3); v = 0.16 + 0.1 * ((i + 1) % 3)
            h, l = max(o, c) + w, min(o, c) - v
        elif len(s) == 3:
            o = prev; c, h, l = s
        else:
            o, c, h, l = s
        h = max(h, o, c); l = min(l, o, c)
        out.append([round(o, 2), round(h, 2), round(l, 2), round(c, 2)]); prev = c
    return out

def save(a):
    p = os.path.join(SRC, a['slug'] + '.json')
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(a, f, ensure_ascii=False, indent=1)
    print('saved', p)
