#!/usr/bin/env bash
# Full build: cue list → soundtrack → 900 frames → out/daihatsu_motion_reel.mp4
# needs: node + playwright (Chromium), python3 + numpy/scipy, ffmpeg with libx264 (imageio-ffmpeg works)
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}"
mkdir -p out build
node render.cjs cues build/cues.json
python3 audio.py build/cues.json build/soundtrack.wav
node render.cjs video "$FFMPEG" build/soundtrack.wav out/daihatsu_motion_reel.mp4
