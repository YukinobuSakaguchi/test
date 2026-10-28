#!/usr/bin/env python3
"""deck-source.html の画像参照を埋め込み、単一ファイルのHTMLスライドを作る。

使い方:  python build.py
- deck-source.html 内の  src="illust/NAME.svg"  を探す。
- 同じ名前の  illust/NAME.png（または .webp / .jpg）があれば、そちらを優先して埋め込む。
  → Codex等で生成した画像を、同じ名前で illust/ に置いて再実行すれば差し替えられる。
- 出力: 2026-10-28_個人のセキュリティ対策.html（そのままブラウザで再生できる）
"""
import base64
import mimetypes
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "deck-source.html"
OUTPUT = HERE / "2026-10-28_個人のセキュリティ対策.html"
PREFERRED = (".png", ".webp", ".jpg", ".jpeg", ".svg")  # 左ほど優先

mimetypes.add_type("image/svg+xml", ".svg")


def pick(name: str) -> Path | None:
    for ext in PREFERRED:
        p = HERE / "illust" / f"{name}{ext}"
        if p.exists():
            return p
    return None


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def main() -> int:
    html = SOURCE.read_text(encoding="utf-8")
    missing: list[str] = []
    used: dict[str, str] = {}

    def repl(m: re.Match) -> str:
        name = m.group(1)
        p = pick(name)
        if p is None:
            missing.append(name)
            return m.group(0)
        used[name] = p.suffix
        return f'src="{data_uri(p)}"'

    out = re.sub(r'src="illust/([A-Za-z0-9_\-]+)\.[A-Za-z]+"', repl, html)
    if missing:
        print("画像が見つかりません:", ", ".join(sorted(set(missing))), file=sys.stderr)
        return 1
    OUTPUT.write_text(out, encoding="utf-8")
    for name in sorted(used):
        print(f"  {name}{used[name]}")
    print(f"出力: {OUTPUT.name}（{OUTPUT.stat().st_size // 1024} KB）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
