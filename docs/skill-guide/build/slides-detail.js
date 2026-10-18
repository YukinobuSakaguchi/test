// Builds dist/skill-guide-detail.pptx: the full-coverage deck (all 15 chapters + appendix).
// Content follows docs/skill-guide.md. When the guide changes, update the matching slide below
// and run `npm run build:detail`.

const path = require("path");
const K = require("./slide-kit");
const theme = require("./theme");

const OUT = path.join(__dirname, "..", "dist", "skill-guide-detail.pptx");
const { BODY, C } = K;
const pres = K.newDeck("Skill作成ガイド（詳細版）");
const P1 = "第1部 入門編";
const P2 = "第2部 実践編";
const P3 = "第3部 応用編";
const AP = "付録";

// Body area split helpers
const half = (side, gap = 0.4) => ({ x: side === 0 ? BODY.x : BODY.x + (BODY.w + gap) / 2, w: (BODY.w - gap) / 2 });
const aboveCallout = { h: 4.25 };

// ---- opening ----------------------------------------------------------------

pres.addSection({ title: "はじめに" });
K.titleSlide(pres, {
  title: "Skill作成ガイド",
  subtitle: `AIに「仕事の手順書」を渡す方法\n対象: ${theme.meta.targets}\n情報の確認日: ${theme.meta.checkedOn}`,
  note: "このデッキは Skill の作り方を、はじめての人から複数ツールで使い回したい人までを対象に説明します。内容はリポジトリの docs/skill-guide.md（正本）に基づきます。",
});

{
  const s = K.contentSlide(pres, { section: "はじめに", title: "このデッキの読み方", note: "入門編はコードもターミナルも使いません。実践編・応用編は自分で SKILL.md を書きたい人向けです。各社の画面や対象プランは頻繁に変わるため、確認日時点の情報であることを最初に伝えてください。" });
  K.cards(s, [
    { badge: 1, title: "入門編だけでOK", body: ["ChatGPTは使ったが、エージェントやSkillは知らない人向け", "コード・ターミナル不要", "最初のSkillを30分で作る"] },
    { badge: 2, title: "実践編・応用編", body: ["自分でSKILL.mdを書きたい人", "複数のAIツールで使い回したい人", "テスト・安全・運用まで"] },
    { badge: "!", title: "情報の鮮度に注意", highlight: true, body: ["メニュー名や対象プランは頻繁に変わる", "内容は2026-10-17時点", "公式資料で確認できなかった点は「**要確認**」と表示"] },
  ], { ...aboveCallout, h: 3.9 });
  K.callout(s, "正本はリポジトリの **docs/skill-guide.md**。このデッキとWord版はそこから作っています");
}

{
  const s = K.contentSlide(pres, { section: "はじめに", title: "目次", note: "全体は3部構成です。時間が限られるときは第1部だけでも完結します。" });
  K.cards(s, [
    { title: "第1部 入門編", body: ["1. チャットとエージェントの違い", "2. Skillとは", "3. Skillの中身", "4. はじめてのSkillを作る", "5. 似た機能との違い"] },
    { title: "第2部 実践編", body: ["6. 共通ルール（Agent Skills標準）", "7. 良いSkillの設計手順", "8. SKILL.mdの書き方", "9. 環境別の登録方法", "10. テストと改善"] },
    { title: "第3部 応用編", body: ["11. 複数環境で使い回す", "12. スクリプト付きSkill", "13. 安全に使うために", "14. よくある失敗と対処", "15. 作成チェックリスト"] },
    { title: "付録", body: ["作例（議事録Skill）", "用語集", "出典と要確認事項"] },
  ], { cols: 4, bodySize: 16 });
}

// ---- part 1 -----------------------------------------------------------------

K.sectionSlide(pres, { section: P1, title: "第1部 入門編", items: ["コード・ターミナル不要", "1. チャットとエージェントの違い", "2. Skillとは", "3. Skillの中身をのぞいてみる", "4. はじめてのSkillを作る", "5. カスタム指示・プロジェクト・GPTsとの違い"] });

