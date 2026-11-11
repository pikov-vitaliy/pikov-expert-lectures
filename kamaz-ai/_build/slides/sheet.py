import sys,glob
from PIL import Image,ImageDraw
pat,out,per=sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 12
fs=sorted(glob.glob(pat))
for k in range(0,len(fs),per):
    ims=[Image.open(f) for f in fs[k:k+per]]
    w,h=ims[0].size; cols=3; rows=(len(ims)+cols-1)//cols
    S=Image.new('RGB',(cols*(w+10)+10,rows*(h+10)+10),'#888')
    for i,im in enumerate(ims):
        S.paste(im,(10+(i%cols)*(w+10),10+(i//cols)*(h+10)))
        ImageDraw.Draw(S).text((14+(i%cols)*(w+10),12+(i//cols)*(h+10)),str(k+i+1),fill='red')
    S.save(f'{out}-{k//per+1}.png'); print(f'{out}-{k//per+1}.png')
