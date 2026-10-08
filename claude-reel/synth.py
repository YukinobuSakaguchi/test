"""Synthesizes soundtrack.wav for reel.html (15 s, 120 BPM, 48 kHz stereo). Requires numpy only.
Every event time below mirrors a timing constant in reel.html (typing, token pops, tree nodes,
code typing, word swaps, data points, UI pops, montage cuts, mark rays).
Usage: python3 synth.py
"""
import numpy as np, wave, os

SR, DUR, BEAT = 48000, 15.0, 0.5
N = int(SR * DUR)
DRY = np.zeros((N, 2)); WET = np.zeros((N, 2))   # WET goes through the reverb
rng = np.random.default_rng(11)


def tt(d):
    return np.arange(int(d * SR)) / SR


def put(sig, t0, g=1.0, pan=0.0, rev=0.0):
    i = int(t0 * SR); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    l, r = g * (1 - max(pan, 0)), g * (1 + min(pan, 0))
    DRY[i:i + n, 0] += sig[:n] * l; DRY[i:i + n, 1] += sig[:n] * r
    if rev: WET[i:i + n, 0] += sig[:n] * l * rev; WET[i:i + n, 1] += sig[:n] * r * rev


def lp(x, a):
    y = np.empty_like(x); s = 0.0; a = np.broadcast_to(a, x.shape)
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def hp(x, a=.2): return x - lp(x, a)
def hz(m): return 440 * 2 ** ((m - 69) / 12)


def saw(f, t):
    return 2 * ((np.cumsum(np.broadcast_to(f, t.shape)) / SR) % 1) - 1


# ---------- instruments ----------
def pluck(f, d=.6, bright=.5):
    """Karplus-Strong string."""
    n = int(d * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p)
    buf = lp(buf, bright); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
    return out * np.minimum(1, tt(d) * 2000)


def bell(f, d=1.2, idx=2.5):
    t = tt(d); return np.sin(2 * np.pi * f * t + idx * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 3.2)


def key(d=.05):
    t = tt(d); return hp(rng.standard_normal(len(t)), .5) * np.exp(-t * 160) * .7 + np.sin(2 * np.pi * 170 * t) * np.exp(-t * 90) * .5


def kick(d=.45):
    t = tt(d); f = 46 + 105 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5) + .25 * rng.standard_normal(len(t)) * np.exp(-t * 350)


def clap(d=.3):
    t = tt(d); return hp(rng.standard_normal(len(t)), .35) * np.exp(-t * 18) * .6


def hat(d=.05, k=80):
    t = tt(d); return hp(rng.standard_normal(len(t)), .65) * np.exp(-t * k)


def bass(f, d=.24):
    t = tt(d); x = saw(f, t) + .5 * saw(f * 1.004, t)
    return lp(x, .03 + .1 * np.exp(-t * 16)) * np.minimum(1, t * 500) * np.exp(-t * 5)


def pad(notes, d, cut=.05):
    t = tt(d); x = sum(saw(hz(m) * k, t) for m in notes for k in (.997, 1, 1.003)) / (3 * len(notes))
    return lp(x, cut) * np.minimum(1, t * 2.5) * np.minimum(1, (d - t) * 3)


def riser(d, top=2400):
    t = tt(d); p = t / d
    return lp(rng.standard_normal(len(t)), .02 + .45 * p ** 2) * p ** 2.4 + np.sin(2 * np.pi * np.cumsum(180 + top * p ** 3) / SR) * p ** 3 * .2


def whoosh(d):
    t = tt(d); p = t / d; return lp(rng.standard_normal(len(t)), .03 + .3 * np.sin(np.pi * p)) * np.sin(np.pi * p) ** 2


def impact(d=1.8):
    t = tt(d); f = 34 + 70 * np.exp(-t * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6) + lp(rng.standard_normal(len(t)), .25) * np.exp(-t * 8) * .8


def blip(f, d=.06):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 60)


# ---------- harmony (one chord per bar) ----------
CH = {0: [50, 54, 57, 61, 64], 2: [47, 50, 54, 57, 61], 4: [43, 47, 50, 54, 57], 6: [45, 49, 52, 54, 57],
      8: [50, 54, 57, 61, 64], 10: [47, 50, 54, 57, 62], 12: [45, 49, 52, 55, 57]}
ROOT = {0: 38, 2: 35, 4: 31, 6: 33, 8: 38, 10: 35, 12: 33}
for t0, ns in CH.items():
    put(pad(ns, 2.0 if t0 < 12 else 1.0, .035 if t0 == 0 else .05), t0, .32 if t0 else .26, rev=.5)

# 01 ASK — typing, send, token pops, riser into the iris
for i in range(16): put(key(), .2 + i * .045, .32, (i % 3 - 1) * .2)
put(key(.08), .93, .5); put(blip(1320, .12), .95, .18, rev=.4)
penta = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]
for i in range(11): put(pluck(hz(penta[i]), .5, .6), 1.05 + i * .03, .22, (i / 5 - 1) * .5, rev=.5)
put(whoosh(.5), 1.5, .35); put(riser(.45, 1600), 1.55, .35)