{
  const s = K.contentSlide(pres, { section: P1, title: "1. 「チャット」と「エージェント」の違い", note: "ChatGPTで質問して答えをもらう使い方がチャット。道具（ファイル操作、Web検索、プログラム実行など）を使い、目的を達成するまで自分で手順を進めるAIがエージェントです。" });
  K.table(s, [
    ["", "チャット", "エージェント"],
    ["AIがすること", "質問に文章で答える", "**道具を使って作業を進め、成果物を作る**"],
    ["人がすること", "答えを読んで、自分で作業する", "目的を伝え、結果を確認する"],
    ["例", "「議事録の書き方を教えて」", "「このメモから議事録ファイルを作って」"],
  ], { colW: [2.4, 4.85, 4.88], fontSize: 16 });
  K.callout(s, "エージェント ＝ 道具（ファイル操作・Web検索・プログラム実行）を使い、**目的を達成するまで自分で手順を進めるAI**", { y: 4.6 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "このガイドで扱う5つの環境", note: "5つともエージェントとして働けます。前半2つは画面操作中心、後半3つは開発作業向けのツールです。" });
  K.cards(s, [
    { title: "Claude.ai", body: "Anthropic社のAI「Claude」をブラウザやアプリで使うサービス" },
    { title: "ChatGPT", body: "OpenAI社のAIサービス" },
    { title: "Claude Code", body: "Claudeをパソコン上で開発作業に使うためのツール" },
    { title: "OpenAI Codex", body: "OpenAI社の開発作業向けエージェント" },
    { title: "GitHub Copilot", body: "GitHub社（Microsoft傘下）の開発支援AI" },
  ], { cols: 5, h: 2.6, bodySize: 16, titleSize: 17 });
  K.label(s, "画面で使う", { x: BODY.x, y: 4.3, w: 4.9, h: 0.4 });
  K.label(s, "開発ツールとして使う", { x: BODY.x + 5.05, y: 4.3, w: 7, h: 0.4 });
  K.bullets(s, ["メニューからSkillを登録・アップロード"], { x: BODY.x, y: 4.75, w: 4.9, h: 1 });
  K.bullets(s, ["決まったフォルダにSkillを置く"], { x: BODY.x + 5.05, y: 4.75, w: 7, h: 1 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "2. Skillは「AIに渡す業務マニュアル」", note: "AIは賢いが、あなたの職場のやり方は知りません。新人に業務マニュアルを渡すように、AIにはSkillを渡します。一度作れば、AIは頼まれた時点で自分からマニュアルを開きます。" });
  K.cards(s, [
    { title: "Skillがないとき", body: ["頼むたびに毎回説明する", "「決定事項と宿題を分けて。宿題には担当と期限を必ず。書式はいつもの形で……」", "説明が漏れると出来がばらつく"] },
    { title: "Skillがあるとき", highlight: true, body: ["「議事録にして」と言うだけ", "AIが自分からマニュアル（Skill）を開く", "いつも同じ手順・同じ書式で仕上がる"] },
  ], { cols: 2, ...aboveCallout });
  K.callout(s, "新人に業務マニュアルを渡すように、**AIにはSkillを渡す**");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "Skillが役立つ場面", note: "「同じ説明をAIに3回以上したことがある作業」はSkillにする価値があります。これは本ガイドの目安で、公式の基準ではありません。" });
  K.table(s, [
    ["場面", "Skillにしておくこと"],
    ["議事録の作成", "決まった見出し、宿題の書き方、確認の手順"],
    ["定型メール", "社内の言い回し、署名、宛先ごとの敬語の使い分け"],
    ["報告書のチェック", "確認項目の一覧、よくあるミス、指摘の書き方"],
    ["資料作成", "会社のフォント・色・ロゴの使い方"],
    ["データ集計", "列の意味、除外すべきデータ、計算方法"],
  ], { colW: [3.2, 8.93], fontSize: 16 });
  K.callout(s, "目安: **同じ説明をAIに3回以上したことがある作業**はSkillにする価値がある（本ガイドの推奨）");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "必要なときだけ読まれる・どのAIでも同じ形式", note: "AIは普段、各Skillの名前と「いつ使うか」の説明だけを覚えています。本棚の背表紙だけを眺めておき、必要な本だけを取り出して読むイメージです。2026年10月時点で5環境とも Agent Skills という共通形式に対応しています。" });
  K.cards(s, [
    { title: "本棚の背表紙だけ見ておく", body: ["AIが普段覚えているのは各Skillの**名前**と**いつ使うか**だけ", "頼みごとに合うSkillがあったときだけ中身を読む", "たくさん登録しても重くなりにくい"] },
    { title: "どのAIでも同じ形式", body: ["5つの環境はいずれも共通形式「**Agent Skills**」に対応", "一度作ったSkillは少しの手直しで別のAIでも使える", "詳しくは第11章"] },
  ], { cols: 2 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "3. Skillの中身は SKILL.md 1枚", note: "Skillの正体は SKILL.md というテキストファイル1つです（フォルダごと扱います）。.md はMarkdownという、記号で見出しや箇条書きを表すシンプルな書き方です。メモ帳でも書けます。上の --- で囲まれた部分をフロントマター（表紙情報）と呼び、YAMLという「項目名: 値」の形で書きます。" });
  K.codeBox(s, "---\nname: meeting-minutes\ndescription: 会議のメモから議事録を作る。\n  「議事録にして」と頼まれたときに使う。\n---\n\n# 議事録の作成\n\n1. 決定事項・宿題・未決事項に分けて書く。\n2. 宿題には担当と期限を必ず書く。\n   わからなければ「要確認」と書く。\n3. 最後に、確認が必要な点を一覧にする。", { w: 6.6, fontSize: 14 });
  K.cards(s, [
    { title: "name: 名前", body: "半角英小文字とハイフン → 背表紙のタイトル" },
    { title: "description: いつ使うか", highlight: true, body: "何をするSkillで、いつ使うか → 背表紙の「こんなときに読む」" },
    { title: "--- より下: 本文", body: "実際の手順 → マニュアルの本文" },
  ], { x: BODY.x + 7.0, w: BODY.w - 7.0, cols: 1, titleSize: 18, bodySize: 16 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "いちばん大切なのは description", note: "AIは description だけを見て、今の頼みごとにこのSkillを使うべきかを判断します。本文は使うと決めた後に初めて読まれます。" });
  K.flow(s, [
    { title: "あなたが頼む", body: "「さっきの打合せメモを整理して」" },
    { title: "AIが description を見比べる", body: "登録済みSkillの**名前と説明だけ**を読む", highlight: true },
    { title: "合うSkillを選ぶ", body: "「会議メモから議事録を作る…」が合致" },
    { title: "本文を読んで作業", body: "手順どおりに議事録を作る" },
  ], aboveCallout);
  K.callout(s, "description には **「何をするか」** と **「どんな頼み方をされたら使うか」** の両方を書く");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "4. はじめてのSkillを作る ― 3つの方法", note: "いちばん簡単なのはAIに頼んで作ってもらう方法です。ChatGPTにはSkill作りを手伝うskill-creatorが最初から用意されています。Claude.aiでも例のSkill（skill-creatorを含む）をオンにして使えます。Anthropicの公式ガイドによれば、特別な準備をしなくても「Skillを作って」と頼むだけでClaudeは正しい形式のSkillを作れます。" });
  K.cards(s, [
    { badge: "A", title: "Claude.aiで作る", body: ["チャットで「Skillを作って」と頼む", "対象: Free / Pro / Max / Team / Enterprise"] },
    { badge: "B", title: "ChatGPTで作る", body: ["Skills画面の「Create with chat」", "対象: Business / Enterprise / Healthcare / Edu（個人プランは**要確認**）"] },
    { badge: "C", title: "自分で書いてアップロード", body: ["メモ帳でSKILL.mdを書く", "フォルダごとZIPにして登録"] },
  ], { cols: 3, ...aboveCallout });
  K.callout(s, "おすすめは **AIに頼んで作ってもらう**（A・B）。Skill作りを手伝う「skill-creator」が使える");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "方法A: Claude.aiで作る", note: "準備: 設定 > 機能 で「コード実行とファイル作成」をオン。Team/Enterpriseは管理者がSkillを有効にしている必要があります。保存は「Save skill」ボタン（組織の設定によっては表示されない）。ボタンがない場合はダウンロードして方法Cの手順でアップロードします。試すときは必ず新しいチャットで。" });
  K.flow(s, [
    { title: "準備", body: "設定 > 機能で「**コード実行とファイル作成**」をオン" },
    { title: "頼む", body: "新しいチャットで「議事録を作るSkillを作って」と目的を伝える" },
    { title: "答える", body: "書式や頼み方の質問に、わかる範囲で答える" },
    { title: "保存する", body: "「**Save skill**」を押す（ない場合はダウンロード→方法C）" },
    { title: "確認する", body: "カスタマイズ > スキルでオンになっているか" },
    { title: "試す", body: "**新しいチャット**でメモを貼り「議事録にして」" },
  ], { titleSize: 17 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "方法B: ChatGPTで作る", note: "公式ヘルプでは Business / Enterprise / Healthcare / Edu の対象ユーザーが利用でき、ワークスペースの設定にも左右されます。Plus / Pro は情報が分かれているため要確認。Skills画面は「Plugins」内のSkillsタブにあるという情報がありますが、画面構成も要確認です。アップロードしたSkillは安全性チェックを経て利用可能になります。" });
  K.flow(s, [
    { title: "Skills画面を開く", body: "「Plugins」内のSkillsタブという情報あり（**要確認**）" },
    { title: "Createを選ぶ", body: "Create with chat / Create with editor / Upload from your computer" },
    { title: "チャットで相談", body: "作りたいSkillを説明し、質問に答える" },
    { title: "保存して試す", body: "新しいチャットで試す" },
  ], aboveCallout);
  K.callout(s, "アップロードしたSkillは、利用可能になる前に**ChatGPT側で安全性チェック**が行われる");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "方法C: 自分で書いてアップロード（Claude.ai）", note: "メモ帳で書けます。保存時はファイルの種類を「すべてのファイル」にしないと SKILL.md.txt になります。文字コードはUTF-8。ZIPはフォルダ自体を右クリックして作ります（Windows 11は「ZIPファイルに圧縮する」）。フォルダの中身を選んで圧縮すると正しく読み込めません。" });
  K.bullets(s, [
    "**1.** `meeting-minutes` フォルダを作る",
    "**2.** メモ帳で SKILL.md を書く（第3章の例を貼る）",
    "**3.** 保存: ファイル名 `SKILL.md`（大文字）、種類「**すべてのファイル**」、文字コード **UTF-8**",
    "**4.** **フォルダ自体**を右クリック →「送る」→「圧縮（zip形式）フォルダー」",
    "**5.** カスタマイズ > スキル →「＋」→「＋ Create skill」→「Upload a skill」",
    "**6.** ZIPをアップロードし、オンになっていれば完了",
  ], { ...half(0, 0.5), fontSize: 15 });
  K.label(s, "ZIPの中身", { x: half(1, 0.5).x, y: BODY.y, w: half(1, 0.5).w, h: 0.4 });
  K.cards(s, [
    { title: "正しい", body: "my-skill.zip\n└ meeting-minutes/\n    └ SKILL.md" },
    { title: "誤り", highlight: true, body: "my-skill.zip\n└ SKILL.md（直下にファイル）" },
  ], { x: half(1, 0.5).x, y: BODY.y + 0.5, w: half(1, 0.5).w, h: 3.2, cols: 2, bodySize: 16 });
}

