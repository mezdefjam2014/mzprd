"""Builds sfx/fight.mp3 (+ fight.json) for Beat Battle: 35 synthesized 8-bit (NES-style) fight sounds in one small sprite.
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

# ---------------- 8-bit chiptune voices ----------------
CR = 16000  # crush rate (sample & hold)
def crush(x, bits=4):
    hold = max(1, SR // CR); x = np.repeat(x[::hold], hold)[:len(x)]
    q = 2 ** bits; return np.round(x * q / 2) / (q / 2)
def pulse(n, f0, f1=None, duty=.5, curve=0, vib=0):
    f1 = f0 if f1 is None else f1; u = np.arange(n) / n
    f = f1 + (f0 - f1) * np.exp(-curve * u) if curve else f0 + (f1 - f0) * u
    f = f * (1 + vib * np.sin(2 * np.pi * 14 * u * n / SR))
    ph = np.cumsum(f) / SR; return np.where((ph % 1) < duty, 1.0, -1.0)
def tri(n, f0, f1=None):
    f1 = f0 if f1 is None else f1; f = np.linspace(f0, f1, n); ph = np.cumsum(f) / SR
    return 4 * np.abs((ph % 1) - .5) - 1
def nz8(n, rate):  # chip noise: random value held at `rate` Hz
    k = max(1, int(SR / rate)); m = n // k + 2
    return np.repeat(rng.choice([-1.0, 1.0], m), k)[:n]
def step_env(n, dur, steps=8):  # stepped decay like an NES envelope
    u = np.minimum(1, np.arange(n) / (dur * SR)); return np.floor((1 - u) * steps) / steps
def fin(x, bits=4): return norm(crush(x, bits), .9)
def seq(notes, d, duty=.5, vib=0):
    return np.concatenate([pulse(int(d * SR), f, f, duty, 0, vib) * step_env(int(d * SR), d, 6) for f in notes])

def punch(v):
    n = int(.14 * SR); return fin(pulse(n, 260 + v * 30, 60, .5, 6) * step_env(n, .14) * .8 + nz8(n, 7000) * step_env(n, .06) * .7)
def body_blow(v):
    n = int(.2 * SR); return fin(pulse(n, 120 + v * 15, 40, .5, 5) * step_env(n, .2) + nz8(n, 2200) * step_env(n, .09) * .6)
def slap(v):
    n = int(.09 * SR); return fin(nz8(n, 11000) * step_env(n, .06) + pulse(n, 1900 + v * 300, 600, .25, 6) * step_env(n, .08) * .6)
def kick(v):
    n = int(.24 * SR); return fin(pulse(n, 190, 48, .5, 4.5) * step_env(n, .24, 10) + nz8(n, 4500) * step_env(n, .05) * .7)
def crit(v):
    n = int(.55 * SR); boom = nz8(n, 3000 - v * 500) * step_env(n, .5, 12); low = pulse(n, 100, 28, .5, 3) * step_env(n, .5, 12)
    ding = np.zeros(n); d = int(.12 * SR); ding[:d] = pulse(d, 1568, 1568, .125) * step_env(d, .12, 4) * .5
    return fin(boom * .8 + low + ding, 5)
def clang(v):
    n = int(.22 * SR); return fin(pulse(n, 1760 + v * 90, 1760 + v * 90, .125) * step_env(n, .2, 8) * .7 + pulse(n, 2349, 2349, .25) * step_env(n, .12, 6) * .5 + nz8(n, 9000) * step_env(n, .02) * .6)
def swing(v):
    n = int(.16 * SR); x = np.zeros(n); k = 5
    for i in range(k):
        a, b = i * n // k, (i + 1) * n // k; x[a:b] = nz8(b - a, 2500 + i * 1800)
    return fin(x * np.sin(np.linspace(0, np.pi, n)) * .8)

def pain(kind, v):
    if kind == 'oof': return fin(np.concatenate([pulse(int(.06 * SR), 300 - v * 20, 300 - v * 20, .5), pulse(int(.07 * SR), 190, 190, .25), pulse(int(.1 * SR), 120, 90, .5)]) * .9)
    if kind == 'ugh': n = int(.26 * SR); return fin(pulse(n, 150 + v * 10, 70, .25, 2, .03) * step_env(n, .26, 8) + nz8(n, 900) * .15 * step_env(n, .26))
    if kind == 'agh': n = int(.3 * SR); return fin(pulse(n, 700 + v * 60, 180, .125, 2.5, .04) * step_env(n, .3, 8))
    if kind == 'hnn': return fin(np.concatenate([pulse(int(.07 * SR), 210, 210, .5, 0, .05), pulse(int(.14 * SR), 170 + v * 10, 140, .5, 0, .06)]))
    return fin(pulse(int(.3 * SR), 560 + v * 40, 250, .25, 2, .05) * step_env(int(.3 * SR), .3, 8))   # ow
def effort(kind, v):
    if kind == 'hah': return fin(np.concatenate([nz8(int(.03 * SR), 6000) * .5, seq([400 + v * 40, 620 + v * 40], .05, .25)]))
    if kind == 'hup': return fin(np.concatenate([nz8(int(.02 * SR), 5000) * .4, seq([300, 420 + v * 30], .05, .5)]))
    if kind == 'hyah': n = int(.22 * SR); return fin(pulse(n, 300, 1300 + v * 150, .25, 0, .03) * step_env(n, .22, 6) + nz8(n, 5500) * .2 * step_env(n, .08))
    if kind == 'ha': return fin(np.concatenate([nz8(int(.025 * SR), 7000) * .5, seq([520 + v * 40], .06, .125)]))
    return fin(seq([392, 523, 659, 784 + v * 80], .06, .25))   # yeah (power-up arpeggio)

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
subprocess.run([ff, '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw, '-b:a', '64k', os.path.join(out, 'fight.mp3')], check=True, capture_output=True)
os.remove(raw)
json.dump(mp, open(os.path.join(out, 'fight.json'), 'w'))
print(len(mp), 'clips', round(len(sprite) / SR, 1), 's', os.path.getsize(os.path.join(out, 'fight.mp3')) // 1024, 'KB')
