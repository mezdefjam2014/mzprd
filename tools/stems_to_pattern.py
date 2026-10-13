"""Turns one beat split into drum stems (Kick / Snare / Hat wavs of the same length) into:
   mpc/drums.ogg + drums.json  (one-shots cut from the stems, so the sounds are the user's own)
   mpc/patterns.json           (the beat as 4 bars of 16 steps per drum, with the tempo)
Usage: python tools/stems_to_pattern.py "<stem folder>" [bpm|auto] ["Beat name"]
   Each run ADDS (or replaces, by name) one pattern in mpc/patterns.json AND writes that beat's own one-shots to mpc/stems/<name>.ogg/.json, so every beat sounds like its own stems.   (stems found by name: kick, snare, hat/hatz)"""
import sys, os, glob, json, subprocess, numpy as np
SR = 44100
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(root, 'mpc')
FF = (glob.glob(os.path.expanduser('~/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe')) or ['ffmpeg'])[0]
src = sys.argv[1]
def load(p):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32).copy()
def onsets(x, gap, rel=.22):
    w = int(.008 * SR); env = np.sqrt(np.convolve(x * x, np.ones(w) / w, 'same')); hop = int(.002 * SR); e = env[::hop]
    lag = int(.014 / .002); d = np.maximum(0, e[lag:] - e[:-lag]); d = np.concatenate([np.zeros(lag), d])
    if d.max() <= 0: return [], env
    thr = d.max() * rel; out = []; last = -99
    for i in range(1, len(d) - 1):
        if d[i] >= thr and d[i] >= d[i - 1] and d[i] > d[i + 1] and (i - last) * .002 >= gap:
            # walk back to where the rise began
            j = i
            while j > 0 and d[j - 1] > d[i] * .25: j -= 1
            out.append(j * hop); last = i
    return out, env
def kind_of(n):
    n = n.lower()
    if 'kick' in n: return 'kick'
    if 'snare' in n or 'sanre' in n or n.startswith('good snare'): return 'snare'
    if any(w in n for w in ('crash', 'cym', 'cybal', 'crsh', 'chime', 'shaker', 'shake', 'perc', 'tom', 'cong', 'chant', 'fx', 'hook', '808', 'low hit', 'shh', 'bell')): return None
    if n.strip(' .wav') in ('clap', 'claps', 'clap praise'): return 'clap'
    if any(w in n for w in ('hat', 'chh', 'hi', 'chi')): return 'hat'
    return None
stems = {}
for p in glob.glob(os.path.join(src, '*.wav')):
    k = kind_of(os.path.basename(p))
    if k: stems.setdefault(k, []).append((os.path.basename(p).lower(), load(p)))
if 'snare' not in stems and 'clap' in stems: stems['snare'] = stems.pop('clap')   # a clap-only backbeat plays as the snare layer
stems.pop('clap', None)
if not stems: print('no kick/snare/hat stems found'); sys.exit(2)
hits = {}
for k, lst in stems.items():
    hits[k] = []
    for n, x in lst:
        on, env = onsets(x, .12 if k != 'hat' else .05, .22 if k != 'hat' else .07)
        hits[k] += [(i, float(np.abs(x[i:i + int(.06 * SR)]).max()), k, n, x) for i in on]
        print(n, len(on), 'hits')
# tempo + grid from the hats (or all hits): the step length that best fits every onset
allt = np.array([h[0] / SR for k in hits for h in hits[k]])
best = None
import re as _r0
hint = float(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] not in ('auto',) else None
if hint is None:
    m = _r0.search(r'(\d+(?:\.\d+)?)\s*(?:kkj\s*)?(?:\.\.)?\s*(?:bpm|m bpm|_?bpm)', os.path.basename(os.path.normpath(src)), _r0.I) or _r0.search(r'(\d+(?:\.\d+)?)', os.path.basename(os.path.normpath(src)).split('_', 1)[-1])
    if m and 60 <= float(m.group(1)) <= 200: hint = float(m.group(1))
    elif m and 120 < float(m.group(1)) <= 200: hint = float(m.group(1)) / 2
for bpm in (np.arange(hint * .94, hint * 1.06, .25) if hint else np.arange(60, 200, .5)):
    st = 60 / bpm / 4
    for off in np.arange(0, st, .002):
        q = (allt - off) / st; err = np.abs(q - np.round(q)).mean()
        if best is None or err < best[0] - 1e-6: best = (err, bpm, off)