{
  const s = K.contentSlide(pres, { section: P1, title: "うまく動かないときの3つの確認点", note: "それでも使われないときは「議事録Skillを使って」と名前を出して頼むと確実です。" });
  K.cards(s, [
    { badge: 1, title: "オンになっているか", body: "一覧でスイッチがオフのままになっていないか" },
    { badge: 2, title: "頼み方の言葉が description にあるか", body: "「議事録」と書いてあっても「打合せ記録」と頼むと使われないことがある。よく使う言い方を足す" },
    { badge: 3, title: "新しいチャットで試したか", body: "Skillを作った同じチャットでは正しく試せないことがある" },
  ], { cols: 3, ...aboveCallout, titleSize: 18 });
  K.callout(s, "それでもダメなら「**議事録Skillを使って**」と名前を出して頼む");
}

{
  const s = K.contentSlide(pres, { section: P1, title: "5. カスタム指示・プロジェクト・GPTsとの違い", note: "使い分けはシンプル。ほぼ毎回必要な短いことはカスタム指示や指示ファイル、特定の作業のときだけ必要な詳しい手順はSkill。GitHub Copilotの公式ドキュメントも同じ使い分けを勧めています。" });
  K.table(s, [
    ["機能", "効く範囲", "向いている内容", "例"],
    ["カスタム指示", "すべての会話に毎回", "短い好み・前提", "「日本語で、結論から」"],
    ["プロジェクト", "そのプロジェクト内", "特定テーマの資料と指示", "「新製品Xの資料一式」"],
    ["GPTs（ChatGPT）", "そのGPTを選んだ会話", "特定用途の専用チャット", "「英文校正GPT」"],
    ["指示ファイル（CLAUDE.md、AGENTS.md 等）", "そのリポジトリの作業すべて", "開発のルール・前提", "「テストは必ず実行」"],
    ["**Skill**", "**必要なときだけ自動で**", "**特定作業の詳しい手順**", "「議事録の作り方」"],
  ], { colW: [3.4, 3.0, 3.0, 2.73], fontSize: 14 });
  K.callout(s, "**毎回必要な短いこと** → カスタム指示　／　**特定作業の詳しい手順** → Skill");
}

// ---- part 2 -----------------------------------------------------------------

K.sectionSlide(pres, { section: P2, title: "第2部 実践編", items: ["自分で書いて、どの環境でも使う", "6. 共通ルール（Agent Skills標準）", "7. 良いSkillの設計手順", "8. SKILL.mdの書き方", "9. 環境別の登録方法", "10. テストと改善"] });

