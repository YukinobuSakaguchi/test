"""Synthesizes soundtrack.wav (15 s, 120 BPM, 48 kHz stereo) synced to reel.html cuts.
Cuts / impacts: 2, 4, 6, 9, 11, 13 s. Montage stabs every 0.25 s from 9 to 11 s.
Requires numpy only.  Usage: python3 synth.py
"""
import numpy as np, wave, os

SR, DUR, BEAT = 48000, 15.0, 0.5
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)


def tt(d):
    return np.arange(int(d * SR)) / SR


def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i + n] += sig[:n] * gain * (1 - max(pan, 0))
    R[i:i + n] += sig[:n] * gain * (1 + min(pan, 0))


def onepole(x, a):
    """Low-pass; a may be scalar or per-sample array (0..1, higher = brighter)."""
    y = np.empty_like(x); s = 0.0
    a = np.broadcast_to(a, x.shape)
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def hp(x, a=0.2):
    return x - onepole(x, a)


# ---------- instruments ----------
def kick(d=0.45):
    t = tt(d); f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 300)


def clap(d=0.3):
    t = tt(d); n = hp(rng.standard_normal(len(t)), 0.35)
    env = np.exp(-t * 16) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0) * (t < .03))
    return n * env * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3


def hat(d=0.06, k=70):
    t = tt(d); return hp(rng.standard_normal(len(t)), 0.6) * np.exp(-t * k)


def saw(f, t):
    ph = np.cumsum(np.broadcast_to(f, t.shape)) / SR
    return 2 * (ph % 1) - 1


def bass(f, d=0.22):
    t = tt(d); x = saw(f, t) + 0.5 * saw(f * 1.005, t)
    return onepole(x, 0.04 + 0.12 * np.exp(-t * 18)) * np.minimum(1, t * 400) * np.exp(-t * 6)


def impact(d=1.8):
    t = tt(d); f = 32 + 60 * np.exp(-t * 10)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4)
    nz = onepole(rng.standard_normal(len(t)), 0.25) * np.exp(-t * 7)
    return boom * 1.0 + nz * 0.9


def riser(d):
    t = tt(d); p = t / d
    nz = onepole(rng.standard_normal(len(t)), 0.02 + 0.5 * p ** 2) * p ** 2.5
    sw = np.sin(2 * np.pi * np.cumsum(200 + 1800 * p ** 3) / SR) * p ** 3 * 0.25
    return nz * 1.2 + sw


def blip(f=1000, d=0.08):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 45)


def chord_stab(freqs, d=0.2):
    t = tt(d); x = sum(saw(f, t) + saw(f * 1.007, t) for f in freqs) / len(freqs)
    return onepole(x, 0.25 * np.exp(-t * 10) + 0.03) * np.exp(-t * 9)


def pad(freqs, d):
    t = tt(d); x = sum(saw(f * dt, t) for f in freqs for dt in (0.996, 1.0, 1.004)) / (3 * len(freqs))
    return onepole(x, 0.06) * np.minimum(1, t * 3) * np.exp(-t * 0.6)


# ---------- arrangement ----------
D2, F2, Bb1, C2 = 73.42, 87.31, 58.27, 65.41
roots = [D2, Bb1, F2, C2]  # one per bar (2 s)

# 0–2 s: drone + signal blips + riser
t = tt(2.0)
put(np.sin(2 * np.pi * 36.7 * t) * np.minimum(1, t) * 0.35 + onepole(rng.standard_normal(len(t)), .01) * .3 * t / 2, 0)
for b in (0.5, 1.0, 1.5):
    put(blip(1000), b, .35, .3); put(blip(2000, .04), b + .06, .2, -.3)
for k in range(16):
    put(blip(3000 + 400 * (k % 4), .015), .25 + k * .1, .06, (-1) ** k * .5)
put(riser(0.8), 1.2, .5)

# drums & bass 2–13 s (montage handled separately)
for i in range(int(2 / BEAT), int(13 / BEAT)):
    tb = i * BEAT
    if 9 <= tb < 11: continue
    put(kick(), tb, .95)
    if i % 2 == 1: put(clap(), tb, .45)
    for s in range(4 if tb >= 4 else 2):
        step = BEAT / (4 if tb >= 4 else 2)
        put(hat(), tb + s * step, .12 if s % 2 else .07, .25)
    r = roots[int((tb - 2) // 2) % 4]
    put(bass(r), tb + .25, .55); put(bass(r * 2, .12), tb + .375, .18)

# montage 9–11 s: stab on every 1/2 beat
stabs = [[293.7, 349.2, 440.0], [233.1, 293.7, 349.2], [349.2, 440.0, 523.3], [261.6, 329.6, 392.0]]
for k in range(8):
    tb = 9 + k * .25
    put(kick(.3), tb, .9); put(chord_stab(stabs[k % 4]), tb, .45, (-1) ** k * .3)
    put(hat(.04, 90), tb + .125, .12)
    put(blip(1500 + 250 * k, .05), tb + .02, .12, -(-1) ** k * .4)

# 11–13 s: engine-like rising tone following the needle
t = tt(2.0); u = t
v = np.clip(np.where(u < .2, 0, np.where(u > 1.35, 1, (u - .2) / 1.15)), 0, 1)
v = np.where(v < .5, 4 * v ** 3, 1 - (-2 * v + 2) ** 3 / 2)
f0 = 45 + 190 * v
eng = saw(f0, t) * 0.6 + saw(f0 * 2, t) * 0.25 + np.sin(2 * np.pi * np.cumsum(f0 * .5) / SR) * .4
eng = onepole(eng, 0.05 + 0.25 * v) * np.minimum(1, t * 8) * (1 - np.clip((t - 1.7) / .3, 0, 1))
put(eng, 11, .45)
put(riser(.55), 12.45, .45)

# impacts at the cuts
for tc, g in [(2, .8), (4, .7), (6, .6), (9, .8), (11, .8), (12.4, .5), (13, 1.0)]:
    put(impact(), tc, g)

# 13–15 s: resolve pad + shimmer
put(pad([146.8, 220.0, 261.6, 329.6, 440.0], 2.0), 13, .5)
put(pad([293.7, 440.0, 659.3], 2.0), 13.02, .2, .4)
for k in range(12):
    put(blip(2349 * (1 + (k % 3) * .25), .25), 13.1 + k * .125, .05 * (1 - k / 12), (-1) ** k * .6)

# ---------- master ----------
fade = np.ones(N); nf = int(.4 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 2
st = np.stack([L, R], 1) * fade[:, None]
st = np.tanh(st * 1.2)
st = st / np.max(np.abs(st)) * 0.89  # ≈ -1 dBFS peak
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('wrote', out)
