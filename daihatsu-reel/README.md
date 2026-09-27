# DAIHATSU Motion Reel (15s)

完成動画: `out/daihatsu_motion_reel.mp4`（1920×1080 / 60fps / H.264 + AAC 48kHz、15.00秒）

非公式のファン制作コンセプト映像です。ダイハツ工業株式会社とは関係なく、同社の承認も受けていません。公式ロゴは使っていません（書体で組んだワードマークのみ）。

## 構成（128 BPM、8小節＝15秒）
| 時間 | シーン | 内容 |
|---|---|---|
| 0.00–3.75 | 01 ORIGIN | 「大阪」＋「発動機」→「大」「発」が衝突→ダイハツ |
| 3.75–5.63 | 02 HERITAGE | 年号オドメーター 1907 → 1951 → 1957 → 2026 |
| 5.63–9.38 | 03 PACKAGING | 軽自動車の規格枠（3,400×1,480×2,000mm／660cc）の中にオリジナル車両を線画で描き、塗りつぶして走り去る |
| 9.38–13.13 | 04 LIFE | 1拍ごとのカット：街／暮らし／仕事／旅／安心／未来 → ビルドアップ |
| 13.13–15.00 | 05 FINALE | ワードマークとタグライン、冒頭の点に戻って終わる |

## ファイル
- `reel.js` — アニメーション本体（Canvas2D、どのフレームも毎回同じ絵になる決定論的描画、6サンプルのモーションブラー）
- `audio.py` — サウンドトラック合成（サンプル素材は不使用。numpy/scipy で合成、キュー位置は `reel.js` から取得）
- `render.cjs` — Playwright で1フレームずつ描画し、ffmpeg に渡す
- `build.sh` — 全体ビルド

## 使い方
- プレビュー: `npx http-server .` を実行し、`index.html?play` を開く（`?t=7.2` で指定時刻の静止画）
- 書き出し: `./build.sh`（Chromium・python3 + numpy/scipy・libx264 付き ffmpeg が必要）

フォント: Noto Sans JP / Archivo / JetBrains Mono（いずれも SIL Open Font License）