err, bpm, off = best; st = 60 / bpm / 4
n = max(len(x) for lst in stems.values() for _, x in lst); n = min(n, int(SR * 60 / bpm * 16 * 1.02)) if False else n; steps = int(round((n / SR - off) / st))
bars = min(4, max(1, steps // 16)); print('bpm', bpm, 'grid offset', round(off, 4), 'fit err', round(err, 3), 'bars', bars)
NAME = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(os.path.normpath(src))
import re as _re; SLUG = _re.sub(r'[^a-z0-9]+', '-', NAME.lower()).strip('-')
os.makedirs(os.path.join(OUT, 'stems'), exist_ok=True)
pat = {'name': NAME, 'pack': 'stems/' + SLUG, 'bpm': float(bpm), 'bars': bars, 'lanes': {}}
stp = {k: [int(round((h[0] / SR - off) / st)) for h in hits[k]] for k in hits}
def sc(sh):   # where is the bar line? snare on 2 and 4 (steps 4 and 12), kick on 1 (step 0)
    return sum(2 for x in stp.get('snare', []) if (x + sh) % 16 in (4, 12)) + sum(1 for x in stp.get('kick', []) if (x + sh) % 16 == 0) - sum(2 for x in stp.get('snare', []) if (x + sh) % 16 in (0, 8))
SH = max(range(16), key=lambda z: (sc(z), -z)); print('bar line shift', SH)
for k in hits:
    grid = [['.'] * 16 for _ in range(bars)]; pk = max([h[1] for h in hits[k]] or [1])
    for i, a, *_ in hits[k]:
        s = int(round((i / SR - off) / st)) + SH; b, c = divmod(s, 16)
        b %= bars
        if True:
            v = a / pk; grid[b][c] = 'X' if v >= .85 else 'x' if v >= .5 else 'g'
    pat['lanes'][k] = [''.join(g) for g in grid]
    print(k); [print('  ', g) for g in pat['lanes'][k]]
# one-shots: the loudest clean hit of each stem
def shot(h, cap):
    i, a, k, n, x = h
    nxt = [j for j, *_ in hits[k] if j > i + int(.03 * SR) and h[3] == n]
    end = min(len(x), i + int(cap * SR), (min(nxt) if nxt else len(x)))
    y = x[max(0, i - int(.002 * SR)):end].copy(); f = int(min(.03, len(y) / SR * .3) * SR); y[-f:] *= np.linspace(1, 0, f)
    return y / (np.abs(y).max() + 1e-9) * .9
CAP = {'kick': .9, 'snare': .5, 'hat': .14}
meta = {'kick': [], 'b808': [], 'snare': [], 'clap': [], 'hat': [], 'open': [], 'stem': 1}; chunks = []; pos = 0; gap = np.zeros(int(.04 * SR), np.float32)
for k in ('kick', 'snare', 'hat'):
    pool = sorted(hits.get(k, []), key=lambda h: -h[1])[:3 if k != 'snare' else 4]
    seen = set()
    for h in pool:
        y = shot(h, CAP[k]); key = (h[3], round(h[0] / SR, 1))
        if key in seen: continue
        seen.add(key)
        meta[k].append({'n': os.path.splitext(h[3])[0], 'o': round(pos / SR, 4), 'd': round(len(y) / SR, 4), 'c': 1000, 'l': .5, 'r': .1, 'f': 0})
        chunks += [y.astype(np.float32), gap]; pos += len(y) + len(gap)
PF = os.path.join(OUT, 'patterns.json'); lst = json.load(open(PF)) if os.path.exists(PF) else []; lst = [q for q in lst if q['name'] != pat['name']] + [pat]; json.dump(lst, open(PF, 'w'), separators=(',', ':'))
sprite = np.concatenate(chunks); raw = os.path.join(OUT, '_d.raw'); (sprite * 32767).astype('<i2').tofile(raw)
subprocess.run([FF, '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw, '-c:a', 'libvorbis', '-q:a', '3', os.path.join(OUT, 'stems', SLUG + '.ogg')], check=True, capture_output=True); os.remove(raw)
json.dump(meta, open(os.path.join(OUT, 'stems', SLUG + '.json'), 'w'), separators=(',', ':'))
print({k: len(v) for k, v in meta.items() if k != 'stem'}, 'KB', os.path.getsize(os.path.join(OUT, 'stems', SLUG + '.ogg')) // 1024)