{
  const s = K.contentSlide(pres, { section: P2, title: "6. 共通ルール: フォルダ構成", note: "各社のSkillはオープンな仕様 Agent Skills（agentskills.io）に基づきます。必須なのは SKILL.md だけ。ファイル名は大文字の SKILL.md（Copilotの公式ドキュメントは「SKILL.mdという名前でなければならない」と明記）。" });
  K.codeBox(s, "meeting-minutes/        ← フォルダ名 = Skillの名前\n├── SKILL.md            ← 必須: フロントマター + 手順\n├── references/         ← 任意: 必要なときに読む資料\n│   └── format.md\n├── scripts/            ← 任意: 実行するプログラム\n└── assets/             ← 任意: テンプレート、画像", { w: 7.6, h: 3.0, fontSize: 15 });
  K.cards(s, [
    { title: "必須は SKILL.md だけ", body: "ファイル名は大文字の SKILL.md" },
    { title: "フォルダ名 = name", highlight: true, body: "フォルダ名とフロントマターの name を一致させる" },
  ], { x: BODY.x + 8.0, w: BODY.w - 8.0, h: 3.2, cols: 1, titleSize: 18, bodySize: 15 });
  K.callout(s, "仕様「**Agent Skills**」（agentskills.io）に合わせて書けば、どの環境でも動く土台ができる", { y: 5.0 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "フロントマターの項目", note: "必須は name と description の2つ。compatibility はほとんどのSkillで不要。allowed-tools は実験的で、対応は製品により異なります。" });
  K.table(s, [
    ["項目", "必須", "制約（Agent Skills仕様）"],
    ["name", "必須", "1〜64文字。半角英小文字・数字・ハイフンのみ。先頭・末尾のハイフン不可、`--` 不可。**フォルダ名と一致**"],
    ["description", "必須", "1〜1024文字。何をするか、いつ使うかを書く"],
    ["license", "任意", "ライセンス名、または同梱したライセンスファイル名"],
    ["compatibility", "任意", "1〜500文字。必要な環境。ほとんどのSkillでは不要"],
    ["metadata", "任意", "自由な「キー: 値」（例: version: \"1.0\"）"],
    ["allowed-tools", "任意", "事前に許可するツール（実験的。対応は製品により異なる）"],
  ], { colW: [2.4, 1.1, 8.63], fontSize: 15 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "環境ごとの追加の制約 ― 厳しい方に合わせる", note: "Claude.aiの description 上限は、公式ヘルプが200文字、仕様とAPIは1,024文字と資料で異なります。どこでも通用させるため、本ガイドは200文字以内を推奨します。" });
  K.table(s, [
    ["環境", "追加の制約・注意"],
    ["Claude（Claude.ai、API）", "name に「anthropic」「claude」を含めない。name・description にXMLタグを含めない"],
    ["Claude.ai", "公式ヘルプでは description は**200文字以内**。アップロードで使える項目は6つのみ（他はエラー）"],
    ["Claude Code", "description（+ when_to_use）は一覧表示で1,536文字で切られる。知らない項目は無視"],
    ["Copilot", "フォルダ名は小文字、空白の代わりにハイフン"],
  ], { colW: [3.2, 8.93], fontSize: 15 });
  K.callout(s, "推奨: name は動作がわかる英小文字＋ハイフン、**description は200文字以内**");
}

{
  const s = K.contentSlide(pres, { section: P2, title: "段階的な読み込み（プログレッシブ・ディスクロージャー）", note: "トークンはAIが文章を数える単位。AIが一度に扱える情報量には上限があるため、普段は最小限だけ読み、必要に応じて詳細を読む仕組みです。だから description の出来が使われるかどうかを決め、SKILL.md は500行以内に収めて詳細は別ファイルに分けます。" });
  K.stack(s, [
    { title: "段階1 発見", body: "起動時に全Skillの **name と description だけ** 読む", tag: "1つ約100トークン" },
    { title: "段階2 起動", body: "頼みごとが description に合うと、SKILL.md の本文を全部読む", tag: "5,000トークン未満推奨" },
    { title: "段階3 実行", body: "本文の指示に従い、必要なファイルだけ読む・スクリプトを実行", tag: "必要な分だけ" },
  ], { h: 3.6 });
  K.callout(s, "だから **description の出来が勝負**。SKILL.md は **500行以内**、詳細は別ファイルへ", { y: 5.35 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "7. 良いSkillの設計手順", note: "いきなり書き始めず5点を先に決めます。テスト用の頼み方は最低3つ（Anthropic公式ガイドも少なくとも3つの評価シナリオを推奨）。使われるべきでない紛らわしい頼み方も用意すると誤発動を防げます。" });
  K.flow(s, [
    { title: "Skillにすべきか判定", body: "繰り返す・手順が決まっている・社内ルールがある" },
    { title: "発動条件を決める", body: "実際の頼み方を**5つ以上**書き出す" },
    { title: "入力と出力を決める", body: "何を受け取り、何を返すか" },
    { title: "成功の基準を決める", body: "確かめられる形で書く（例: 宿題が全件3点そろう）" },
    { title: "テストの頼み方を用意", body: "使われるべき**3つ以上**＋紛らわしい例" },
  ], { titleSize: 17 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "Skillに向く作業・向かない作業", note: "1つのSkillには1つの仕事を担当させます。大きなSkillを1つ作るより、小さなSkillを複数作るほうがうまく組み合わさります（Anthropic公式ヘルプも推奨）。" });
  K.cards(s, [
    { title: "Skillに向く", body: ["何度も繰り返す作業", "手順やルールが決まっている", "AIが知らない社内ルールがある", "1つの目的に絞れる"] },
    { title: "Skillに向かない", highlight: true, body: ["一度きりの作業", "毎回やり方が違う", "AIが一般知識で十分こなせる", "「何でもできる」万能型"] },
  ], { cols: 2, ...aboveCallout });
  K.callout(s, "**1つのSkillに1つの仕事**。大きな1つより小さな複数のほうがうまく組み合わさる");
}

