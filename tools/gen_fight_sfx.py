"""Builds sfx/fight.mp3 (+ fight.json) for Beat Battle: ~35 synthesized fight sounds in one small sprite.
Run: python tools/gen_fight_sfx.py   (needs numpy + ffmpeg on PATH or the winget ffmpeg)"""
import numpy as np, json, subprocess, os, glob, sys
SR = 32000
rng = np.random.default_rng(7)

def t(d): return np.arange(int(d * SR)) / SR
def env(n, a=.003, d=.1, curve=3):
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / max(d, 1e-4) * curve / 3)
    return e
def biquad(x, kind, f, q=1.0):
    w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
    if kind == 'lp': b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    elif kind == 'hp': b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    else: b0, b1, b2 = al, 0, -al  # bandpass (constant 0 dB peak gain)
    a0, a1, a2 = 1 + al, -2 * c, 1 - al
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, o; y[i] = o
    return y
def noise(n): return rng.standard_normal(n)
def sweep(n, f0, f1, curve=4):
    x = np.arange(n) / n
    f = f1 + (f0 - f1) * np.exp(-curve * x)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def norm(x, peak=.9):
    m = np.max(np.abs(x)) or 1; return x / m * peak

# ---------------- hits ----------------
def punch(v):
    n = int(.22 * SR); e = env(n, .001, .05)
    body = sweep(n, 170 + v * 25, 55, 6) * env(n, .001, .09)
    crack = biquad(noise(n), 'bp', 1400 + v * 400, 1.2) * env(n, .0005, .035)
    return norm(body * 1.0 + crack * .9 + biquad(noise(n), 'lp', 600) * e * .5)
def body_blow(v):
    n = int(.3 * SR)
    th = sweep(n, 110 + v * 15, 38, 5) * env(n, .001, .14)
    return norm(th + biquad(noise(n), 'lp', 380 + v * 60) * env(n, .001, .07) * .9)
def slap(v):
    n = int(.14 * SR)
    return norm(biquad(noise(n), 'hp', 2200 + v * 300) * env(n, .0003, .03) * 1.0 + sweep(n, 600, 180, 8) * env(n, .0005, .03) * .5)
def kick(v):
    n = int(.34 * SR)
    th = sweep(n, 150, 42, 4.5) * env(n, .001, .16)
    return norm(th + biquad(noise(n), 'bp', 900, .8) * env(n, .0005, .05) * .7)
def crit(v):
    n = int(.9 * SR)
    sub = sweep(n, 95, 30, 3) * env(n, .001, .38)
    crackn = biquad(noise(n), 'bp', 2200, .9) * env(n, .0004, .06)
    slam = biquad(noise(n), 'lp', 900) * env(n, .001, .22)
    tail = np.zeros(n)
    for dly, g in [(.05, .5), (.11, .35), (.19, .22), (.3, .12)]:
        k = int(dly * SR); tail[k:] += biquad(noise(n), 'lp', 1500)[:n - k] * env(n, .001, .1)[:n - k] * g * .3
    return norm(sub * 1.1 + crackn * .8 + slam * .8 + tail)
def clang(v):
    n = int(.6 * SR); x = np.zeros(n); tt = t(.6)
    for f, g in [(820, 1), (1370, .7), (2210, .55), (3350, .35), (4880, .2)]:
        x += np.sin(2 * np.pi * f * (1 + v * .02) * tt) * np.exp(-tt * (9 + f / 700)) * g
    x += biquad(noise(n), 'hp', 3000) * env(n, .0003, .02) * .8
    return norm(x)
def swing(v):
    n = int(.28 * SR); x = noise(n)
    y = np.zeros(n); cf = np.linspace(500, 3200, n)
    # moving band approximated by crossfading three bands
    for f, w in [(600, np.linspace(1, 0, n)), (1500, np.sin(np.linspace(0, np.pi, n))), (3000, np.linspace(0, 1, n))]:
        y += biquad(x, 'bp', f, .9) * w
    return norm(y * np.sin(np.linspace(0, np.pi, n)) ** 1.5, .6)

# ---------------- voice (formant synth, male) ----------------
FORM = {  # F1, F2, F3
    'o': (450, 950, 2500), 'u': (400, 870, 2400), 'a': (760, 1200, 2600), 'e': (560, 1750, 2500),
    'ae': (700, 1700, 2500), 'uh': (640, 1190, 2400), 'i': (330, 2100, 2800)}
