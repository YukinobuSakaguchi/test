# このリポジトリについて

AIの「Skill」（Agent Skills）の作り方を説明する日本語の解説書と、その Word / PowerPoint 版を作っています。
作業の経緯と次にやることは `HANDOFF.md` にあります。作業を始める前に読んでください。

## 正本と生成物

- 解説書の正本は `docs/skill-guide.md`。Word 版はここから自動生成する
- PowerPoint の内容は `docs/skill-guide/build/slides-detail.js`（詳細版）と `slides-proposal.js`（提案版）に、1スライド1ブロックのデータとして書いてある
- `docs/skill-guide/dist/` の中は生成物。直接編集せず、正本を直して作り直す

## ビルド

```bash
cd docs/skill-guide/build
npm install          # 初回のみ
npm run build:all    # Word + PPT 2種
```

## 作業のルール

- ユーザーは非プログラマーの技術者。変更したら「何を・なぜ・どう確認したか」を短く説明する
- 確認できない事実を書かない。未確認の情報は「要確認」と書く
- 提案版に効果の数値を書かない（未測定のため）
- 配色・フォントの変更は `build/theme.js` だけで行う
- 生成したら、実機の Word / PowerPoint で見た目を確認してもらうか、PDF にして画像で確認する
- リポジトリに push するファイルに、使ったAIモデル名を書かない