{
  const s = K.contentSlide(pres, { section: P2, title: "8. description の書き方: 悪い例と良い例", note: "一人称（私は〜）は避けます。英語の公式ガイドは三人称で書くよう求めています。日本語なら「〜する。〜のときに使う。」と書けば自然にそうなります。" });
  K.table(s, [
    ["", "例", "評価"],
    ["悪い例", "議事録を手伝う。", "何をするか曖昧。いつ使うかがない"],
    ["悪い例", "私は議事録を作れます。", "一人称は避ける"],
    ["**良い例**", "会議のメモや文字起こしから、決定事項・宿題（担当・内容・期限）・未決事項を整理した議事録を作成する。「議事録にして」「会議メモをまとめて」と頼まれたとき、または会議の文字起こしが貼り付けられたときに使う。", "何を・いつが具体的。利用者の言葉が入っている"],
  ], { colW: [1.6, 7.2, 3.33], fontSize: 15 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "description を書く4つのコツ", note: "AIはSkillを使わずに済ませようとする傾向があるため、少し積極的に書くと使われやすくなります（Anthropic提供のskill-creatorの解説より）。" });
  K.cards(s, [
    { badge: 1, title: "利用者の言葉を入れる", body: "「議事録」「会議メモ」「打合せ記録」など言い換えも" },
    { badge: 2, title: "状況でも判断できるように", body: "「文字起こしが貼り付けられたとき」など" },
    { badge: 3, title: "少し積極的に書く", body: "「〜という言葉がなくても、〜の場合は使う」" },
    { badge: 4, title: "主語は書かない", body: "「〜する。〜のときに使う。」（三人称）" },
  ], { cols: 4, titleSize: 18, bodySize: 18 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "本文の構成と6つの原則", note: "本文の形式に決まりはありません。左の構成が書きやすく伝わりやすい形です。「必ず〜」と強く書くより理由を書くほうが、想定外の場面でもAIが正しく判断できます。MUSTや「絶対に」を多用したくなったら理由の説明が足りないサインです。" });
  K.label(s, "本文の構成例", { x: BODY.x, y: BODY.y, w: 3.6, h: 0.4 });
  K.flow(s, [{ title: "目的" }, { title: "手順" }, { title: "判断のルール" }, { title: "出力の形式" }, { title: "例" }].map((x) => ({ ...x })), { x: BODY.x, y: BODY.y + 0.5, w: BODY.w, h: 1.45, titleSize: 17 });
  K.cards(s, [
    { title: "AIが知っていることは書かない", body: "職場のやり方だけを書く" },
    { title: "理由を添える", highlight: true, body: "「〜する。なぜなら〜」" },
    { title: "具体例を入れる", body: "入力と出力を1〜3組" },
    { title: "自由度を作業に合わせる", body: "失敗できない作業ほど細かく" },
    { title: "用語をそろえる", body: "「宿題」「ToDo」を混ぜない" },
    { title: "時期で変わる情報を書かない", body: "古い方式は「旧方式」に分ける" },
  ], { x: BODY.x, y: BODY.y + 2.3, w: BODY.w, h: 2.95, cols: 3, titleSize: 17, bodySize: 16 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "付属ファイルの使い分け", note: "付属ファイルは SKILL.md から直接リンクします。資料から別の資料へ何段階もたどらせると、AIが途中までしか読まないことがあります。パスは / で区切り、ファイル名は中身がわかる名前に。100行を超える資料には目次を付けます。" });
  K.table(s, [
    ["フォルダ", "入れるもの", "AIの扱い", "例"],
    ["references/", "詳しい資料", "必要なときに**読む**", "書式の詳細、用語集、社内規程の抜粋"],
    ["scripts/", "プログラム", "必要なときに**実行**", "集計、ファイル変換、チェック処理"],
    ["assets/", "素材", "成果物に**使う**", "Word/PowerPointのテンプレート、ロゴ"],
  ], { colW: [2.3, 2.2, 2.9, 4.73], fontSize: 16 });
  K.bullets(s, ["SKILL.md から**直接**リンクする（何段階もたどらせない）", "パスの区切りは `/`（Windowsの `\\` は他の環境で動かない）", "ファイル名は中身がわかる名前に／100行超の資料には目次"], { y: 4.1, h: 2.2 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "9. 環境別の登録方法: 比較表", note: "~ は自分のホームフォルダ（Windowsなら通常 C:\\Users\\ユーザー名）。リポジトリは変更履歴ごと管理する保管場所（主にGit/GitHub）です。" });
  K.table(s, [
    ["環境", "登録方法", "置き場所", "名前を指定", "確認"],
    ["Claude.ai", "ZIPアップロード／チャットで作成", "アカウント（クラウド）", "自然な言葉で", "カスタマイズ > スキル"],
    ["ChatGPT", "チャット／エディタ／アップロード", "ワークスペース（クラウド）", "自然な言葉で", "Skills画面（要確認）"],
    ["Claude Code", "フォルダを置く", "~/.claude/skills/名前/\n.claude/skills/名前/", "/名前", "/skills"],
    ["Codex", "フォルダを置く", "~/.agents/skills/名前/\n.agents/skills/名前/", "$名前", "頼んで確かめる"],
    ["Copilot", "フォルダを置く／gh skill install", "~/.copilot/skills/ 等\n.github/skills/ 等", "/名前（CLI）", "/skills list（CLI）"],
  ], { colW: [1.8, 3.0, 3.4, 1.8, 2.13], fontSize: 14 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "Claude.ai と ChatGPT", note: "Claude.aiで有効にしたSkillは、Claude for Excel/PowerPoint/Word/Outlookのアドインや、同じアカウントでログインしたClaude Codeでも使えます。ChatGPTのアップロード可能なファイル形式の詳細は要確認。ワークスペース管理者はアップロードを無効にできます。" });
  K.cards(s, [
    { title: "Claude.ai", body: ["条件: Free〜Enterprise、「コード実行とファイル作成」が有効", "登録: カスタマイズ > スキル >「＋」>「＋ Create skill」>「Upload a skill」", "共有（Team/Enterprise）:「Share」で個人・グループへ、「Publish to org」で組織ライブラリへ", "Office アドインや Claude Code でも使える"] },
    { title: "ChatGPT", body: ["条件: Business / Enterprise / Healthcare / Edu（個人プランは**要確認**）", "登録: Skills >「Create」> chat / editor / upload", "アップロードは安全性チェック後に利用可能", "ファイル形式の詳細は**要確認**"] },
  ], { cols: 2, bodySize: 17 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "Claude Code", note: "同名のSkillは 組織 > 個人 > プロジェクト の順で優先。既存の skills フォルダ内の変更は再起動なしで反映。新しく skills フォルダを作った場合は /reload-skills。独自項目は他の環境では使えないか、エラーになる場合があります。" });
  K.table(s, [
    ["範囲", "場所", "使える範囲"],
    ["個人", "~/.claude/skills/名前/SKILL.md", "自分のすべてのプロジェクト"],
    ["プロジェクト", ".claude/skills/名前/SKILL.md", "そのリポジトリ（コミットで共有）"],
    ["プラグイン", "プラグイン/skills/名前/SKILL.md", "/プラグイン名:スキル名 で呼ぶ"],
  ], { ...half(0, 0.4), colW: [1.4, 2.9, 1.57], fontSize: 14 });
  K.label(s, "使い方と確認", { x: half(1, 0.4).x, y: BODY.y, w: half(1, 0.4).w, h: 0.4 });
  K.bullets(s, ["自動: description に合えば読み込む", "手動: メッセージ先頭に `/名前`", "一覧: `/skills`", "新しいフォルダを作ったら `/reload-skills`"], { ...half(1, 0.4), y: BODY.y + 0.45, h: 2.0, fontSize: 15 });
  K.label(s, "Claude Code独自の項目", { x: half(1, 0.4).x, y: BODY.y + 2.6, w: half(1, 0.4).w, h: 0.4 });
  K.bullets(s, ["`disable-model-invocation`: 手動呼び出し専用", "`user-invocable: false`: メニューに出さない", "`$ARGUMENTS`: 引数を差し込む", "`context: fork`: サブエージェントで実行"], { ...half(1, 0.4), y: BODY.y + 3.05, h: 2.2, fontSize: 14 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "OpenAI Codex", note: "置き場所は公式ページの検索結果とCodexのソースコード変更履歴から確認（公式ページ本体は直接閲覧できていません）。同名のSkillは統合されず両方が選択肢に出ます。agents/openai.yaml はCodexの画面側が読む設定で、他の環境は無視します。反映されない場合は再起動。" });
  K.table(s, [
    ["範囲", "場所"],
    ["個人", "$HOME/.agents/skills/名前/（旧 ~/.codex/skills/ も互換）"],
    ["リポジトリ", "作業フォルダ〜ルートの各階層の .agents/skills/"],
    ["管理者", "/etc/codex/skills/"],
    ["システム", "Codexに同梱（skill-creator など）"],
  ], { ...half(0, 0.4), colW: [1.5, 4.37], fontSize: 14 });
  K.label(s, "使い方", { x: half(1, 0.4).x, y: BODY.y, w: half(1, 0.4).w, h: 0.4 });
  K.bullets(s, ["自動、または `$meeting-minutes で議事録にして`"], { ...half(1, 0.4), y: BODY.y + 0.45, h: 0.6, fontSize: 15 });
  K.label(s, "独自の表示設定 agents/openai.yaml（任意）", { x: half(1, 0.4).x, y: BODY.y + 1.2, w: half(1, 0.4).w, h: 0.4 });
  K.codeBox(s, "interface:\n  display_name: \"議事録作成\"\n  short_description: \"会議メモから議事録を作成\"\n  default_prompt: \"$meeting-minutes で…\"", { ...half(1, 0.4), y: BODY.y + 1.65, h: 1.7, fontSize: 14 });
  K.callout(s, "置き場所は検索結果とソース変更履歴で確認（公式ページ本体は**要確認**）", { y: 5.6 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "GitHub Copilot", note: "対応: Copilot cloud agent、code review、CLI、GitHub Copilotアプリ、VS Code と JetBrains のエージェントモード。gh skill は GitHub CLI 2.90.0 以降でパブリックプレビュー。GitHubは、Skillは検証されておらず悪意のある指示やスクリプトを含む可能性があるため、インストール前に必ず gh skill preview で中身を確認するよう警告しています。" });
  K.table(s, [
    ["範囲", "場所"],
    ["リポジトリ", ".github/skills/、.claude/skills/、.agents/skills/"],
    ["個人", "~/.copilot/skills/ または ~/.agents/skills/"],
  ], { ...half(0, 0.4), colW: [1.5, 4.37], fontSize: 14 });
  K.table(s, [
    ["操作（CLI）", "コマンド"],
    ["一覧", "/skills list"],
    ["詳細・置き場所", "/skills info 名前"],
    ["再読み込み", "/skills reload"],
    ["名前を指定", "「/名前 スキルを使って〜」"],
  ], { ...half(1, 0.4), colW: [2.2, 3.67], fontSize: 14 });
  K.callout(s, "他人のSkillは `gh skill preview` で**中身を確認してから** `gh skill install`（GitHubの警告）", { y: 4.6 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "10. テストは2種類", note: "紛らわしい依頼は無関係なものではなく、キーワードは似ているが目的が違うものを選びます。AIが簡単にこなせる短い依頼では description が合っていても使われないことがあるため、中身のある依頼で試します。" });
  K.table(s, [
    ["種類", "例（議事録Skill）", "期待"],
    ["明示的な依頼", "「このメモを議事録にして」", "使われる"],
    ["言い換え", "「さっきの打合せ、決まったことを整理しておいて」", "使われる"],
    ["状況だけ", "文字起こしを貼って「まとめて」", "使われる"],
    ["紛らわしい依頼", "「議事録をうまく書くコツを教えて」", "**使われない**"],
    ["紛らわしい依頼", "「この議事録を英訳して」", "**使われない**（翻訳のみ）"],
  ], { colW: [2.4, 6.6, 3.13], fontSize: 15 });
  K.callout(s, "**発動テスト**＋**出力テスト**。どちらも必ず**新しい会話**で試す", { y: 5.3 });
}

