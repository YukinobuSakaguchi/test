// Shared look for the Word and PowerPoint builds.
// Change colors or fonts here and rebuild; both outputs follow.

module.exports = {
  colors: {
    primary: "0F4C5C",   // deep teal: headings, title backgrounds
    primaryLight: "E6F0F2", // table header / card tint
    accent: "E36414",    // orange: emphasis, "要確認"
    text: "1F2933",
    muted: "5F6B76",
    border: "B8C7CC",
    codeBg: "F3F5F6",
    white: "FFFFFF",
  },
  fonts: {
    // Japanese text uses the East Asian font; Latin text uses the Latin font.
    // Both ship with Windows 10/11 + Microsoft Office.
    latin: "Calibri",
    eastAsia: "Yu Gothic",
    slide: "Meiryo",       // PowerPoint Latin text: Meiryo stays legible when projected
    slideJa: "メイリオ",    // PowerPoint Japanese text (theme East Asian font)
    code: "Consolas",
  },
  meta: {
    title: "Skill作成ガイド",
    subtitle: "AIに「仕事の手順書」を渡す方法",
    targets: "Claude.ai / ChatGPT / Claude Code / OpenAI Codex / GitHub Copilot",
    checkedOn: "2026-10-17",
    repoUrl: "https://github.com/YukinobuSakaguchi/test",
    branch: "ccr-db202962-81lgf8",
  },
};
