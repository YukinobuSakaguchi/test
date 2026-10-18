// Builds dist/skill-guide-proposal.pptx: a short deck for proposing Skill adoption internally.
// It summarizes the finalized detail deck (slides-detail.js); keep the two consistent.
// No effect figures are stated: the deck proposes measuring them in a trial.

const path = require("path");
const K = require("./slide-kit");
const theme = require("./theme");

const OUT = path.join(__dirname, "..", "dist", "skill-guide-proposal.pptx");
const { BODY } = K;
const pres = K.newDeck("Skill導入の提案", "Skill導入の提案（たたき台）");
const S1 = "提案";
const S2 = "進め方";

const half = (side, gap = 0.4) => ({ x: side === 0 ? BODY.x : BODY.x + (BODY.w + gap) / 2, w: (BODY.w - gap) / 2 });

pres.addSection({ title: S1 });
K.titleSlide(pres, {
  title: "AIの「業務マニュアル」Skill 導入の提案",
  subtitle: `小さく試して、効果を測ってから広げる\n対象ツール: ${theme.meta.targets}\n情報の確認日: ${theme.meta.checkedOn}（たたき台）`,
  note: "このデッキは社内展開・提案用のたたき台です。詳細は詳細版デッキとWord版の解説書を参照してください。効果の数値はまだ測っていないため、試行で測ることを提案します。",
});

{
  const s = K.contentSlide(pres, { section: S1, title: "提案の要点", note: "結論から伝えます。いきなり全社展開せず、少数の業務で試し、測ってから広げる提案です。" });
  K.cards(s, [
    { badge: 1, title: "何を", body: "AIに業務手順を覚えさせる「Skill」を、繰り返しの多い業務から作る" },
    { badge: 2, title: "どう進める", body: "2〜3業務で試作 → 試行で効果を測る → 結果を見て展開を判断" },
    { badge: 3, title: "お願いしたいこと", highlight: true, body: "試行対象の業務選定、利用ツールの社内確認、試行の承認" },
  ], { cols: 3, h: 4.2, bodySize: 18 });
  K.callout(s, "効果の数値は**未測定**。試行で測ってから判断する");
}

{
  const s = K.contentSlide(pres, { section: S1, title: "いまの困りごと", note: "AIを使っている現場でよく起きることを整理しました。現時点で社内の数値は測っていません。試行の際にこれらを測定項目にします。" });
  K.cards(s, [
    { title: "毎回同じ説明をしている", body: "書式やルールを依頼のたびにAIへ説明し直している" },
    { title: "出来がばらつく", body: "説明の漏れや人による頼み方の違いで、成果物の品質がそろわない" },
    { title: "ノウハウが個人に閉じる", body: "うまい頼み方が個人のメモに埋もれ、チームで共有されない" },
  ], { cols: 3, h: 4.2, bodySize: 18 });
  K.callout(s, "原因は「**AIは職場のやり方を知らない**」こと");
}

{
  const s = K.contentSlide(pres, { section: S1, title: "Skillとは: AIに渡す業務マニュアル", note: "Skillは SKILL.md という1枚のテキストファイルです。AIは普段は名前と「いつ使うか」だけを覚えていて、合う依頼が来たときだけ中身を読みます。そのため数が増えても動きが重くなりにくい仕組みです。" });
  K.cards(s, [
    { title: "Skillがないとき", body: ["頼むたびに毎回説明する", "説明が漏れると出来がばらつく"] },
    { title: "Skillがあるとき", highlight: true, body: ["「議事録にして」と言うだけ", "AIが自分からマニュアルを開き、同じ手順・書式で仕上げる"] },
  ], { cols: 2, h: 3.0, bodySize: 18 });
  K.stack(s, [
    { title: "普段", body: "Skillの**名前と「いつ使うか」だけ**を覚えている" },
    { title: "合う依頼が来たら", body: "そのSkillの中身を読んで、手順どおりに作業する" },
  ], { y: 4.75, h: 1.9 });
}

{
  const s = K.contentSlide(pres, { section: S1, title: "Skillにしやすい業務の例", note: "繰り返しが多く、手順やルールが決まっている業務が向いています。一度きりの作業や、毎回やり方が違う作業は向きません。" });
  K.table(s, [
    ["業務", "Skillにしておくこと"],
    ["議事録の作成", "決まった見出し、宿題（担当・期限）の書き方、確認の手順"],
    ["報告書のチェック", "確認項目の一覧、よくあるミス、指摘の書き方"],
    ["定型メール", "社内の言い回し、署名、宛先ごとの敬語の使い分け"],
    ["資料作成", "会社のフォント・色・ロゴの使い方"],
    ["データ集計", "列の意味、除外すべきデータ、計算方法"],
  ], { colW: [3.2, 8.93], fontSize: 18 });
  K.callout(s, "目安: **同じ説明をAIに3回以上したことがある業務**から始める");
}