{
  const s = K.contentSlide(pres, { section: P2, title: "改善のサイクル", note: "目の前のテスト例だけに合わせた細かい修正を重ねず、なぜそうなったかを考えて一般的な形で直します。作る係（1つの会話）と試す係（新しい会話）を分けると、つまずきを見つけやすくなります。使うモデルごとに試します。" });
  K.flow(s, [{ title: "試す" }, { title: "結果を見る" }, { title: "原因を考える", highlight: true }, { title: "直す" }, { title: "もう一度試す" }], { h: 1.3, titleSize: 18 });
  K.table(s, [
    ["症状", "直す場所"],
    ["使われない", "description に頼み方の言葉や状況を足す"],
    ["余計な場面で使われる", "description に対象を絞る言葉を足す"],
    ["使われるが出力が違う", "本文の手順・例・判断のルールを直す"],
    ["手順の一部を飛ばす", "その手順の理由を書き足す、チェックリストにする"],
  ], { y: 3.0, colW: [3.6, 8.53], fontSize: 15 });
}

// ---- part 3 -----------------------------------------------------------------

K.sectionSlide(pres, { section: P3, title: "第3部 応用編", items: ["11. 複数の環境で使い回すコツ", "12. スクリプト付きSkill", "13. 安全に使うために", "14. よくある失敗と対処", "15. 作成チェックリスト"] });

