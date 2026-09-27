"""Synthesised soundtrack for the reel (no samples, all DSP).

usage: python3 audio.py cues.json out.wav
cues.json comes from reel.js (window.audioCues) so every tick / blip lands on the exact frame it belongs to.
128 BPM, F minor. Arrangement follows the 8-bar picture edit.
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR = cues["dur"]
BEAT = 60 / cues["bpm"]
BAR = BEAT * 4
T_IMPACT, T_DROP, T_S4 = cues["impact"], cues["drop"], cues["s4"]
N = int(SR * DUR)
rng = np.random.default_rng(1907)

dry = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
duck_src = np.zeros(N)          # kick trigger → sidechain envelope


def tvec(d):
    return np.arange(int(SR * d)) / SR


def add(sig, t, gain=1.0, pan=0.0, verb=0.0):
    i = int(round(t * SR))
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    st = np.stack([sig * l, sig * r], 1) * gain * 1.414
    dry[i:i + len(sig)] += st
    if verb:
        verb_send[i:i + len(sig)] += st * verb


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, kind, fs=SR, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(SR * d))


def saw(freq_arr):
    ph = np.cumsum(freq_arr) / SR
    return 2 * (ph - np.floor(ph + 0.5))


# ---------------- instruments ----------------
def kick(big=False):
    d = 0.9 if big else 0.42
    t = tvec(d)
    f = 45 + 170 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (3.5 if big else 7.5))
    click = filt(noise(0.006), "highpass", 2500) * 0.5
    body[: len(click)] += click
    return np.tanh(body * 1.6)


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    t = tvec(d)
    return filt(noise(d), "highpass", 7500) * np.exp(-t * (18 if open_ else 70))


def clap():
    d = 0.25
    t = tvec(d)
    env = np.exp(-t * 22)
    for o in (0.0, 0.011, 0.022):
        env += np.exp(-np.clip(t - o, 0, None) * 180) * (t >= o)
    return filt(noise(d), "bandpass", [900, 5000]) * env * 0.5


def tick():
    t = tvec(0.012)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 500)


def click():
    t = tvec(0.006)
    return filt(noise(0.006), "highpass", 4000) * np.exp(-t * 900)


def blip(f):
    t = tvec(0.14)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 28)


def pad(freqs, d, cutoff=1400, attack=0.4):
    t = tvec(d)
    sig = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            sig += saw(np.full(len(t), f * 2 ** (det / 12)))
    sig = filt(sig, "lowpass", cutoff) / (len(freqs) * 3)
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / 0.25)
    return sig * env


def stab(freqs, d=0.45):
    t = tvec(d)
    sig = sum(saw(np.full(len(t), f)) + saw(np.full(len(t), f * 1.006)) for f in freqs)
    sig = filt(sig, "lowpass", 2600) / (len(freqs) * 2)
    return sig * np.exp(-t * 7)


def bass(f, d):
    t = tvec(d)
    s = saw(np.full(len(t), f)) + 0.6 * np.sin(2 * np.pi * f / 2 * t)
    s = filt(s, "lowpass", 380)
    return np.tanh(s * 1.8) * np.minimum(1, t / 0.005) * np.exp(-t * 3)


def whoosh(d, up=True):
    t = tvec(d)
    n = noise(d)
    x = t / d
    env = (x if up else 1 - x) ** 2
    lo = filt(n, "bandpass", [300, 1200])
    hi = filt(n, "bandpass", [1500, 7000])
    mix = lo * (1 - x) + hi * x if up else lo * x + hi * (1 - x)
    return mix * env


def riser(d):
    t = tvec(d)
    x = t / d
    f = 180 * 2 ** (x * 3.3)
    tone = saw(f) * 0.3
    return (filt(noise(d), "highpass", 1500) * 0.7 + filt(tone, "lowpass", 5000)) * x ** 2.2


def impact(big=True):
    d = 2.8 if big else 1.4
    t = tvec(d)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 3)) / SR) * np.exp(-t * (1.1 if big else 2.4))
    crash = filt(noise(d), "highpass", 3000) * np.exp(-t * (1.6 if big else 3.5)) * 0.45
    body = filt(noise(d), "lowpass", 900) * np.exp(-t * 9) * 0.8
    return np.tanh((sub * 1.3 + crash + body) * 1.2)


def glitch(d):
    t = tvec(d)
    steps = (t * 60).astype(int)
    f = 300 + (np.array([rng.random() for _ in range(steps.max() + 1)])[steps]) * 2500
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 * (rng.random(len(t)) > 0.2)


def engine(d):
    t = tvec(d)
    x = t / d
    f = 55 + 170 * x ** 1.6
    s = saw(f) + 0.5 * saw(f * 2.01)
    s = filt(s, "lowpass", 900) * (0.3 + 0.7 * x)
    return np.tanh(s * 2) * np.minimum(1, (d - t) / 0.05)


# ---------------- harmony ----------------
def hz(n):  # MIDI → Hz
    return 440 * 2 ** ((n - 69) / 12)


F2, Db2, Ab2, Eb2 = 41, 37, 44, 39
CHORDS = [  # per bar : bass root, voicing
    (F2, [65, 68, 72, 77]),       # Fm
    (Db2, [65, 68, 73, 77]),      # Db
    (Ab2, [63, 68, 72, 75]),      # Ab
    (Eb2, [63, 67, 70, 75]),      # Eb
]


def chord(bar):
    root, v = CHORDS[bar % 4]
    return hz(root), [hz(n) for n in v]


# ---------------- arrangement ----------------
# Bar 1: opening — sub boom, airy pad, ticks as each character lands
add(impact(big=False) * 0.55, 0.0, 0.8, verb=0.2)
add(pad([hz(n) for n in (53, 60, 65, 68)], 2 * BAR, cutoff=900, attack=1.2), 0.0, 0.32, verb=0.5)
for e in cues["events"]:
    if e["type"] == "tick":
        add(tick(), e["t"], 0.35 * e.get("v", 1), pan=rng.uniform(-.4, .4), verb=0.4)

# Bar 2: reverse suck into the collision, then the hit
pre = T_IMPACT - 1.2
add(whoosh(1.2, up=True), pre, 0.55, verb=0.3)
add(riser(0.9), T_IMPACT - 0.9, 0.25)
add(impact(), T_IMPACT, 0.95, verb=0.35)
add(kick(big=True), T_IMPACT, 0.9)
duck_src[int(T_IMPACT * SR)] = 1
add(stab(chord(0)[1], 0.9), T_IMPACT, 0.5, verb=0.6)
add(glitch(0.4), 2.9, 0.12, pan=0.3)
for k in (6, 7):
    add(kick(), k * BEAT, 0.7)
    duck_src[int(k * BEAT * SR)] = 1

# Bars 3-7: groove
for b in range(2 * 4, 7 * 4):           # beats 8 … 27
    tb = b * BEAT
    last_build = b >= 27                  # drop the kick on the final beat for tension
    if not last_build:
        add(kick(), tb, 0.85)
        duck_src[int(tb * SR)] = 1
    add(hat(open_=(b % 2 == 1)), tb + BEAT / 2, 0.18 if b % 2 else 0.12, pan=0.25)
    add(hat(), tb + BEAT / 4, 0.06, pan=-0.3)
    add(hat(), tb + 3 * BEAT / 4, 0.06, pan=-0.3)
    if b >= 12 and b % 2 == 1 and b < 26:
        add(clap(), tb, 0.45, verb=0.3)
for bar in range(2, 7):
    root, v = chord(bar)
    add(pad(v, BAR + 0.1, cutoff=1100 + 250 * (bar - 2), attack=0.15), bar * BAR, 0.22, verb=0.4)
    for e8 in range(8):
        t8 = bar * BAR + e8 * BEAT / 2
        if bar == 6 and e8 >= 6:
            break
        add(bass(root * (2 if e8 % 4 == 3 else 1), BEAT / 2), t8, 0.5)

# Heritage odometer: one click per year that rolls past
for e in cues["events"]:
    if e["type"] == "click":
        add(click(), e["t"], 0.5 * e["v"], pan=rng.uniform(-.2, .2))
    if e["type"] == "blip":
        add(blip(e["f"]), e["t"], 0.2, pan=rng.uniform(-.5, .5), verb=0.5)

# transitions
add(whoosh(0.45), 3.55, 0.45, pan=-0.4, verb=0.2)
add(whoosh(0.4), 5.45, 0.4, pan=0.2, verb=0.2)
add(engine(0.6), 8.72, 0.35)
add(whoosh(0.55), 8.85, 0.55, pan=-0.6)

# Life cards: a chord stab on every cut
for i in range(6):
    tc = T_S4 + i * BEAT
    add(stab(chord(5 + i // 4)[1]), tc, 0.38, pan=(-0.3, 0.3)[i % 2], verb=0.45)
    add(filt(noise(0.08), "highpass", 3000) * np.exp(-tvec(0.08) * 40), tc, 0.25)

# Build: snare roll + riser, silence right before the drop
tb0 = T_S4 + 6 * BEAT
for k in range(12):
    tr = tb0 + (k * BEAT / 4 if k < 4 else BEAT + (k - 4) * BEAT / 8)
    add(clap(), tr, 0.18 + 0.03 * k, verb=0.2)
add(riser(2 * BEAT - 0.04), tb0, 0.5, verb=0.3)
add(riser(BAR), T_DROP - BAR, 0.18)

# Drop / finale
add(impact(), T_DROP, 1.0, verb=0.5)
add(kick(big=True), T_DROP, 1.0)
duck_src[int(T_DROP * SR)] = 1
root, v = chord(0)
add(stab(v + [hz(84)], 1.2), T_DROP, 0.55, verb=0.8)
add(pad(v + [hz(53)], DUR - T_DROP, cutoff=1800, attack=0.05), T_DROP, 0.32, verb=0.6)
add(bass(root, 1.6), T_DROP, 0.6)
add(blip(1397), 14.72, 0.25, verb=0.7)
add(tick(), 14.93, 0.4, verb=0.8)

# ---------------- mix ----------------
# sidechain: duck pads/bass against kicks
env = np.zeros(N)
level = 0.0
idx = np.nonzero(duck_src)[0]
tt = np.arange(N) / SR
for i in idx:
    seg = slice(i, min(N, i + int(0.3 * SR)))
    env[seg] = np.maximum(env[seg], np.exp(-(tt[seg] - tt[i]) / 0.09))
duck = 1 - 0.45 * env

# reverb: exponentially decaying stereo noise IR
ir_t = tvec(2.2)
ir = np.stack([rng.standard_normal(len(ir_t)), rng.standard_normal(len(ir_t))], 1) * np.exp(-ir_t * 3.2)[:, None]
ir[:, 0] = filt(ir[:, 0], "lowpass", 6000)
ir[:, 1] = filt(ir[:, 1], "lowpass", 6000)
wet = np.stack([fftconvolve(verb_send[:, c], ir[:, c])[:N] for c in range(2)], 1) * 0.06

mix = dry * duck[:, None] + wet
mix[:, 0] = filt(mix[:, 0], "highpass", 25)
mix[:, 1] = filt(mix[:, 1], "highpass", 25)
# fade tail
fade = np.minimum(1, (DUR - tt) / 0.12)
mix *= fade[:, None]


def limiter(x, ceiling=0.8, release=0.15, block=96):
    """Block-peak look-ahead limiter: gain dips one block before a transient, recovers smoothly."""
    nb = int(np.ceil(len(x) / block))
    pk = np.array([np.max(np.abs(x[i * block:(i + 1) * block])) for i in range(nb)])
    pk = np.maximum(pk, np.r_[pk[1:], 0])
    target = np.minimum(1, ceiling / np.maximum(pk, 1e-9))
    g = np.empty(nb)
    cur, rel = 1.0, np.exp(-block / (SR * release))
    for i in range(nb):
        cur = target[i] if target[i] < cur else rel * cur + (1 - rel) * target[i]
        g[i] = cur
    gs = np.interp(np.arange(len(x)), np.arange(nb) * block, g)
    return x * gs[:, None]


# set the groove (bars 3-7) to a solid level, let the limiter tame the impacts
groove = mix[int(4 * SR):int(12 * SR)]
mix *= 0.24 / np.sqrt(np.mean(groove ** 2))
mix = np.tanh(mix * 1.1) / 1.1
mix = limiter(mix, ceiling=0.84)
mix = np.clip(mix, -0.86, 0.86)
mix *= 0.8                                  # ≈ -12.5 LUFS, true peak < -2 dBTP

pcm = (mix * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT, f"{DUR}s peak={np.max(np.abs(mix)):.2f}")
