"""Render a contact sheet of a motion (side + 3/4 rows) to check it by eye: python3 contact.py out.png name [name...]"""
import sys, math, numpy as np, mocap
from PIL import Image, ImageDraw
SEG = [("hip","mid"),("mid","sh"),("shF","shB"),("sh","nk"),("nk","hd"),("shF","rE"),("rE","rH"),("shB","lE"),("lE","lH"),("hip","hF"),("hip","hB"),("hF","fK"),("fK","fAn"),("fAn","fTo"),("hB","bK"),("bK","bAn"),("bAn","bTo")]
RIGHT = {"shF","rE","rH","hF","fK","fAn","fTo"}
def proj(p, c, yaw):
    dx, dz = p[0]-c[0], p[2]-c[1]; Y = math.radians(yaw)
    return dx*math.cos(Y)-dz*math.sin(Y), p[1]
def sheet(frames_list, labels, out, cols=10, cell=120):
    rows = len(frames_list)*2
    im = Image.new("RGB", (cols*cell+150, rows*cell), "white"); d = ImageDraw.Draw(im)
    for r, (fr, lab) in enumerate(zip(frames_list, labels)):
        N = len(fr); idx = list(np.linspace(0, N-1, cols-2).astype(int)) + [0, 1]   # last two cells: seam (first frames again)
        for v, yaw in enumerate((0, 40)):
            y0 = (r*2+v)*cell; d.text((4, y0+4), (lab if v == 0 else "") + ("  side" if v == 0 else "  3/4"), fill="black")
            for ci, i in enumerate(idx):
                x0 = 150+ci*cell; f = fr[i]; c = (f["hip"][0], f["hip"][2]); s = cell/230
                tr = lambda p: (x0+cell/2+proj(p, c, yaw)[0]*s, y0+cell*.5+(proj(p, c, yaw)[1]-6)*s)
                d.line([tr((c[0]-60, 89, c[1])), tr((c[0]+60, 89, c[1]))], fill=(200,200,200))
                for a, b in SEG:
                    d.line([tr(f[a]), tr(f[b])], fill=(220,90,30) if (a in RIGHT or b in RIGHT) else (40,40,60), width=3)
                hx, hy = tr(f["hd"]); d.ellipse([hx-6, hy-6, hx+6, hy+6], outline="black", width=2)
                d.text((x0+3, y0+cell-12), ("seam>" if ci == cols-2 else "") + str(i), fill=(120,120,120))
    im.save(out)
if __name__ == "__main__":
    out, names = sys.argv[1], sys.argv[2:]
    fl = []
    for n in names:
        m, _ = mocap.load_move(n); fl.append([{k: m[k][i] for k in mocap.PTS} for i in range(mocap.nframes(m))])
    sheet(fl, names, out)
