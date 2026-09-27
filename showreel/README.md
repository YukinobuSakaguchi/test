# E/E Engineering Showreel (15 s)

自動車会社の電子技術者集団をテーマにした、15秒のモーショングラフィックス・ショーリール。

- 成果物: `showreel.mp4`（1920×1080 / 60fps / H.264 + AAC ステレオ）
- 描画: `reel.html`（Canvas 2D。`renderFrame(t)` で時刻 t の1コマを決定論的に描画）
- 音声: `synth.py`（numpy だけで合成。120BPM、カット点にインパクト音を同期）
- 書き出し: `render.cjs`（Playwright の Chromium で1コマずつ撮影し、ffmpeg へパイプ）

## 構成（120BPM、1拍 = 0.5秒）

| 時間 | シーン | 内容 |
|---|---|---|
| 0–2 s | 01 SIGNAL | オシロスコープ上のアナログ波形がデジタル（PWM）へ変化 → フラットラインが1点に収束 |
| 2–4 s | 02 CONTROL | ECU チップから基板配線が放射状に伸び、データパケットが走る → チップへズームで突入 |
| 4–6 s | 03 NETWORK | CAN FD / LIN / 100BASE-T1 の波形とフレーム構造 → 1本の線に潰れて地平線へ |
| 6–9 s | 04 SENSING | 3D ワイヤーフレーム車両、レーダー・LiDAR・カメラ、点群と物体検出 |
| 9–11 s | 05 DOMAINS | 0.25秒ごとの8カット（ADAS / BMS / OBD / OTA / V2X / 制御 / 検証 / 認証） |
| 11–13 s | 06 PRECISION | エンジン制御のタコメーターがレッドゾーンへ。排気・OBD の読み値、規格名のティッカー |
| 13–15 s | 07 IDENTITY | 車のシルエットを1本線で描き、タグライン「クルマの神経系を、設計する。」 |

画面上の数値（回転数、λ、NOx、DTC など）は演出用の架空の値。規格名（ISO 26262、UN R155/R156 等）はキーワードとして表示しているだけで、適合を主張するものではない。

## 再生成の手順

```bash
python3 synth.py                                    # soundtrack.wav を作る
FFMPEG=/path/to/ffmpeg node render.cjs video        # showreel.mp4 を書き出す（libx264 が必要）
node render.cjs stills 1.2,7.4,14.3 ./stills        # 指定時刻の静止画だけ確認する
```

`reel.html` をローカル HTTP サーバー経由（例: `npx http-server showreel`）でブラウザで開くと、リアルタイムでプレビュー再生できる（クリックで音声つき再生）。

フォント（`fonts/`）は Google Fonts の Unbounded / JetBrains Mono / Noto Sans JP / Inter Tight（いずれも SIL Open Font License）。
