"""Build a gallery page of every saved move: python3 build_gallery.py out.html"""
import sys, json, numpy as np, mocap
GFPS, MAXS = 15, 6.0
saved = mocap._saved(); moves = []
VAR = json.loads(mocap.VARS_INDEX.read_text()) if mocap.VARS_INDEX.exists() else {}
items = [(n, d, None) for n, d in saved.items()] + [(n, v["how"], v["cat"]) for n, v in VAR.items() if v["status"] == "active"]
for name, desc, vcat in items:
    m, doc = mocap.load_move(name); n = mocap.nframes(m)
    segs = [] if vcat else mocap.segments(m)
    s0 = segs[0][0] if segs else 0
    s0 = max(0, s0 - 10); s1 = min(n, s0 + int(MAXS * 30))
    if s1 - s0 < 30: s0, s1 = 0, min(n, int(MAXS * 30))
    m = mocap.trim(m, s0 / 30, (s1 - 1) / 30)
    m = mocap.resample(m, max(2, int(round(mocap.nframes(m) * GFPS / 30))))
    arr = np.stack([m[k] for k in mocap.PTS], 1)
    arr[:, :, 0] -= arr[0, 0, 0]; arr[:, :, 2] -= arr[0, 0, 2]
    if vcat: s0 = 0; m0 = m
    moves.append(dict(n=name, d=desc, c=vcat or name.rsplit("_", 1)[0], v=bool(vcat), src=doc.get("source", ""), t=round(n / 30, 1),
                      start=round(s0 / 30, 1), f=np.round(arr).astype(int).tolist()))
html = open(mocap.HERE / "gallery_template.html").read().replace("__DATA__", json.dumps(dict(pts=mocap.PTS, fps=GFPS, moves=moves), separators=(",", ":")))
html = html.replace("__COUNT__", str(sum(not x["v"] for x in moves))).replace("__VCOUNT__", str(sum(x["v"] for x in moves)))
open(sys.argv[1], "w").write(html); print("wrote", sys.argv[1], len(html) // 1024, "KB,", len(moves), "moves")
