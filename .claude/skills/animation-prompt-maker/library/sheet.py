import sys,json,gzip,numpy as np,mocap,contact
from PIL import Image, ImageDraw
def sheet(names,out,cols=9,cell=95,yaw=25):
    im=Image.new("RGB",(cols*cell+175,len(names)*cell),"white"); d=ImageDraw.Draw(im)
    for r,n in enumerate(names):
        p=mocap.VARS/f"{n}.json.gz"
        doc=json.load(gzip.open(p,"rt")); fr=np.array(doc["frames"],float); g=doc.get("g"); N=len(fr)
        idx=list(np.linspace(0,N-1,cols-1).astype(int))+[0]; y0=r*cell; d.text((4,y0+4),n,fill="black"); d.text((4,y0+18),f"{N/30:.1f}s",fill=(120,120,120))
        for ci,i in enumerate(idx):
            x0=175+ci*cell; f={k:fr[i][j] for j,k in enumerate(doc["joints"])}; c=(f["hip"][0],f["hip"][2]); s=cell/215
            tr=lambda p:(x0+cell/2+contact.proj(p,c,yaw)[0]*s, y0+cell*.55+(contact.proj(p,c,yaw)[1]-6)*s)
            d.line([tr((c[0]-50,89,c[1])),tr((c[0]+50,89,c[1]))],fill=(210,210,210))
            for a,bb in contact.SEG: d.line([tr(f[a]),tr(f[bb])],fill=(220,90,30) if (a in contact.RIGHT or bb in contact.RIGHT) else (40,40,60),width=2)
            hx,hy=tr(f["hd"]); d.ellipse([hx-5,hy-5,hx+5,hy+5],outline="black")
            for sg in (g[i] if g else []): d.line([tr(sg[0:3]),tr(sg[3:6])],fill=[(30,120,200),(230,170,0),(140,90,40)][sg[6]],width=3)
            if ci==cols-1: d.text((x0+3,y0+cell-12),"seam",fill=(120,120,120))
    im.save(out)
if __name__=="__main__": sheet(sys.argv[2:],sys.argv[1])
