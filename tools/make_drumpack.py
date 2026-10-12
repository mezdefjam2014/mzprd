"""Builds mpc/drums.ogg + mpc/drums.json from the user's own drum pack (folders: Kicks, Unique Snares, Unique Claps, Hi Hats).
Every hit is decoded, trimmed (silence at both ends), faded, loudness matched, analysed (length, brightness, low-end, decay, pitch of long low kicks)
and packed into ONE small mono Ogg Vorbis sprite. Hits are grouped: kick, b808 (long low kicks, pitched later), snare, clap, hat (closed), open (long hats).
Usage: python tools/make_drumpack.py "<Drum Pack folder>" """
import sys, os, glob, json, subprocess, numpy as np
SR = 44100
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(root, 'mpc')
FF = (glob.glob(os.path.expanduser('~/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe')) or ['ffmpeg'])[0]
src = sys.argv[1]
def load(p):
    r = subprocess.run([FF, '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32).copy()
def trim(x, tail_db=-55):
    pk = np.max(np.abs(x)) + 1e-9; thr = pk * 10 ** (-48 / 20)
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return x[:10]
    a = max(0, idx[0] - int(.0015 * SR))
    env = np.abs(x); k = int(.01 * SR)
    sm = np.convolve(env, np.ones(k) / k, 'same'); thr2 = pk * 10 ** (tail_db / 20)
    end = np.where(sm > thr2)[0]; b = end[-1] if len(end) else len(x)
    return x[a:b + int(.01 * SR)]
def feats(x):
    n = len(x); seg = x[:int(.12 * SR)]
    if len(seg) < 64: seg = np.pad(seg, (0, 64 - len(seg)))
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fr = np.fft.rfftfreq(len(seg), 1 / SR)
    cen = float((sp * fr).sum() / (sp.sum() + 1e-9)); lr = float((sp[fr < 150] ** 2).sum() / ((sp ** 2).sum() + 1e-9))
    env = np.abs(x); k = int(.004 * SR); sm = np.convolve(env, np.ones(k) / k, 'same'); pk = sm.max() + 1e-9
    d30 = np.where(sm > pk * .03)[0]; dec = float(d30[-1] / SR) if len(d30) else n / SR
    # onset count (to find rolls / loops)
    flux = np.maximum(0, np.diff(sm[::int(.005 * SR)])); on = int((flux > flux.max() * .35).sum()) if len(flux) and flux.max() > 0 else 1
    return dict(dur=n / SR, cen=cen, lr=lr, dec=dec, on=on)
def pitch(x):
    """pitch of the sustained part of a long low kick (autocorrelation), or 0"""
    a, b = int(.12 * SR), min(len(x), int(.6 * SR))
    if b - a < 4000: return 0.0
    s = x[a:b] - np.mean(x[a:b]); n = len(s)
    ac = np.correlate(s, s, 'full')[n - 1:]; lo, hi = int(SR / 130), int(SR / 28)
    seg = ac[lo:hi]
    if not len(seg) or ac[0] <= 0: return 0.0
    k = int(np.argmax(seg)) + lo
    return float(SR / k) if seg.max() / ac[0] > .3 else 0.0
groups = {'kick': [], 'b808': [], 'snare': [], 'clap': [], 'hat': [], 'open': []}
folders = {'Kicks': 'kick', 'Unique Snares': 'snare', 'Unique Claps': 'clap', 'Hi Hats': 'hat'}
CAP = {'kick': 1.6, 'b808': 2.2, 'snare': .9, 'clap': .9, 'hat': .5, 'open': .6}
skipped = 0
for fo, kind in folders.items():
    for p in sorted(glob.glob(os.path.join(src, fo, '*.wav'))):
        x = load(p)
        if len(x) < 200: continue
        x = trim(x); f = feats(x); name = os.path.splitext(os.path.basename(p))[0]
        k = kind
        if kind == 'kick' and f['dur'] > .45 and f['lr'] > .9: k = 'b808'   # long low kicks: used as the punch layer of the trap bass
        if kind == 'hat':
            if f['on'] > 2 and f['dur'] > .45: skipped += 1; continue      # a roll or a loop, not a single hit
            if f['dec'] > .085: k = 'open'   # the hats with the longest tails
        if kind in ('snare', 'clap') and f['dur'] > 1.4: skipped += 1; continue
        cap = int(CAP[k] * SR)
        if len(x) > cap: x = x[:cap]
        fade = int(min(.04, len(x) / SR * .3) * SR); x[-fade:] *= np.linspace(1, 0, fade)
        pk = np.max(np.abs(x)) + 1e-9; x = x / pk * .9
        f2 = feats(x); f2['f0'] = pitch(x) if k == 'b808' else 0.0
        groups[k].append((name, x, f2))
# one mono sprite
gap = np.zeros(int(.04 * SR), np.float32); chunks = []; pos = 0; meta = {}
for k, lst in groups.items():
    meta[k] = []
    for name, x, f in lst:
        meta[k].append({'n': name.replace('MZ ', ''), 'o': round(pos / SR, 4), 'd': round(len(x) / SR, 4), 'c': int(f['cen']), 'l': round(f['lr'], 2), 'r': round(f['dec'], 3), 'f': round(f['f0'], 1)})
        chunks += [x.astype(np.float32), gap]; pos += len(x) + len(gap)
sprite = np.concatenate(chunks)
raw = os.path.join(OUT, '_drums.raw'); (sprite * 32767).astype('<i2').tofile(raw)
Q = sys.argv[2] if len(sys.argv) > 2 else '1'
subprocess.run([FF, '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw, '-c:a', 'libvorbis', '-q:a', Q, os.path.join(OUT, 'drums.ogg')], check=True, capture_output=True)
os.remove(raw)
json.dump(meta, open(os.path.join(OUT, 'drums.json'), 'w'), separators=(',', ':'))
print({k: len(v) for k, v in meta.items()}, 'skipped', skipped, 'seconds', round(len(sprite) / SR, 1), 'KB', os.path.getsize(os.path.join(OUT, 'drums.ogg')) // 1024)
print('808 pitches:', [(m['n'], m['f']) for m in meta['b808']][:12])