{
  const s = K.contentSlide(pres, { section: P3, title: "11. 使い回しの原則: 共通部分だけで書く", note: "特に注意: Claude Code独自の項目をClaude.aiにアップロードするとエラーになります。Codexの表示設定は別ファイル（agents/openai.yaml）なので他環境は無視します。" });
  K.table(s, [
    ["項目", "方針"],
    ["name", "英小文字・数字・ハイフン。「anthropic」「claude」を含めない。フォルダ名と一致"],
    ["description", "200文字以内。XMLタグを含めない"],
    ["その他の項目", "license、compatibility、metadata だけにとどめる"],
    ["環境独自の項目", "必要な環境用のコピーにだけ書く"],
    ["本文", "特定製品の機能名（ツール名など）に依存しない書き方"],
  ], { colW: [2.8, 9.33], fontSize: 15 });
  K.callout(s, "**Claude Code独自の項目をClaude.aiにアップロードするとエラー**になる");
}

{
  const s = K.contentSlide(pres, { section: P3, title: "リポジトリでの置き方", note: "表の「―」は確認した公式資料に記載がないことを示します。シンボリックリンクはWindowsでは作成に権限が必要な場合があり、ツールごとの扱いも異なるため、確実なのはコピー。正本だけを編集し、更新のたびに同期します。" });
  K.table(s, [
    ["置き場所", "Claude Code", "Codex", "Copilot"],
    [".claude/skills/", "読む", "―", "読む"],
    [".agents/skills/", "―", "読む", "読む"],
    [".github/skills/", "―", "―", "読む"],
  ], { ...half(0, 0.5), colW: [2.2, 1.4, 1.1, 1.12], fontSize: 15 });
  K.codeBox(s, "リポジトリ/\n├── .agents/skills/meeting-minutes/\n│     ← 正本（Codex・Copilot）\n└── .claude/skills/meeting-minutes/\n      ← 正本のコピー（Claude Code）", { ...half(1, 0.5), h: 2.4, fontSize: 14 });
  K.callout(s, "確実なのは**コピー**。正本だけを編集して同期。Claude.ai・ChatGPTには同じフォルダをZIPで", { y: 4.6 });
}

{
  const s = K.contentSlide(pres, { section: P3, title: "12. スクリプト付きSkill", note: "スクリプトは中身を読まずに実行できるため、AIの作業メモを消費せず結果だけが返ります。Claude.aiとClaude CodeはPyPIやnpmからパッケージを取得できますが、Claude APIでは実行中に追加インストールできません。allowed-tools で shell や bash を事前許可すると確認なしでコマンドが実行されるため、GitHubは作成元を完全に信頼できる場合を除き事前許可しないよう警告しています。" });
  K.cards(s, [
    { title: "スクリプトが向く", body: ["毎回まったく同じ結果が必要（計算、形式チェック）", "AIが毎回同じプログラムを書き直している", "間違えると困る処理（一括変更など）"] },
    { title: "書き方のポイント", body: ["**実行するのか、読むのか**を明記", "必要なソフト・ライブラリを明記", "エラー処理とわかりやすいメッセージ"] },
    { title: "非プログラマーへ", highlight: true, body: ["AIに書いてもらってよい", "何をするか・何を読み書きするか・ネット接続するかを**説明させる**", "テスト用ファイルで試す。わからない処理は使わない"] },
  ], { cols: 3, ...aboveCallout, bodySize: 16 });
  K.callout(s, "`allowed-tools` で shell / bash を事前許可しない（信頼できる作成元のSkillを除く）");
}

{
  const s = K.contentSlide(pres, { section: P3, title: "13. 安全に使うために", note: "Skillは「AIへの指示」と「実行されるプログラム」の組み合わせ。悪意のあるSkillは隠れた指示でAIに意図しない動作をさせたり（プロンプトインジェクション）、スクリプトでファイルを外部送信・削除したりできます。ChatGPTはアップロードを検査し、Claude.aiのTeam/Enterpriseは組織のセキュリティスキャンや公開前レビューを設定できます。" });
  K.cards(s, [
    { title: "他人のSkillを入れるとき", body: ["SKILL.md と**すべての付属ファイル**を読む", "読めなければAIに危険な処理がないか説明させる", "出所が信頼できるものだけ", "社内ルールに従う"] },
    { title: "自分で作るとき", body: ["**パスワード・APIキーを書かない**", "社外秘を書くなら共有範囲を確認", "外部連携は正式な接続機能（MCP・コネクタ）で"] },
    { title: "更新と版管理", body: ["metadata に版数（version: \"1.1\"）", "変更したらテストをやり直す", "共有先にも新版が届くので影響が大きい変更は事前に知らせる", "リポジトリならGitで履歴管理"] },
  ], { cols: 3, bodySize: 16 });
}

{
  const s = K.contentSlide(pres, { section: P3, title: "14. よくある失敗と対処", note: "全項目はWord版・Markdown版の第14章を参照。Windowsで作ったSkillのパスに \\ を使っていると他の環境で動きません。" });
  K.table(s, [
    ["症状", "よくある原因", "対処"],
    ["一覧に出ない", "ファイル名が SKILL.md でない（skill.md.txt）", "拡張子を表示して直す"],
    ["一覧に出ない", "置き場所の階層・ZIPの構造が違う", "skills/名前/SKILL.md の形に／フォルダ自体を圧縮"],
    ["アップロードでエラー", "name に大文字・日本語・空白／使えない項目", "英小文字・数字・ハイフンに／共通の項目だけに"],
    ["使われない", "description に頼み方の言葉がない", "実際の言い方を足す"],
    ["余計な場面で使われる", "description が広すぎる", "対象を絞る。「〜には使わない」"],
    ["手順を飛ばす", "本文が長すぎる、理由がない", "詳細を references/ へ。理由を書く"],
    ["付属ファイルが読まれない", "リンクがない、階層が深い", "SKILL.md から直接リンク"],
  ], { colW: [2.8, 4.6, 4.73], fontSize: 14 });
}

