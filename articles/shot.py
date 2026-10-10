import asyncio,sys,os
from playwright.async_api import async_playwright
SITE='/home/claude/moontrade-site'
OUT=sys.argv[1]; slugs=sys.argv[2:]
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for s in slugs:
      for w,n in [(1280,'d'),(390,'m')]:
        pg=await b.new_page(viewport={'width':w,'height':900}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(f'file://{SITE}/statti/{s}/index.html'); await pg.wait_for_timeout(300)
        await pg.add_style_tag(content='.top{position:static!important}')
        await pg.screenshot(path=f'{OUT}/{s}_{n}.png',full_page=True)
        ow=await pg.evaluate('document.documentElement.scrollWidth>innerWidth')
        if ow or errs: print(s,n,'overflow',ow,errs)
        await pg.close()
    await b.close()
asyncio.run(m())
