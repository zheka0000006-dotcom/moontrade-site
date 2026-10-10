import json, re
SRC = '/home/claude/articles/src/'
def bars(start, spec):
    """spec item: close  or (close, high|None, low|None). open = previous close."""
    out = []; o = start
    for i, s in enumerate(spec):
        if isinstance(s, (int, float)): c, h, l = s, None, None
        else: c, h, l = (list(s) + [None, None])[:3]
        w1 = 0.12 + 0.06 * ((i * 7) % 4); w2 = 0.12 + 0.06 * ((i * 5 + 2) % 4)
        hi = max(o, c) + w1 if h is None else h
        lo = min(o, c) - w2 if l is None else l
        out.append([round(o, 2), round(hi, 2), round(lo, 2), round(c, 2)]); o = c
    return out
def save(a):
    p = SRC + a['slug'] + '.json'
    json.dump(a, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    t = a['lead'] + ' ' + ' '.join(s['html'] for s in a['sections'])
    words = len(re.sub('<[^>]+>', ' ', t).split())
    figs = sum(1 for s in a['sections'] if s.get('figure'))
    print(a['slug'], 'words', words, 'figs', figs, 'title', len(a['title']), 'desc', len(a['description']), 'secs', len(a['sections']))
