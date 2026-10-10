import asyncio,sys
from playwright.async_api import async_playwright
# crop each figure element directly: out dir, slug
OUT=sys.argv[1]; slugs=sys.argv[2:]
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for s in slugs:
      for w,n in [(1280,'d'),(390,'m')]:
        pg=await b.new_page(viewport={'width':w,'height':900}, device_scale_factor=1)
        await pg.goto(f'file:///home/claude/moontrade-site/statti/{s}/index.html'); await pg.wait_for_timeout(400)
        figs=await pg.query_selector_all('figure.fig')
        for i,f in enumerate(figs):
          await f.screenshot(path=f'{OUT}/{s}_f{i+1}_{n}.png')
        await pg.close()
    await b.close()
asyncio.run(m())