def voice(dur, f0a, f0b, forms, breath=.12, rasp=2.0, vib=0, attack=.012, rel=.08):
    n = int(dur * SR); tt = np.arange(n) / SR
    f0 = f0a + (f0b - f0a) * (tt / dur) ** .8
    f0 = f0 * (1 + .012 * noise(n).cumsum() / np.sqrt(np.arange(1, n + 1)) * .02 + vib * np.sin(2 * np.pi * 6 * tt))
    ph = np.cumsum(f0) / SR
    src = 2 * (ph % 1) - 1
    src = src - np.concatenate([[0], src[:-1]]) * .9  # glottal-ish tilt
    src += breath * noise(n)
    # morph between formant sets across the sound
    A = np.array(forms[0], float); Bf = np.array(forms[-1], float)
    out = np.zeros(n); seg = 6
    for s in range(seg):
        a, b = s * n // seg, (s + 1) * n // seg
        k = (s + .5) / seg; F = A + (Bf - A) * k
        part = np.zeros(b - a)
        for fi, (fr, q, g) in enumerate(zip(F, (7, 9, 10), (1, .75, .35))):
            part += biquad(src[a:b], 'bp', fr, q) * g
        out[a:b] = part
    e = np.minimum(1, tt / attack) * np.minimum(1, np.maximum(0, (dur - tt) / rel)) * np.exp(-tt / (dur * 1.4))
    out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * rasp) * e
    return norm(out, .85)
def pain(kind, v):
    f = 105 + v * 12
    if kind == 'oof': return voice(.28, f * 1.1, f * .8, [FORM['o'], FORM['uh']], breath=.2, rasp=2.6)
    if kind == 'ugh': return voice(.32, f * 1.2, f * .78, [FORM['uh'], FORM['uh']], breath=.16, rasp=3.2)
    if kind == 'agh': return voice(.36, f * 1.5, f * .85, [FORM['ae'], FORM['a']], breath=.12, rasp=3.5)
    if kind == 'hnn': return voice(.3, f * 1.05, f * .92, [FORM['u'], FORM['o']], breath=.25, rasp=2.2)
    if kind == 'ow': return voice(.4, f * 1.7, f * .95, [FORM['a'], FORM['o']], breath=.1, rasp=2.8)
    return voice(.3, f, f * .85, [FORM['uh'], FORM['o']])
def effort(kind, v):
    f = 125 + v * 15
    if kind == 'hah': return voice(.2, f * 1.15, f * .9, [FORM['a'], FORM['a']], breath=.3, rasp=2.4, attack=.006, rel=.06)
    if kind == 'hup': return voice(.16, f * 1.2, f * 1.0, [FORM['uh'], FORM['uh']], breath=.28, rasp=2.2, attack=.004, rel=.05)
    if kind == 'hyah': return voice(.34, f * 1.05, f * 1.6, [FORM['i'], FORM['a']], breath=.25, rasp=3.2, attack=.01)
    if kind == 'ha': return voice(.17, f * 1.3, f * 1.0, [FORM['ae'], FORM['a']], breath=.26, rasp=2.6, attack=.004, rel=.05)
    if kind == 'yeah': return voice(.42, f * 1.1, f * 1.45, [FORM['i'], FORM['e']], breath=.15, rasp=2.4)
    return voice(.2, f, f)

clips = {}
def add(name, x): clips[name] = x.astype(np.float32)
for i in range(3): add(f'punch{i}', punch(i))
for i in range(2): add(f'body{i}', body_blow(i))
for i in range(2): add(f'slap{i}', slap(i))
for i in range(2): add(f'kick{i}', kick(i))
for i in range(2): add(f'crit{i}', crit(i))
for i in range(2): add(f'clang{i}', clang(i))
for i in range(2): add(f'swing{i}', swing(i))
for k in ['oof', 'ugh', 'agh', 'hnn', 'ow']:
    for i in range(2): add(f'pain_{k}{i}', pain(k, i))
for k in ['hah', 'hup', 'hyah', 'ha', 'yeah']:
    for i in range(2): add(f'eff_{k}{i}', effort(k, i))

gap = np.zeros(int(.04 * SR), np.float32); pos = 0; mp = {}; chunks = []
for name, x in clips.items():
    x = x * np.minimum(1, np.arange(len(x))[::-1] / (.004 * SR)).astype(np.float32)  # no end click
    mp[name] = [round(pos / SR, 3), round(len(x) / SR, 3)]
    chunks += [x, gap]; pos += len(x) + len(gap)
sprite = np.concatenate(chunks)
sprite = sprite / np.max(np.abs(sprite)) * .92
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'sfx'); os.makedirs(out, exist_ok=True)
raw = os.path.join(out, '_fight.raw')
(sprite * 32767).astype('<i2').tofile(raw)
ff = 'ffmpeg'
cand = glob.glob(os.path.expanduser('~/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe'))
if cand: ff = cand[0]
subprocess.run([ff, '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw, '-b:a', '56k', os.path.join(out, 'fight.mp3')], check=True, capture_output=True)
os.remove(raw)
json.dump(mp, open(os.path.join(out, 'fight.json'), 'w'))
print(len(mp), 'clips', round(len(sprite) / SR, 1), 's', os.path.getsize(os.path.join(out, 'fight.mp3')) // 1024, 'KB')