{
  const s = K.contentSlide(pres, { section: S1, title: "主要なAIツールが同じ形式に対応", note: "2026年10月時点で、5つのツールが共通形式 Agent Skills に対応しています。一度作ったSkillを少しの手直しで別のツールでも使えるため、特定のツールに縛られにくいのが利点です。ChatGPTの対象プランなど一部は要確認です。" });
  K.cards(s, [
    { title: "Claude.ai", body: "画面からアップロード" },
    { title: "ChatGPT", body: "画面から作成（対象プランは**要確認**）" },
    { title: "Claude Code", body: "フォルダに置く" },
    { title: "OpenAI Codex", body: "フォルダに置く" },
    { title: "GitHub Copilot", body: "フォルダに置く" },
  ], { cols: 5, h: 2.6, bodySize: 17, titleSize: 18 });
  K.callout(s, "共通形式「**Agent Skills**」: 一度作れば別のツールでも使える ＝ **特定ツールに縛られにくい**", { y: 4.6 });
}

pres.addSection({ title: S2 });
{
  const s = K.contentSlide(pres, { section: S2, title: "進め方: 小さく試してから広げる", note: "期間は試行対象が決まってから設定します。Skillの試作はAIに手伝わせられるため（skill-creator）、作成自体の負担は小さく始められます。" });
  K.flow(s, [
    { title: "対象業務を選ぶ", body: "繰り返しが多い業務を2〜3件" },
    { title: "Skillを試作", body: "AIに手伝わせて作る（skill-creator）" },
    { title: "試行して測る", body: "Skillあり／なしで同じ業務を比べる", highlight: true },
    { title: "展開を判断", body: "結果を見て、共有ルールを決めて広げる" },
  ], { h: 4.2 });
  K.callout(s, "期間と体制は、対象業務が決まってから設定する");
}

{
  const s = K.contentSlide(pres, { section: S2, title: "試行で測る項目（案）", note: "現時点で効果の数値はありません。試行ではSkillあり／なしで同じ業務を行い、下の項目を比べることを提案します。項目は対象業務に合わせて調整してください。" });
  K.table(s, [
    ["項目", "測り方（案）"],
    ["依頼にかかる手間", "AIへの指示を書く時間、やり取りの回数"],
    ["手戻り", "AIの出力を人が直した回数・箇所"],
    ["品質のそろい方", "書式不備・記載漏れの件数"],
    ["使い勝手", "利用者アンケート（使われたか、使いやすいか）"],
  ], { colW: [3.6, 8.53], fontSize: 18 });
  K.callout(s, "効果の数値は**まだない**。試行の結果で展開を判断する");
}

{
  const s = K.contentSlide(pres, { section: S2, title: "リスクと対策", note: "詳細は詳細版デッキの第13章（安全に使うために）を参照。社内の情報セキュリティ規程との整合は担当部署に確認が必要です。" });
  K.table(s, [
    ["リスク", "対策"],
    ["社外秘の情報が漏れる", "Skillにパスワード・APIキー・社外秘を書かない。共有範囲を確認。利用ツールを社内で確認"],
    ["他人が作ったSkillが危険", "中身（指示とスクリプト）を確認してから使う。出所が信頼できるものだけ"],
    ["ツールの仕様が変わる", "共通形式で書き、ツール独自の設定は最小限に。定期的に公式情報を確認"],
    ["使われない・誤って使われる", "試行で「使われるべき依頼／使われるべきでない依頼」を確かめて直す"],
  ], { colW: [3.6, 8.53], fontSize: 16 });
}

{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: S2 });
  s.addText("お願いしたいこと", { placeholder: "title" });
  s.addText([
    { text: "1. 試行対象の業務を2〜3件選ぶ", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "2. 利用するAIツールと情報の扱いを社内で確認する", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "3. 試行の実施を承認いただく", options: { breakLine: true, paraSpaceAfter: 8 } },
    { text: "参考資料: Skill作成ガイド（Word版）・詳細版デッキ", options: {} },
  ], { placeholder: "body" });
  s.addNotes("最後に判断いただきたい事項を3つに絞って示します。ツールの選定と情報管理の判断は、情報セキュリティ担当など社内の所管部署と相談してください。");
}

K.save(pres, OUT).then((f) => console.log(`wrote ${path.relative(process.cwd(), f)}`));
