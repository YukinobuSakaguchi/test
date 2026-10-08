# Claude — Self-Portrait in Code (15 s)

Claude が自分の能力を紹介する、15秒のモーショングラフィックス。映像も音も、すべて Claude が書いたコードから生成している。

- 成果物: `claude-reel.mp4`（1920×1080 / 60fps / H.264 + AAC ステレオ）
- 描画: `reel.html`（Canvas 2D。`renderFrame(t)` で時刻 t の1コマを決定論的に描く）
- 音声: `synth.py`（numpy のみ。120BPM。タイピング音・ノード出現・言語切替・カット点を映像のタイミング定数に同期）
- 書き出し: `render.cjs`（Playwright の Chromium で1コマずつ撮影し、ffmpeg へパイプ）
- フォント: `subset_fonts.py` で和文・韓文フォントを使用文字だけに絞り込み（約36MB → 約0.26MB）

## 構成（120BPM、1拍 = 0.5秒）

| 時間 | セクション | 内容 |
|---|---|---|
| 0–2 s | 01 ASK | 入力欄に「あなたの能力を、15秒で見せて。」が打ち込まれ、送信 → トークンに分かれ、中心へ収束 |
| 2–4 s | 02 THINK | 推論の枝分かれ。行き止まりの枝は薄れ、選んだ経路が光って「answer」へ。そこへズームイン |
| 4–6 s | 03 CODE | コードが打ち込まれ、右のプレビューが**そのコードと同じ式**（12枚花弁のバラ曲線）を描く |
| 6–8 s | 04 WRITE | 8言語の「こんにちは」を半拍ごとに切り替え。左は要約、右は推敲の図 |
| 8–9 s | 05 ANALYZE | 表の行が点になって散布図へ。回帰直線と ±1σ 帯、外れ値の指摘 |
| 9–10 s | 06 SEE | 手描きのラフをスキャンして要素を認識 → 整った UI カードを組み立てる |
| 10–12 s | 07 DO | 0.25秒ごとの8カット（Research / Debug / Plan / Explain / Translate / Review / Design / Build） |
| 12–13 s | 08 ALL OF IT | 直前のカットからズームアウトすると、全シーンが同時に動く壁。最後は中心へ収束 |
| 13–15 s | 09 CLAUDE | マークと「Claude」のロックアップ。「考える。書く。つくる。」 |

画面に出る数値の扱い:

- 散布図の回帰式と σ は、表示している点群から実際に計算した値（`DATA` の最小二乗。外れ値1点は除外）。
- データ点そのもの、トークン境界、推論ツリーは演出用に作った例で、実際のトークナイザや推論過程を写したものではない。
- マークは本作のためのオリジナル図形で、公式ロゴではない。

## 再生成の手順

```bash
python3 synth.py                                         # soundtrack.wav を作る
FFMPEG=/path/to/ffmpeg node render.cjs video             # claude-reel.mp4 を書き出す（libx264 が必要）
node render.cjs stills 1.3,7.4,14.4 ./stills             # 指定時刻の静止画だけ確認する
python3 subset_fonts.py <フル版フォントのフォルダ>         # reel.html の文言を変えたらフォントを再サブセット
```

`reel.html` をローカル HTTP サーバー経由（例: `npx http-server claude-reel`）でブラウザで開くと、リアルタイムでプレビュー再生できる（クリックで音声つき再生）。

フォントは Google Fonts の Instrument Serif / Inter Tight / JetBrains Mono / Noto Serif JP / Noto Serif KR / Noto Sans JP（いずれも SIL Open Font License）。
