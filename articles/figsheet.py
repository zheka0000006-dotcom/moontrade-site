import asyncio,glob,os
from playwright.async_api import async_playwright
from PIL import Image
OUT='/tmp/claude-0/-home-claude/ab920f01-8669-59ed-860b-5983b302dada/scratchpad/figs'; os.makedirs(OUT,exist_ok=True)
async def m():
  files=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':900})
    for d in sorted(glob.glob('/home/claude/moontrade-site/statti/*/')):
      s=d.rstrip('/').split('/')[-1]
      await pg.goto('file://'+d+'index.html'); await pg.wait_for_timeout(150)
      n=await pg.locator('.fig').count()
      for i in range(n):
        f=f'{OUT}/{s}_{i}.png'; await pg.locator('.fig svg').nth(i).screenshot(path=f); files.append((s,i,f))
    await b.close()
  # sheets of 6 (2x3)
  for k in range(0,len(files),6):
    ims=[Image.open(f).convert('RGB').resize((600,int(600*Image.open(f).size[1]/Image.open(f).size[0]))) for _,_,f in files[k:k+6]]
    h=max(i.size[1] for i in ims)
    sheet=Image.new('RGB',(1200,(h+24)*3),(30,30,30))
    from PIL import ImageDraw
    d=ImageDraw.Draw(sheet)
    for j,(im,(s,i,_)) in enumerate(zip(ims,files[k:k+6])):
      x=(j%2)*600; y=(j//2)*(h+24); sheet.paste(im,(x,y+24)); d.text((x+6,y+5),f'{s} #{i}',fill=(255,255,0))
    sheet.save(f'{OUT}/sheet_{k//6:02d}.png')
  print(len(files),'figs')
asyncio.run(m())
