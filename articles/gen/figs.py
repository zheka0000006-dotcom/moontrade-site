import asyncio,sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ab920f01-8669-59ed-860b-5983b302dada/scratchpad/agent_tf_lvl/art'
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for s in sys.argv[1:]:
      for w,n in [(1280,'d'),(390,'m')]:
        pg=await b.new_page(viewport={'width':w,'height':900})
        await pg.goto(f'file:///home/claude/moontrade-site/statti/{s}/index.html'); await pg.wait_for_timeout(300)
        ow=await pg.evaluate('document.documentElement.scrollWidth>innerWidth')
        figs=await pg.query_selector_all('figure.fig')
        for i,f in enumerate(figs):
          await f.screenshot(path=f'{OUT}/{s}_fig{i+1}_{n}.png')
        print(s,n,len(figs),'overflow' if ow else 'ok')
        await pg.close()
    await b.close()
asyncio.run(m())
