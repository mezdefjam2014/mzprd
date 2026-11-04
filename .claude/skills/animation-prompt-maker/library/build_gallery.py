"""Build a gallery page of every saved move: python3 build_gallery.py out.html"""
import sys, json, numpy as np, mocap
GFPS, MAXS = 15, 6.0
saved = mocap._saved(); moves = []
VAR = json.loads(mocap.VARS_INDEX.read_text()) if mocap.VARS_INDEX.exists() else {}
BLOCKED = set(json.loads((mocap.HERE / "rejected.json").read_text())) if (mocap.HERE / "rejected.json").exists() else set()
VAR = {n: x for n, x in VAR.items() if n not in BLOCKED}
items = [(n, d, None) for n, d in saved.items()] + [(n, v["how"], v["cat"]) for n, v in VAR.items() if v["status"] == "active" and n not in saved]
for name, desc, vcat in items:
    m, doc = mocap.load_move(name); n = mocap.nframes(m)
    segs = [] if vcat else mocap.segments(m)
    s0 = segs[0][0] if segs else 0
    s0 = max(0, s0 - 10); s1 = min(n, s0 + int(MAXS * 30))
    if s1 - s0 < 30: s0, s1 = 0, min(n, int(MAXS * 30))
    if not vcat:
        m = mocap.trim(m, s0 / 30, (s1 - 1) / 30)
        m = mocap.resample(m, max(2, int(round(mocap.nframes(m) * GFPS / 30))))
    arr = np.stack([m[k] for k in mocap.PTS], 1)
    arr0x, arr0z = float(arr[0, 0, 0]), float(arr[0, 0, 2])
    arr[:, :, 0] -= arr0x; arr[:, :, 2] -= arr0z
    if vcat: s0 = 0; m0 = m
    g = None
    if vcat:
        import gzip as _gz
        g = json.load(_gz.open(mocap.VARS / f"{name}.json.gz", "rt")).get("g")
        if g:
            hip0 = arr[0, 0].copy()   # same shift as the frames
    moves.append(dict(g=[[[round(sg[0] - arr0x, 1), sg[1], round(sg[2] - arr0z, 1), round(sg[3] - arr0x, 1), sg[4], round(sg[5] - arr0z, 1), sg[6], sg[7]] for sg in fr] for fr in g] if g else None, n=name, d=desc, c=vcat or ("approved loops" if desc.startswith("approved loop") else name.rsplit("_", 1)[0]), v=bool(vcat), src=doc.get("source", ""), t=round(n / 30, 1),
                      start=round(s0 / 30, 1), fps=30 if vcat else GFPS, f=np.round(arr).astype(int).tolist()))
html = open(mocap.HERE / "gallery_template.html").read().replace("__DATA__", json.dumps(dict(pts=mocap.PTS, fps=GFPS, moves=moves), separators=(",", ":")))
html = html.replace("__COUNT__", str(sum(not x["v"] for x in moves))).replace("__VCOUNT__", str(sum(x["v"] for x in moves)))
open(sys.argv[1], "w").write(html); print("wrote", sys.argv[1], len(html) // 1024, "KB,", len(moves), "moves")
