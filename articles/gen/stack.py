import sys,glob
from PIL import Image
s=sys.argv[1]; fs=sorted(glob.glob(f'art/{s}_fig*_m.png'))
ims=[Image.open(f) for f in fs]
o=Image.new('RGB',(max(i.width for i in ims),sum(i.height for i in ims)));y=0
for i in ims:o.paste(i,(0,y));y+=i.height
o.save(f'art/{s}_stack_m.png');print(len(fs))
