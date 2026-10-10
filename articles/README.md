# Статті MoonTrade (SEO)

- `src/<slug>.json` — тексти статей (формат описано в docstring `build_articles.py`).
- `build_articles.py` — збирає `moontrade-site/statti/<slug>/index.html` і `sitemap.xml`.
- `article.css` — стилі сторінки статті.
- `BRIEF.md` — правила написання (що можна / не можна, тон, обсяг).
- `lessons/` — тексти уроків курсу, з яких переписані статті.
- `gen/` — допоміжні генератори схем.
- `shot.py`, `figsheet.py` — скріншоти статей і схем для перевірки.

Статті приховані: на сайті немає посилань на /statti/, вони є лише в sitemap.xml для Google.
