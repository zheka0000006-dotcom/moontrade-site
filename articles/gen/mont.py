import sys,glob
from PIL import Image
d='/tmp/claude-0/-home-claude/ab920f01-8669-59ed-860b-5983b302dada/scratchpad/art'
s=sys.argv[1]; figs=sys.argv[2:]
for f in figs:
    a=Image.open(f'{d}/{s}_f{f}_d.png'); b=Image.open(f'{d}/{s}_f{f}_m.png')
    im=Image.new('RGB',(a.width+b.width+20,max(a.height,b.height)),'white')
    im.paste(a,(0,0)); im.paste(b,(a.width+20,0)); im.save(f'{d}/{s}_f{f}_both.png')
