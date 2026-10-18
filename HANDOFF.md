# 引き継ぎメモ: Skill作成ガイドの Word / PowerPoint 制作

ローカルPCの Claude Code でこの作業を続けるためのメモです。
まず「1. 現状」と「3. 次にやること」を読んでください。

## 0. 再開のしかた

```bash
git clone https://github.com/YukinobuSakaguchi/test.git
cd test
git checkout ccr-db202962-81lgf8
cd docs/skill-guide/build
npm install        # 初回だけ。Node.js（LTS版）が必要
npm run build:all  # Word 1つと PowerPoint 2つを作り直す
```

そのあと、リポジトリのルートで `claude` を起動して、次のように頼みます。

```
HANDOFF.md と CLAUDE.md を読んで、「3. 次にやること」の続きをしてください。
```

Node.js が入っていない場合（Windows）: `winget install OpenJS.NodeJS.LTS`、または https://nodejs.org/ から LTS 版を入れてください。

クラウドセッションの会話履歴まで引き継ぎたいときは、上の clone の中で `claude --teleport` を実行して、一覧からこのセッションを選びます。
条件は3つです: 同じ claude.ai アカウントでログインしていること、未コミットの変更がないこと、clone が同じリポジトリであること。
履歴がなくても、このファイルだけで作業は続けられます。

## 1. 現状（2026-10-18 時点）

| 成果物 | ファイル | 状態 |
|---|---|---|
| 解説書（正本） | `docs/skill-guide.md` | 完成 |
| Word 版 | `docs/skill-guide/dist/skill-guide.docx` | 初版。A4・27ページ |
| PPT 詳細版 | `docs/skill-guide/dist/skill-guide-detail.pptx` | 初版。全15章＋付録・46枚・発表者ノート付き。クラウド側で1回ブラッシュアップ済み |
| PPT 提案版 | `docs/skill-guide/dist/skill-guide-proposal.pptx` | 初版。10枚。社内展開・提案用のたたき台 |
| Claude Docs 版 | https://claude.ai/code/artifact/b6829a99-1861-4b26-acf9-8b9e9084684f | 正本と同じ内容（Word/PPT 化の前の版） |

クラウド側で確認したこと:
- 3ファイルとも構造チェック（validate.py）に合格
- Word: 見出しの数が正本と一致（68個）。全ページを画像にして目視確認
- PPT: 全スライドを画像にして目視確認し、はみ出し・箇条書きの崩れ・小さすぎる文字を修正
- 作例 Skill（`docs/skill-guide/examples/meeting-minutes`）は Claude Code で発動を確認済み

クラウド側では確認できなかったこと（**ローカルで確認が必要**）:
- **実機の Word / PowerPoint での見た目**。クラウド環境にはメイリオ・游ゴシックが入っておらず、代替フォントで確認しました。改行位置や文字のはみ出しは、実際のフォントでは変わる可能性があります
- Word の**目次**。生成時点では空で、Word で開いたときに更新されます（更新の確認が出たら「はい」。出なければ目次を右クリック→「フィールド更新」）

## 2. 確定事項（変えるときは相談）

- **正本は Markdown とスライドデータ**。Word は `docs/skill-guide.md` から、PPT は `build/slides-*.js` から自動生成します。生成物（`dist/` の中）を直接編集すると、次に作り直したときに消えます
  - PowerPoint 上で直接仕上げたくなった場合は、その時点で「以後は pptx を正本にする」とこのファイルに書いてください
- フォント: PPT は和文・欧文ともメイリオ（テーマの和文フォントを保存時の後処理で設定）。Word は和文が游ゴシック、欧文が Calibri
- 配色・フォントは `build/theme.js` の1か所で管理
- 提案版は詳細版の要約です。**効果の数値は書かない**（まだ測っていないため）。数値は「試行で測る項目」として示す
- 確認できなかった情報には「要確認」と書く（ChatGPT の対象プラン、Codex 公式ページ本体など。解説書の付録Dに一覧があります）
- リポジトリに push するファイルには、使ったAIモデル名を書かない

## 3. 次にやること

1. **実機確認**: Word と PowerPoint 2つを開いて、全ページ・全スライドを見る
   - Word: 目次の更新、表の列幅、改ページ位置
   - PPT: 文字のはみ出し・重なり、カード内の余白の偏り、メイリオで表示されているか
2. 見つけた問題を直す（Markdown またはスライドデータを直して `npm run build:all`）
3. PPT 詳細版のブラッシュアップを続ける。終わったら、提案版を詳細版の内容に合わせて更新する（順番を守る）
4. 直したら commit して push する

### 任意: Claude Code に見た目を自分で確認させる方法（未検証）

Windows の PowerShell から PowerPoint を操作して PDF に書き出すと、Claude Code が画像で見た目を確認できます。
初めて使うときは、動くかどうかを人が確認してから使ってください。

```powershell
$ppt = New-Object -ComObject PowerPoint.Application
$p = $ppt.Presentations.Open("$PWD\docs\skill-guide\dist\skill-guide-detail.pptx", $true, $false, $false)
$p.SaveAs("$PWD\detail.pdf", 32)   # 32 = PDF
$p.Close(); $ppt.Quit()
```

## 4. ファイル構成

```
docs/skill-guide.md                 … 解説書の正本
docs/skill-guide/
├── build/
│   ├── package.json                … npm run build:docx / build:detail / build:proposal / build:all
│   ├── theme.js                    … 配色・フォント・表紙情報
│   ├── md-to-docx.js               … Markdown → Word
│   ├── slide-kit.js                … スライドのレイアウトと描画部品（共通）
│   ├── slides-detail.js            … 詳細版の内容（1スライド1ブロック）
│   └── slides-proposal.js          … 提案版の内容
├── dist/                           … 生成物（直接編集しない）
├── templates/my-skill/SKILL.md     … 書き込み式テンプレート
└── examples/meeting-minutes/       … 作例 Skill
```

## 5. 注意

- このリポジトリの公開範囲を確認してから、社外秘の情報を書き足してください
- 解説書の情報は 2026-10-17 時点です。各社の画面や対象プランは変わりやすいので、配布前に付録Dの公式ページを見直してください

---
作成: Claude Code（クラウドセッション） / 作成日: 2026-10-18
