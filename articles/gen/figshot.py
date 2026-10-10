import asyncio, sys
from playwright.async_api import async_playwright
SITE = '/home/claude/moontrade-site'
OUT = sys.argv[1]; slugs = sys.argv[2:]

async def m():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for s in slugs:
            for w, n in [(1280, 'd'), (390, 'm')]:
                pg = await b.new_page(viewport={'width': w, 'height': 900}, device_scale_factor=1)
                await pg.goto(f'file://{SITE}/statti/{s}/index.html'); await pg.wait_for_timeout(300)
                await pg.add_style_tag(content='.top{position:static!important}')
                figs = await pg.query_selector_all('figure.fig')
                for i, f in enumerate(figs):
                    await f.screenshot(path=f'{OUT}/{s}_f{i+1}_{n}.png')
                print(s, n, len(figs), 'figs')
                await pg.close()
        await b.close()
asyncio.run(m())