{
  const s = K.contentSlide(pres, { section: P3, title: "15. 作成チェックリスト", note: "共有前に4つの観点で確認します。全項目はWord版の第15章を参照してください。" });
  K.cards(s, [
    { title: "形式", body: ["ファイル名は SKILL.md", "1行目が ---", "name はフォルダ名と一致", "description 200文字以内"] },
    { title: "内容", body: ["何を＋いつ使うか", "利用者の言葉が入っている", "本文500行以内", "理由と具体例がある"] },
    { title: "テスト", body: ["使われるべき頼み方3つ以上", "紛らわしい頼み方", "成功基準を満たす", "使う全環境・モデルで"] },
    { title: "安全", highlight: true, body: ["秘密情報を含まない", "スクリプトの動作を理解", "共有範囲が適切"] },
  ], { cols: 4, bodySize: 16 });
}

// ---- appendix ---------------------------------------------------------------

pres.addSection({ title: AP });
{
  const s = K.contentSlide(pres, { section: AP, title: "作例: 議事録Skill（meeting-minutes）", note: "5つの環境すべてで使えるよう、フロントマターは name と description だけにしています。動作確認は 2026-10-17、Claude Code 2.1.302 で実施。Claude.ai / ChatGPT / Codex / Copilot での動作は未確認です。" });
  K.table(s, [
    ["工夫", "ねらい"],
    ["頼み方を複数書く", "言い換えにも反応させる"],
    ["状況も書く（文字起こしの貼り付け）", "明示的に頼まれなくても使わせる"],
    ["理由を書く（証拠として読まれるため）", "想定外の場面でも正しく判断させる"],
    ["不明時は「要確認」", "情報の捏造を防ぐ"],
    ["書式を references/ に分ける", "本文を短く保つ"],
    ["共通の項目だけ使う", "どの環境でもそのまま使える"],
  ], { ...half(0, 0.4), colW: [3.4, 2.47], fontSize: 14 });
  K.label(s, "動作確認（Claude Code 2.1.302）", { x: half(1, 0.4).x, y: BODY.y, w: half(1, 0.4).w, h: 0.4 });
  K.cards(s, [
    { title: "「整理しておいて」＋会議メモ", body: "Skillが使われ、書式どおりに出力" },
    { title: "「議事録を書くコツを教えて」", body: "Skillは使われず、通常の回答（期待どおり）" },
    { title: "他の4環境", highlight: true, body: "未確認" },
  ], { ...half(1, 0.4), y: BODY.y + 0.5, h: 4.3, cols: 1, titleSize: 17, bodySize: 16 });
}

{
  const s = K.contentSlide(pres, { section: AP, title: "用語集（抜粋）", note: "全用語はWord版の付録Aを参照。" });
  K.table(s, [
    ["用語", "意味"],
    ["AIエージェント", "道具を使い、目的を達成するまで自分で作業を進めるAI"],
    ["Skill / SKILL.md", "AIに渡す業務マニュアル／その本体ファイル"],
    ["フロントマター / YAML", "ファイル先頭の --- で囲んだ表紙情報／「項目名: 値」の書き方"],
    ["Markdown", "# や - の記号で見出しや箇条書きを表す書き方（.md）"],
  ], { ...half(0, 0.4), colW: [2.2, 3.67], fontSize: 14 });
  K.table(s, [
    ["用語", "意味"],
    ["リポジトリ", "変更履歴ごと管理する保管場所（GitHubなど）"],
    ["コンテキスト / トークン", "AIが一度に扱える情報／それを数える単位"],
    ["MCP / コネクタ", "AIを外部サービスとつなぐ仕組み"],
    ["プロンプトインジェクション", "紛れ込ませた指示でAIに意図しない動作をさせる攻撃"],
  ], { ...half(1, 0.4), colW: [2.4, 3.47], fontSize: 14 });
}

{
  const s = K.contentSlide(pres, { section: AP, title: "出典と確認しきれなかった点", note: "確認日はすべて2026-10-17。OpenAIとGitHubの公式サイトはこの作成環境から直接閲覧できず、GitHubの原稿・OpenAIのGitHub資料・検索結果で確認しました。" });
  K.table(s, [
    ["資料（発行元）", "確認方法"],
    ["Agent Skills 仕様（Agent Skills プロジェクト）", "GitHub上の原稿を閲覧"],
    ["Use skills in Claude／How to create custom skills（Anthropic）", "直接閲覧"],
    ["Skill authoring best practices／Claude Code Skills（Anthropic）", "直接閲覧"],
    ["Agent Skills – Codex（OpenAI）", "検索結果とOpenAIのGitHub資料"],
    ["Skills in ChatGPT（OpenAI）", "検索結果の抜粋のみ"],
    ["About / Adding agent skills（GitHub）", "GitHub上の原稿を閲覧"],
  ], { ...half(0, 0.4), colW: [3.9, 1.97], fontSize: 14 });
  K.cards(s, [
    { title: "要確認", highlight: true, body: ["ChatGPT Skillsの対象プラン（Plus/Pro）と画面のメニュー名", "ChatGPTにアップロードできるファイル形式", "Codex公式ページ本体の記述", "Claude.aiの description 上限（200字と1,024字で資料が異なる）"] },
  ], { ...half(1, 0.4), cols: 1, bodySize: 16 });
}

{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: AP });
  s.addText("まずは1つ作ってみる", { placeholder: "title" });
  s.addText([
    { text: "1. 同じ説明を3回以上した作業を1つ選ぶ", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "2. Claude.ai か ChatGPT で「Skillを作って」と頼む", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "3. 新しい会話で試し、description を直す", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "詳しくは Word版・docs/skill-guide.md を参照", options: {} },
  ], { placeholder: "body" });
  s.addNotes("最初の一歩は小さく。うまくいったら第2部・第3部で他の環境への展開や安全面を確認してください。");
}

K.save(pres, OUT).then((f) => console.log(`wrote ${path.relative(process.cwd(), f)}`));
