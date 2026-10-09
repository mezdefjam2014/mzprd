"""Builds sfx/fight.mp3 + fight.json from the CC0 'SFX: The Ultimate 2017 8 bit Mini pack' (phoenix1291, opengameart.org/node/79699).
Usage: python tools/gen_fight_sfx_pack.py "<path to extracted 'SFX- The Ultimate 2017 8 bit sound Mini pack' folder>" """
import wave, sys, os, json, glob, subprocess, numpy as np
src = sys.argv[1]; SR = 22050
def load(cat, i, cap=None):
    w = wave.open(os.path.join(src, cat, 'Wav', f'{cat}__{i + 1:03d}.wav'))
    x = (np.frombuffer(w.readframes(w.getnframes()), np.uint8).astype(np.float32) - 128) / 128
    n = len(x) if cap is None else min(len(x), int(cap * SR))
    x = x[:n].copy(); f = int(.06 * SR); x[-f:] *= np.linspace(1, 0, f)
    return x / (np.max(np.abs(x)) or 1) * .9
M = {}
for k, i in zip(['punch0', 'punch1', 'punch2'], [0, 2, 4]): M[k] = load('Punch1', i)
for k, i in zip(['body0', 'body1'], [0, 3]): M[k] = load('Punch2', i)
for k, i in zip(['slap0', 'slap1'], [6, 8]): M[k] = load('Punch1', i)
for k, i in zip(['kick0', 'kick1'], [5, 7]): M[k] = load('Punch2', i)
for k, i in zip(['crit0', 'crit1'], [0, 2]): M[k] = load('Explosion1', i, .6)
for k, i in zip(['clang0', 'clang1'], [0, 4]): M[k] = load('Pickup', i)
for k, i in zip(['swing0', 'swing1'], [1, 5]): M[k] = load('Jump', i)
for kind, ids in {'oof': [4, 5], 'ugh': [2, 3], 'agh': [0, 1], 'hnn': [9, 7], 'ow': [6, 8]}.items():
    for j, i in enumerate(ids): M[f'pain_{kind}{j}'] = load('Ouch', i)
for kind, ids in {'hah': [0, 1], 'hup': [3, 9], 'hyah': [2, 4], 'ha': [7, 8]}.items():
    for j, i in enumerate(ids): M[f'eff_{kind}{j}'] = load('Roar1', i, .5)
for j, i in enumerate([4, 5]): M[f'eff_yeah{j}'] = load('Powerup', i)
gap = np.zeros(int(.04 * SR), np.float32); pos = 0; mp = {}; ch = []
for name, x in M.items(): mp[name] = [round(pos / SR, 3), round(len(x) / SR, 3)]; ch += [x, gap]; pos += len(x) + len(gap)
sp = np.concatenate(ch); out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'sfx')
raw = os.path.join(out, '_f.raw'); (sp * 32767).astype('<i2').tofile(raw)
ff = (glob.glob(os.path.expanduser('~/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe')) or ['ffmpeg'])[0]
subprocess.run([ff, '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw, '-b:a', '64k', os.path.join(out, 'fight.mp3')], check=True, capture_output=True)
os.remove(raw); json.dump(mp, open(os.path.join(out, 'fight.json'), 'w'))
open(os.path.join(out, 'CREDITS.txt'), 'w').write("fight.mp3: made from 'SFX: The Ultimate 2017 8 bit Mini pack' by phoenix1291 / SwissArcadeGameEntertainment, CC0 (https://opengameart.org/node/79699).\n")
print(len(mp), 'clips', round(len(sp) / SR, 1), 's', os.path.getsize(os.path.join(out, 'fight.mp3')) // 1024, 'KB')