# drums + bass 2–12 s
for i in range(int(2 / BEAT), int(12 / BEAT)):
    tb = i * BEAT; bar = int(tb // 2) * 2
    put(kick(), tb, .9)
    if tb >= 4 and i % 2 == 1: put(clap(), tb, .38, rev=.15)
    steps = 4 if tb >= 4 else 2
    for s in range(steps): put(hat(), tb + s * BEAT / steps, .07 if s % 2 == 0 else .11, .3)
    r = ROOT[bar]; put(bass(hz(r)), tb + .25, .5); put(bass(hz(r + 12), .12), tb + .375, .14)

# 02 THINK — a ping per chosen-path node, pulse shimmer, zoom riser
for d, m in enumerate([74, 78, 81, 85, 86, 90]): put(bell(hz(m), .9, 1.6), 2.12 + d * .27, .14, (d / 2.5 - 1) * .4, rev=.6)
for k in range(8): put(blip(hz(86 + k * 2), .05), 3.38 + k * .043, .06, rev=.5)
put(riser(.42, 2800), 3.58, .35)

# 03 CODE — fast typing, run, drawing arpeggio, terminal, expand whoosh
r = np.random.default_rng(3)
for tc in np.arange(4.12, 5.2, 1 / 26): put(key(.035), tc + r.uniform(0, .012), .18, r.uniform(-.4, .4))
put(key(.08), 4.62, .45); put(blip(1760, .1), 4.63, .12, rev=.3)
arp = [62, 66, 69, 73, 74, 78, 81, 85]
for k in range(12): put(pluck(hz(arp[k % 8]), .4, .55), 4.7 + k * .0625, .13, (k % 2) * .6 - .3, rev=.4)
for tc in np.arange(5.22, 5.68, 1 / 22): put(key(.03), tc, .14)
put(whoosh(.35), 5.65, .4)

# 04 WRITE — a bell per language
mel = [81, 78, 74, 76, 78, 81, 83, 86]
for k in range(8): put(bell(hz(mel[k]), 1.0, 2.0), 6 + k * .25, .17, (k % 2) * .5 - .25, rev=.6)
put(whoosh(.3), 7.72, .3)

# 05 ANALYZE / 06 SEE — data points landing, scan sweep, UI pops
for k in range(40): put(blip(hz(76 + (k * 7) % 19), .04), 8.36 + k * .009, .05, (k % 5) / 2 - 1, rev=.3)
put(bell(hz(69), .8, 1.2), 8.48, .1, rev=.5); put(bell(hz(93), .6, 3), 8.72, .08, rev=.5)
t = tt(.38); put(np.sin(2 * np.pi * np.cumsum(500 + 900 * t / .38) / SR) * .12 * np.sin(np.pi * t / .38), 9.1, .5, rev=.3)
for k in range(5): put(pluck(hz([74, 78, 81, 85, 86][k]), .45, .7), 9.48 + k * .07, .16, -.3 + k * .15, rev=.5)

# 07 DO — stabs on every half beat
stab = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 66]]
for k in range(8):
    tb = 10 + k * .25; tt_ = tt(.2)
    x = sum(saw(hz(m), tt_) for m in stab[k // 2]) / 4
    put(lp(x, .25 * np.exp(-tt_ * 10) + .03) * np.exp(-tt_ * 9), tb, .32, (k % 2) * .5 - .25, rev=.3)
    if k % 2: put(kick(.3), tb, .6)

# 08 ALL — zoom-out whoosh, collapse riser, impact
put(whoosh(.6), 12.0, .45, rev=.3); put(riser(.5, 3000), 12.5, .45)
for tc, g in [(2, .55), (4, .55), (6, .45), (8, .5), (10, .6), (12, .5), (13, .9)]: put(impact(), tc, g)

# 09 CLAUDE — resolve chord, a tick per ray, wordmark bell, tagline sparkle
put(pad([50, 57, 62, 66, 69, 73], 2.0, .06), 13, .4, rev=.7)
for k in range(12): put(pluck(hz([86, 90, 93, 97][k % 4]), .35, .7), 13.2 + k * .022, .07, (k / 6 - 1) * .7, rev=.6)
put(bell(hz(74), 1.6, 1.5), 13.5, .2, rev=.8); put(bell(hz(81), 1.4, 1.2), 13.82, .12, rev=.8)
for k in range(10): put(bell(hz([86, 90, 93, 98][k % 4]), .5, 1), 13.82 + k * .03, .035, (k % 2) * .8 - .4, rev=.8)

# ---------- reverb (FFT convolution with a decaying-noise impulse) + master ----------
ir_t = tt(1.8); ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
ir[:, 0] = lp(ir[:, 0], .35); ir[:, 1] = lp(ir[:, 1], .35); ir /= np.sqrt((ir ** 2).sum(0))
L = 1 << int(np.ceil(np.log2(N + len(ir))))
for c in range(2):
    WET[:, c] = np.fft.irfft(np.fft.rfft(WET[:, c], L) * np.fft.rfft(ir[:, c], L), L)[:N]
mix = DRY + WET * .55
fade = np.ones(N); nf = int(.45 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 2
mix = np.tanh(mix * fade[:, None] * 1.3); mix = mix / np.max(np.abs(mix)) * .89   # ≈ -1 dBFS
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
